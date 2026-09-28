import { IsInt, Min } from 'class-validator';

export class ProductInventoryDto {
  @IsInt()
  @Min(0)
  quantity!: number;
}
