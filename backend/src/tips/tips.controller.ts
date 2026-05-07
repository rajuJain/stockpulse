import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TipsService } from './tips.service';
import { CreateTipDto, CloseTipDto, FeedQueryDto } from './dto/tip.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { TipType } from './tip.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@ApiTags('tips')
@Controller({ path: 'tips', version: '1' })
export class TipsController {
  constructor(
    private readonly tips: TipsService,
    private readonly gateway: RealtimeGateway,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a new stock call' })
  async create(@CurrentUser() user: User, @Body() dto: CreateTipDto) {
    const tip = await this.tips.create(user, dto);
    this.gateway.broadcastNewTip(tip);
    return tip;
  }

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Paginated tips feed with subscription-aware masking' })
  feed(@CurrentUser() user: User, @Query() query: FeedQueryDto) {
    return this.tips.getFeed(user, query);
  }

  @Get('crowd-targets')
  @ApiOperation({ summary: 'Aggregated community price targets' })
  crowdTargets(@Query('type') type?: TipType) {
    return this.tips.getCrowdTargets(type);
  }

  @Get('analyst/:id/free')
  @ApiOperation({ summary: 'All free tips by a specific analyst' })
  analystFreeTips(@Param('id', ParseIntPipe) id: number) {
    return this.tips.getAnalystFreeTips(id);
  }

  @Get('analyst/:id/resolved')
  @ApiOperation({ summary: 'All resolved tips by a specific analyst' })
  analystResolved(@Param('id', ParseIntPipe) id: number) {
    return this.tips.getAnalystResolved(id);
  }

  @Get('analyst/:id/stats')
  @ApiOperation({ summary: 'Analyst accuracy stats (overall + free tip + by type)' })
  analystStats(@Param('id', ParseIntPipe) id: number) {
    return this.tips.getAnalystStats(id);
  }

  @Patch(':id/close')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Close a tip and record its result (owner only)' })
  closeTip(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseTipDto,
  ) {
    return this.tips.closeTip(user, id, dto);
  }
}
