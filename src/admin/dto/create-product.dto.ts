import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsIn,
  IsObject,
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

  // @ValidateNested() silently skips a missing (undefined) property, so without
  // @IsDefined()/@IsObject() a request that omits `inventory` would pass
  // validation and then crash in the service reading `inventory.quantity`.
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => ProductInventoryDto)
  inventory!: ProductInventoryDto;
}
