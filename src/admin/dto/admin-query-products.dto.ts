import { IsIn, IsOptional } from 'class-validator';
import { QueryProductsDto } from '../../products/dto/query-products.dto.js';
import {
  PRODUCT_STATUS_VALUES,
  type ProductStatusValue,
} from './create-product.dto.js';

export class AdminQueryProductsDto extends QueryProductsDto {
  @IsOptional()
  @IsIn(PRODUCT_STATUS_VALUES)
  status?: ProductStatusValue;
}
