import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../admin/decorators/roles.decorator.js';
import { RolesGuard } from '../admin/guards/roles.guard.js';
import {
  MAX_IMAGE_BYTES,
  SupabaseStorageService,
  type StoredImage,
} from './supabase-storage.service.js';

/** The editor allows a gallery, so accept a batch rather than one file at a time. */
const MAX_FILES_PER_REQUEST = 10;

@Controller('admin/uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUploadsController {
  constructor(private readonly storage: SupabaseStorageService) {}

  /**
   * Accepts the images an admin picked from their machine and returns the URLs
   * to save on the product. The upload happens here rather than straight from
   * the browser so the service-role key never has to reach the client.
   */
  @Post('images')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_PER_REQUEST, {
      limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_FILES_PER_REQUEST },
    }),
  )
  async uploadImages(
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<{ images: StoredImage[] }> {
    if (!files?.length) {
      throw new BadRequestException('Attach at least one file as "files"');
    }

    // Sequential on purpose: a burst of parallel uploads to Storage is the
    // easiest way to hit a rate limit, and an admin never uploads enough files
    // for the extra round trips to be felt.
    const images: StoredImage[] = [];
    for (const file of files) {
      images.push(await this.storage.uploadImage(file));
    }

    return { images };
  }

  /**
   * Removes uploads that are no longer referenced. Used by the editor when a
   * just-uploaded image is dropped before the product is saved.
   */
  @Delete('images')
  async removeImages(@Body() body: { urls: string[] }): Promise<{ removed: number }> {
    if (!Array.isArray(body?.urls)) {
      throw new BadRequestException('Body must be { urls: string[] }');
    }

    const paths = body.urls
      .map((url) => this.storage.toBucketPath(url))
      .filter((path): path is string => path !== null);

    await this.storage.removeImages(paths);

    return { removed: paths.length };
  }
}
