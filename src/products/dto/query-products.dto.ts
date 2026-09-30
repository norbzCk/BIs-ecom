import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const PRODUCT_SORT_VALUES = [
  'recommended',
  'price_asc',
  'price_desc',
  'newest',
  'rating',
] as const;

export type ProductSort = (typeof PRODUCT_SORT_VALUES)[number];

/**
 * Query params arrive as strings, and `Boolean("false")` is `true`, so a naive
 * @Type(() => Boolean) would turn ?featured=false into a filter for featured
 * products. Only "true"/"false" are recognised; anything else is passed through
 * untouched so @IsBoolean() rejects it instead of silently meaning `false`.
 */
const toBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class QueryProductsDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  maxPrice?: number;

  /** Only products an admin pinned to the storefront landing page. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  featured?: boolean;

  /** Only products with a `compareAtPrice` above their price. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  onSale?: boolean;

  @IsOptional()
  @IsIn(PRODUCT_SORT_VALUES)
  sort?: ProductSort;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 12;
}
