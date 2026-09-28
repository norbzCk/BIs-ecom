import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProductImageDto } from './product-image.dto.js';
import { ProductSpecificationDto } from './product-specification.dto.js';
import { ProductInventoryDto } from './product-inventory.dto.js';
import {
  PRODUCT_STATUS_VALUES,
  type ProductStatusValue,
} from './create-product.dto.js';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  sku?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsIn(PRODUCT_STATUS_VALUES)
  status?: ProductStatusValue;

  /** When provided, fully replaces the product's existing images. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one product image is required' })
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  /** When provided, fully replaces the product's existing specifications. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecificationDto)
  specifications?: ProductSpecificationDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductInventoryDto)
  inventory?: ProductInventoryDto;
}
