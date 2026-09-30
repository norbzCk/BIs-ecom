import { Module } from '@nestjs/common';
import { AdminProductsController } from './admin-products.controller.js';
import { AdminProductsService } from './admin-products.service.js';
import { AdminCategoriesController } from './admin-categories.controller.js';
import { AdminCategoriesService } from './admin-categories.service.js';
import { RolesGuard } from './guards/roles.guard.js';
import { AuthModule } from '../auth/auth.module.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [AdminProductsController, AdminCategoriesController],
  providers: [AdminProductsService, AdminCategoriesService, RolesGuard],
})
export class AdminModule {}
