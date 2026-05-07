import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipsService } from './tips.service';
import { TipsController } from './tips.controller';
import { Tip } from './tip.entity';
import { Subscription } from '../subscriptions/subscription.entity';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tip, Subscription]),
    forwardRef(() => RealtimeModule),
  ],
  providers: [TipsService],
  controllers: [TipsController],
  exports: [TipsService],
})
export class TipsModule {}
