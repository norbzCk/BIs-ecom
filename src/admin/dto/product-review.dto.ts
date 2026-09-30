import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class ProductReviewDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  author!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  role?: string;

  @IsInt()
  @Type(() => Number)
  @Min(1, { message: 'A review must be rated between 1 and 5' })
  @Max(5, { message: 'A review must be rated between 1 and 5' })
  rating!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  quote!: string;
}
