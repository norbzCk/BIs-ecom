import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

/** Public bucket the storefront reads product images from without a session. */
export const PRODUCT_IMAGE_BUCKET = 'product-images';

/** Matches the `file_size_limit` recorded on the bucket. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);

export interface StoredImage {
  /** Absolute URL to store on `ProductImage.imageUrl`. */
  url: string;
  /** Bucket-relative path, needed to delete the file again. */
  path: string;
}

/**
 * Product image storage on Supabase Storage.
 *
 * Writes use the service-role key, so authorisation belongs to the API: only
 * `@Roles('ADMIN')` routes reach this service. The key must never be exposed to
 * apps/web — the browser only ever receives the public URLs returned here.
 */
@Injectable()
export class SupabaseStorageService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly url?: string;
  private readonly serviceRoleKey?: string;
  private client?: SupabaseClient;
  private bucketReady?: Promise<void>;

  constructor() {
    this.url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    this.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (this.url && this.serviceRoleKey) {
      this.client = createClient(this.url, this.serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } else if (!this.serviceRoleKey) {
      this.logger.warn(
        'SUPABASE_SERVICE_ROLE_KEY is not set — image uploads are disabled. ' +
          'Set it in .env to enable the admin image picker.',
      );
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.client) return;
    // Best effort: a missing bucket is the single most common first-run
    // problem, and creating it here means no manual dashboard step. Never let a
    // failure here stop the app from serving the rest of the catalog.
    try {
      await this.ensureBucket();
    } catch (error) {
      this.logger.error(
        `Could not ensure the "${PRODUCT_IMAGE_BUCKET}" bucket exists`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async uploadImage(file: Express.Multer.File): Promise<StoredImage> {
    const client = this.requireClient();
    await this.ensureBucket();

    this.assertAllowed(file);

    const path = this.buildPath(file);

    const { error } = await client.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      this.logger.error(`Upload to ${path} failed: ${error.message}`);
      throw new ServiceUnavailableException(
        'Image upload failed. Please try again.',
      );
    }

    const { data } = client.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);

    return { url: data.publicUrl, path };
  }

  /**
   * Deletes files by their bucket path. Missing files are not an error: an
   * admin who replaces a product's images should never hit a failure because a
   * previous cleanup already removed one of them.
   */
  async removeImages(paths: string[]): Promise<void> {
    const client = this.requireClient();
    if (paths.length === 0) return;

    const inBucket = paths.filter((path) => !this.isTraversal(path));

    if (inBucket.length !== paths.length) {
      this.logger.warn('Refused to remove image paths outside the bucket');
    }

    if (inBucket.length === 0) return;

    const { error } = await client.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .remove(inBucket);

    if (error) {
      // A stale row in the database should never block a product update.
      this.logger.warn(`Removing orphaned images failed: ${error.message}`);
    }
  }

  /**
   * Recovers the bucket path from a stored public URL so callers only have to
   * hand back the URL they were given. Returns null for anything that is not a
   * URL in our own bucket, which is then left alone.
   */
  toBucketPath(publicUrl: string): string | null {
    if (!this.url) return null;

    const prefix = `${this.url.replace(/\/+$/, '')}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;

    if (!publicUrl.startsWith(prefix)) return null;

    const path = publicUrl.slice(prefix.length);
    return path.length > 0 && !this.isTraversal(path) ? path : null;
  }

  private assertAllowed(file: Express.Multer.File): void {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported image type "${file.mimetype}". Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}`,
      );
    }

    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException(
        `Image is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_IMAGE_BYTES / 1024 / 1024} MB`,
      );
    }
  }

  /**
   * Shards by the first two hex characters of a UUID so a bucket with many
   * products does not end up with tens of thousands of siblings in one folder,
   * which is what makes the Storage dashboard and CDN cache awkward.
   */
  private buildPath(file: Express.Multer.File): string {
    const id = randomUUID();
    const extension = this.extensionFor(file);
    return `${id.slice(0, 2)}/${id}${extension}`;
  }

  private extensionFor(file: Express.Multer.File): string {
    const byMime: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/avif': '.avif',
      'image/gif': '.gif',
    };

    return byMime[file.mimetype] ?? extname(file.originalname).toLowerCase();
  }

  /** Rejects `..` segments and absolute paths before they reach the bucket API. */
  private isTraversal(path: string): boolean {
    return path.startsWith('/') || path.split('/').includes('..');
  }

  private ensureBucket(): Promise<void> {
    this.bucketReady ??= this.createBucketIfMissing();
    return this.bucketReady;
  }

  private async createBucketIfMissing(): Promise<void> {
    const client = this.client!;

    // Only listBuckets() is a reliable existence probe. Listing objects inside a
    // bucket that does not exist comes back as `{ data: [], error: null }` in
    // current supabase-js, so an object-listing probe would wrongly conclude the
    // bucket is there and every upload would then fail with "Bucket not found".
    const { data: buckets, error: listError } = await client.storage.listBuckets();

    if (listError) {
      // A project that forbids listing buckets is not necessarily a project
      // without this bucket, so fall through to the create attempt and let the
      // "already exists" answer settle it.
      this.logger.warn(
        `Could not list storage buckets: ${listError.message}. Trying to create "${PRODUCT_IMAGE_BUCKET}" anyway.`,
      );
    } else if (buckets.some((bucket) => bucket.name === PRODUCT_IMAGE_BUCKET)) {
      return;
    }

    const { error: createError } = await client.storage.createBucket(
      PRODUCT_IMAGE_BUCKET,
      {
        public: true,
        fileSizeLimit: MAX_IMAGE_BYTES,
        allowedMimeTypes: [...ALLOWED_MIME_TYPES],
      },
    );

    if (createError) {
      // Losing the race with another instance booting is fine: the bucket this
      // call was trying to make is the bucket we need.
      if (!/already exists/i.test(createError.message)) {
        this.bucketReady = undefined;
        throw new Error(createError.message);
      }
      return;
    }

    this.logger.log(`Created the public "${PRODUCT_IMAGE_BUCKET}" bucket`);
  }

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Image storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      );
    }
    return this.client;
  }
}
