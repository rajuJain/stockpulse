import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TipsModule } from './tips/tips.module';
import { PostsModule } from './posts/posts.module';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { AdminModule } from './admin/admin.module';
import { AnalysisModule } from './analysis/analysis.module';
import { MarketDataModule } from './market-data/market-data.module';
import { PaymentsModule } from './payments/payments.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'mysql',
        host:     cfg.get('DB_HOST', 'localhost'),
        port:     parseInt(cfg.get('DB_PORT', '3306'), 10),
        username: cfg.get('DB_USER', 'root'),
        password: cfg.get('DB_PASSWORD', ''),
        database: cfg.get('DB_NAME', 'stockpulse'),
        autoLoadEntities: true,
        synchronize: false,
        charset: 'utf8mb4',
        timezone: 'Z',
        extra: { connectionLimit: 20 },
      }),
    }),

    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),

    AuthModule,
    UsersModule,
    TipsModule,
    PostsModule,
    PlansModule,
    SubscriptionsModule,
    AdminModule,
    AnalysisModule,
    MarketDataModule,
    PaymentsModule,
    WatchlistModule,
    NotificationsModule,
    RealtimeModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
