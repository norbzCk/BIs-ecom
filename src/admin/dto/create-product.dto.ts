import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsDefined,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
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

/** Mirrors the ProductStatus enum in prisma/schema.prisma — see CreateOrderDto for why this is defined locally rather than imported from the generated client. */
export const PRODUCT_STATUS_VALUES = [
  'ACTIVE',
  'OUT_OF_STOCK',
  'DISCONTINUED',
] as const;
export type ProductStatusValue = (typeof PRODUCT_STATUS_VALUES)[number];

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  /** If omitted, the service derives a unique slug from `name`. */
  @IsOptional()
  @IsString()
  @MaxLength(220)
  slug?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  sku!: string;

  @IsString()
  categoryId!: string;

  @IsPositive()
  @Type(() => Number)
  price!: number;

  /**
   * Struck-through price. Must be above `price` for the product to count as a
   * deal. `null` is accepted so an editor can clear a stale value.
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

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one product image is required' })
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images!: ProductImageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecificationDto)
  specifications?: ProductSpecificationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductReviewDto)
  reviews?: ProductReviewDto[];

  // @ValidateNested() silently skips a missing (undefined) property, so without
  // @IsDefined()/@IsObject() a request that omits `inventory` would pass
  // validation and then crash in the service reading `inventory.quantity`.
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => ProductInventoryDto)
  inventory!: ProductInventoryDto;
}
