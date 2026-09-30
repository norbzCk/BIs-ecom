import { BadRequestException } from '@nestjs/common';
import { SupabaseStorageService, MAX_IMAGE_BYTES } from './supabase-storage.service.js';

const SUPABASE_URL = 'https://project.supabase.co';

/** Minimal stand-in for the handful of supabase-js calls the service makes. */
const client = {
  upload: vi.fn().mockResolvedValue({ data: { path: 'x' }, error: null }),
  remove: vi.fn().mockResolvedValue({ data: [], error: null }),
  list: vi.fn().mockResolvedValue({ data: [], error: null }),
  listBuckets: vi
    .fn()
    .mockResolvedValue({ data: [{ name: 'product-images' }], error: null }),
  getPublicUrl: vi.fn((path: string) => ({
    data: {
      publicUrl: `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`,
    },
  })),
  createBucket: vi.fn().mockResolvedValue({ error: null }),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: () => client,
      createBucket: client.createBucket,
      listBuckets: client.listBuckets,
    },
  }),
}));

function makeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'files',
    originalname: 'photo.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('fake-jpeg-bytes'),
    stream: undefined as never,
    destination: '',
    path: '',
    ...overrides,
  } as Express.Multer.File;
}

function withClient<T>(fn: () => T) {
  const previous = process.env.SUPABASE_URL;
  process.env.SUPABASE_URL = SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  try {
    return fn();
  } finally {
    process.env.SUPABASE_URL = previous;
  }
}

describe('SupabaseStorageService', () => {
  describe('toBucketPath', () => {
    it('recovers the path from a public URL', () => {
      process.env.SUPABASE_URL = SUPABASE_URL;
      const service = new SupabaseStorageService();

      expect(
        service.toBucketPath(
          `${SUPABASE_URL}/storage/v1/object/public/product-images/ab/abc.jpg`,
        ),
      ).toBe('ab/abc.jpg');
    });

    it('returns null for a URL that is not in our bucket', () => {
      process.env.SUPABASE_URL = SUPABASE_URL;
      const service = new SupabaseStorageService();

      expect(service.toBucketPath('https://images.example.com/a.jpg')).toBeNull();
    });

    it('refuses a path that tries to escape the bucket', () => {
      process.env.SUPABASE_URL = SUPABASE_URL;
      const service = new SupabaseStorageService();

      expect(
        service.toBucketPath(
          `${SUPABASE_URL}/storage/v1/object/public/product-images/../../secrets`,
        ),
      ).toBeNull();
    });
  });

  describe('uploadImage', () => {
    beforeEach(() => {
      // Each test starts from "the bucket already exists".
      client.list.mockReset().mockResolvedValue({ data: [], error: null });
      client.listBuckets
        .mockReset()
        .mockResolvedValue({ data: [{ name: 'product-images' }], error: null });
      client.createBucket.mockReset().mockResolvedValue({ error: null });
      client.upload.mockClear();
      client.remove.mockClear();
    });

    it('uploads to a sharded path and returns the public URL', async () => {
      await withClient(async () => {
        const service = new SupabaseStorageService();
        await service.onModuleInit();

        const stored = await service.uploadImage(makeFile());

        expect(stored.path).toMatch(/^[0-9a-f]{2}\/[0-9a-f-]{36}\.jpg$/);
        expect(stored.url).toBe(
          `${SUPABASE_URL}/storage/v1/object/public/product-images/${stored.path}`,
        );
        expect(client.upload).toHaveBeenCalledWith(
          stored.path,
          expect.any(Buffer),
          { contentType: 'image/jpeg', upsert: false },
        );
      });
    });

    it('picks the extension from the mime type, not the filename', async () => {
      await withClient(async () => {
        const service = new SupabaseStorageService();
        await service.onModuleInit();

        const stored = await service.uploadImage(
          makeFile({ originalname: 'photo.jpeg', mimetype: 'image/webp' }),
        );

        expect(stored.path).toMatch(/\.webp$/);
      });
    });

    it('rejects a file type that is not an image', async () => {
      await withClient(async () => {
        const service = new SupabaseStorageService();
        await service.onModuleInit();

        await expect(
          service.uploadImage(makeFile({ mimetype: 'application/pdf' })),
        ).rejects.toBeInstanceOf(BadRequestException);
      });
    });

    it('rejects a file over the size limit', async () => {
      await withClient(async () => {
        const service = new SupabaseStorageService();
        await service.onModuleInit();

        await expect(
          service.uploadImage(makeFile({ size: MAX_IMAGE_BYTES + 1 })),
        ).rejects.toBeInstanceOf(BadRequestException);
      });
    });

    it('creates the bucket on first use when it does not exist yet', async () => {
      await withClient(async () => {
        client.listBuckets.mockResolvedValue({ data: [], error: null });

        const service = new SupabaseStorageService();
        await service.onModuleInit();

        expect(client.createBucket).toHaveBeenCalledWith(
          'product-images',
          expect.objectContaining({ public: true, fileSizeLimit: MAX_IMAGE_BYTES }),
        );
      });
    });

    // Regression: listing objects in a bucket that does not exist answers
    // `{ data: [], error: null }`, so probing with list() made the service
    // believe the bucket was there and every upload failed with "Bucket not
    // found". Only listBuckets() actually tells you what buckets exist.
    it('does not treat an empty object listing as proof the bucket exists', async () => {
      await withClient(async () => {
        client.list.mockResolvedValue({ data: [], error: null });
        client.listBuckets.mockResolvedValue({ data: [], error: null });

        const service = new SupabaseStorageService();
        await service.onModuleInit();

        expect(client.createBucket).toHaveBeenCalledWith(
          'product-images',
          expect.anything(),
        );
      });
    });

    it('treats losing the creation race as success', async () => {
      await withClient(async () => {
        client.listBuckets.mockResolvedValue({ data: [], error: null });
        client.createBucket.mockResolvedValue({
          error: { message: 'Bucket already exists' },
        });

        const service = new SupabaseStorageService();

        // Must not throw: the bucket we wanted now exists either way.
        await expect(service.onModuleInit()).resolves.toBeUndefined();
        await expect(service.uploadImage(makeFile())).resolves.toMatchObject({
          url: expect.stringContaining('/product-images/'),
        });
      });
    });

    it('still attempts creation when buckets cannot be listed', async () => {
      await withClient(async () => {
        client.listBuckets.mockResolvedValue({
          data: null,
          error: { message: 'permission denied' },
        });

        const service = new SupabaseStorageService();
        await service.onModuleInit();

        expect(client.createBucket).toHaveBeenCalledWith(
          'product-images',
          expect.anything(),
        );
      });
    });

    it('does not recreate a bucket that already exists', async () => {
      await withClient(async () => {
        const service = new SupabaseStorageService();
        await service.onModuleInit();

        expect(client.createBucket).not.toHaveBeenCalled();
      });
    });
  });

  describe('removeImages', () => {
    it('does nothing for an empty list', async () => {
      await withClient(async () => {
        const service = new SupabaseStorageService();

        await service.removeImages([]);

        expect(client.remove).not.toHaveBeenCalled();
      });
    });

    it('removes the given paths', async () => {
      await withClient(async () => {
        const service = new SupabaseStorageService();

        await service.removeImages(['ab/one.jpg', 'ab/two.jpg']);

        expect(client.remove).toHaveBeenCalledWith(['ab/one.jpg', 'ab/two.jpg']);
      });
    });

    it('skips paths that try to escape the bucket', async () => {
      await withClient(async () => {
        const service = new SupabaseStorageService();

        await service.removeImages(['ab/one.jpg', '../secrets', '/etc/passwd']);

        expect(client.remove).toHaveBeenCalledWith(['ab/one.jpg']);
      });
    });
  });
});
