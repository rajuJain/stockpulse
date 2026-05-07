import { Controller, Get, Param, ParseIntPipe, UseGuards, Patch, Body, Module } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { Repository, IsNull, Not } from 'typeorm';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { User } from './user.entity';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(500) bio?: string;
  @IsOptional() @IsString() avatarUrl?: string;
}

class SubmitSebiDto {
  @IsString() regNo: string;
}

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  findById(id: number) { return this.users.findOne({ where: { id } }); }
  findByHandle(handle: string) { return this.users.findOne({ where: { handle } }); }

  leaderboard() {
    return this.users.find({
      where: { accuracy: Not(IsNull()) },
      order: { accuracy: 'DESC', points: 'DESC' },
      take: 100,
    });
  }

  updateProfile(id: number, dto: UpdateProfileDto) {
    return this.users.update(id, dto).then(() => this.findById(id));
  }

  async submitSebi(id: number, regNo: string) {
    const user = await this.findById(id);
    if (!user) return null;
    user.sebi = true;
    user.regNo = regNo.toUpperCase();
    user.sebiVerified = false;
    return this.users.save(user);
  }
}

@ApiTags('users')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('leaderboard')
  @ApiOperation({ summary: 'Top users ranked by accuracy and points' })
  leaderboard() { return this.users.leaderboard(); }

  @Get(':id')
  @ApiOperation({ summary: 'Public profile by user ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.users.findById(id); }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Patch('me/sebi')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit SEBI registration for admin verification' })
  submitSebi(@CurrentUser() user: User, @Body() dto: SubmitSebiDto) {
    return this.users.submitSebi(user.id, dto.regNo);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
