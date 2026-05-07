import { Controller, Get, Post, Patch, Body, Param, Delete, UseGuards, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
import { JwtAuthGuard, SebiVerified } from '../auth/guards/auth.guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@ApiTags('plans')
@Controller({ path: 'plans', version: '1' })
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'All active analyst plans' })
  findAll() { return this.plans.findAll(); }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  mine(@CurrentUser() user: User) { return this.plans.findByAnalyst(user.id); }

  @Get(':userId')
  findOne(@Param('userId', ParseIntPipe) userId: number) {
    return this.plans.findByAnalyst(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SebiVerified()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a paid plan (SEBI-verified only)' })
  create(@CurrentUser() user: User, @Body() dto: CreatePlanDto) {
    return this.plans.create(user, dto);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @SebiVerified()
  @ApiBearerAuth()
  update(@CurrentUser() user: User, @Body() dto: UpdatePlanDto) {
    return this.plans.update(user, dto);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivate(@CurrentUser() user: User) { return this.plans.deactivate(user); }
}
