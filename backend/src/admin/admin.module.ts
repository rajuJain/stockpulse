import { Controller, Get, Post, Delete, Patch, Param, Query, UseGuards, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { JwtAuthGuard, Roles } from '../auth/guards/auth.guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/user.entity';
import { Plan } from '../plans/plan.entity';
import { Tip } from '../tips/tip.entity';
import { Post as PostEntity } from '../posts/post.entity';
import { Subscription } from '../subscriptions/subscription.entity';

@ApiTags('admin')
@Controller({ path: 'admin', version: '1' })
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Platform KPIs and summary stats' })
  overview() { return this.admin.getOverview(); }

  @Get('users')
  @ApiOperation({ summary: 'All users with role/status/sebi/search filters' })
  users(
    @Query('status') status?: string,
    @Query('sebi') sebi?: string,
    @Query('search') search?: string,
  ) {
    return this.admin.getUsers({ status, sebi, search });
  }

  @Get('sebi-queue')
  @ApiOperation({ summary: 'Pending SEBI verification requests' })
  sebiQueue() { return this.admin.getSebiQueue(); }

  @Post('sebi/:id/approve')
  approveSebi(@Param('id', ParseIntPipe) id: number, @CurrentUser() admin: User) {
    return this.admin.approveSebi(id, admin.id);
  }

  @Post('sebi/:id/reject')
  rejectSebi(@Param('id', ParseIntPipe) id: number) {
    return this.admin.rejectSebi(id);
  }

  @Post('users/:id/suspend')
  suspend(@Param('id', ParseIntPipe) id: number) { return this.admin.suspendUser(id); }

  @Post('users/:id/unsuspend')
  unsuspend(@Param('id', ParseIntPipe) id: number) { return this.admin.unsuspendUser(id); }

  @Get('plans')
  plans() { return this.admin.getAllPlans(); }

  @Delete('plans/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivatePlan(@Param('userId', ParseIntPipe) userId: number) {
    return this.admin.deactivatePlan(userId);
  }

  @Delete('posts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePost(@Param('id', ParseIntPipe) id: number) { return this.admin.deletePost(id); }

  @Delete('tips/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTip(@Param('id', ParseIntPipe) id: number) { return this.admin.deleteTip(id); }

  @Get('analytics/tips-by-type')
  tipsByType() { return this.admin.getTipsByType(); }

  @Get('analytics/revenue-by-analyst')
  revenueByAnalyst() { return this.admin.getRevenueByAnalyst(); }
}

@Module({
  imports: [TypeOrmModule.forFeature([User, Plan, Tip, PostEntity, Subscription])],
  providers: [AdminService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
