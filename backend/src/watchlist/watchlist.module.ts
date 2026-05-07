import { Entity, PrimaryColumn, CreateDateColumn } from 'typeorm';
import { Controller, Post, Delete, Get, Param, UseGuards, HttpCode, HttpStatus, Module, Injectable } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@Entity('watchlist')
export class WatchlistItem {
  @PrimaryColumn({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @PrimaryColumn({ length: 20 })
  ticker: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Injectable()
export class WatchlistService {
  constructor(@InjectRepository(WatchlistItem) private readonly repo: Repository<WatchlistItem>) {}

  list(userId: number) { return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } }); }

  async add(userId: number, ticker: string) {
    ticker = ticker.toUpperCase();
    const exists = await this.repo.findOne({ where: { userId, ticker } });
    if (exists) return exists;
    return this.repo.save({ userId, ticker });
  }

  remove(userId: number, ticker: string) {
    return this.repo.delete({ userId, ticker: ticker.toUpperCase() });
  }
}

@ApiTags('watchlist')
@Controller({ path: 'watchlist', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WatchlistController {
  constructor(private readonly service: WatchlistService) {}

  @Get()
  list(@CurrentUser() user: User) { return this.service.list(user.id); }

  @Post(':ticker')
  add(@CurrentUser() user: User, @Param('ticker') ticker: string) {
    return this.service.add(user.id, ticker);
  }

  @Delete(':ticker')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: User, @Param('ticker') ticker: string) {
    return this.service.remove(user.id, ticker);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([WatchlistItem])],
  providers: [WatchlistService],
  controllers: [WatchlistController],
  exports: [WatchlistService],
})
export class WatchlistModule {}
