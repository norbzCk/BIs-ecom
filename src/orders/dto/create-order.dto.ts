import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Mirrors the PaymentMethod enum in prisma/schema.prisma. Defined locally
 * (rather than imported from the generated client) so this DTO doesn't
 * depend on the generated output's internal file layout.
 */
export const PAYMENT_METHOD_VALUES = [
  'MOBILE_MONEY',
  'CARD',
  'BANK_TRANSFER',
  'CASH_ON_DELIVERY',
] as const;

export type PaymentMethodValue = (typeof PAYMENT_METHOD_VALUES)[number];

export class CreateOrderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  fullName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'Phone number must be between 7 and 15 digits, optionally starting with +.' })
  phone!: string; 

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  street!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  region!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  country!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsIn(PAYMENT_METHOD_VALUES)
  paymentMethod!: PaymentMethodValue;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
