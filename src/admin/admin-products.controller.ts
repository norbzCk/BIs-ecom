import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminProductsService } from './admin-products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { AdminQueryProductsDto } from './dto/admin-query-products.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { Roles } from './decorators/roles.decorator.js';

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminProductsController {
  constructor(private readonly adminProductsService: AdminProductsService) {}

  @Get()
  findMany(@Query() query: AdminQueryProductsDto) {
    return this.adminProductsService.findMany(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminProductsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.adminProductsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.adminProductsService.update(id, dto);
  }

  /** Soft delete — sets status to DISCONTINUED. See AdminProductsService.archive for why. */
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.adminProductsService.archive(id);
  }
}
