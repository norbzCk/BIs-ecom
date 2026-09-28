import { IsBoolean, IsOptional, IsUrl } from 'class-validator';

export class ProductImageDto {
  @IsUrl({ require_tld: false }, { message: 'Each image must be a valid URL' })
  url!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
