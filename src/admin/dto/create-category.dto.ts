import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateCategoryDto {
  // Trimmed before validation, so a whitespace-only name fails MinLength(1)
  // and "Mice" / "Mice " can't become two different categories.
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  description?: string;
}
