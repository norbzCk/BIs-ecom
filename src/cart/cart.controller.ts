import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/jwt-payload.interface.js';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: JwtPayload) {
    return this.cartService.getCart(BigInt(user.sub));
  }

  @Post('items')
  addItem(@CurrentUser() user: JwtPayload, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(BigInt(user.sub), dto.productId, dto.quantity);
  }

  @Patch('items/:productId')
  updateItem(
    @CurrentUser() user: JwtPayload,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(BigInt(user.sub), productId, dto.quantity);
  }

  @Delete('items/:productId')
  removeItem(
    @CurrentUser() user: JwtPayload,
    @Param('productId') productId: string,
  ) {
    return this.cartService.removeItem(BigInt(user.sub), productId);
  }

  @Delete()
  clear(@CurrentUser() user: JwtPayload) {
    return this.cartService.clear(BigInt(user.sub));
  }
}
