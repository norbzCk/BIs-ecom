import { IsInt, IsPositive, IsString, Max } from 'class-validator';

export class AddCartItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @IsPositive()
  @Max(99)
  quantity: number = 1;
}
