import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProductImageDto } from './product-image.dto.js';
import { ProductSpecificationDto } from './product-specification.dto.js';
import { ProductReviewDto } from './product-review.dto.js';
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

  /**
   * Struck-through price. Must be above `price` for the product to count as a
   * deal. `null` clears the stored value.
   */
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  compareAtPrice?: number | null;

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

  @IsOptional()
  @IsString()
  @MaxLength(60)
  badge?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(5)
  rating?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reviewCount?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsDateString()
  releasedAt?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  highlights?: string[];

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

  /** When provided, fully replaces the product's existing reviews. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductReviewDto)
  reviews?: ProductReviewDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductInventoryDto)
  inventory?: ProductInventoryDto;
}
