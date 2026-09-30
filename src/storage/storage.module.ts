import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RolesGuard } from '../admin/guards/roles.guard.js';
import { AdminUploadsController } from './admin-uploads.controller.js';
import { SupabaseStorageService } from './supabase-storage.service.js';

/**
 * Supabase Storage for product images. Exported so the admin products service
 * can delete the files behind an image when a product is edited or
 * discontinued.
 */
@Module({
  imports: [AuthModule],
  controllers: [AdminUploadsController],
  providers: [SupabaseStorageService, RolesGuard],
  exports: [SupabaseStorageService],
})
export class StorageModule {}
