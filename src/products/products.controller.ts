import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { QueryProductsDto } from './dto/query-products.dto.js';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('products')
  findMany(@Query() query: QueryProductsDto) {
    return this.productsService.findMany(query);
  }

  @Get('products/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get('categories')
  listCategories() {
    return this.productsService.listCategories();
  }
}
