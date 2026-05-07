import { Controller, Post, Get, Delete, Body, Param, UseGuards, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { Subscription } from './subscription.entity';
import { Plan } from '../plans/plan.entity';

class SubscribeDto { @IsNumber() planId: number; }

@ApiTags('subscriptions')
@Controller({ path: 'subscriptions', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Post()
  subscribe(@CurrentUser() user: User, @Body() dto: SubscribeDto) {
    return this.service.subscribe(user, dto.planId);
  }

  @Get('mine')
  mine(@CurrentUser() user: User) {
    return this.service.mySubscriptions(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.service.cancel(user, id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, Plan])],
  providers: [SubscriptionsService],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
