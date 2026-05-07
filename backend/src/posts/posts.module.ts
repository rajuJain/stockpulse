import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Controller, Get, Post as HttpPost, Delete, Body, Param, Query, UseGuards, ParseIntPipe, HttpCode, HttpStatus, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Post } from './post.entity';
import { PostLike } from './post-like.entity';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';

class CreatePostDto {
  @IsString() @MaxLength(2000) content: string;
  @IsOptional() @IsNumber() tipId?: number;
}

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(PostLike) private readonly likes: Repository<PostLike>,
  ) {}

  create(userId: number, dto: CreatePostDto) {
    return this.posts.save(this.posts.create({ userId, content: dto.content, tipId: dto.tipId ?? null }));
  }

  async feed(page = 1, limit = 20) {
    const [data, total] = await this.posts.findAndCount({
      where: { isDeleted: false },
      relations: ['user', 'tip', 'tip.user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, page, limit, total };
  }

  async like(userId: number, postId: number) {
    const exists = await this.likes.findOne({ where: { userId, postId } });
    if (exists) {
      await this.likes.delete({ userId, postId });
      await this.posts.decrement({ id: postId }, 'likesCount', 1);
      return { liked: false };
    }
    await this.likes.save({ userId, postId });
    await this.posts.increment({ id: postId }, 'likesCount', 1);
    return { liked: true };
  }

  async remove(user: User, postId: number) {
    const post = await this.posts.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== user.id) throw new ForbiddenException('Not your post');
    post.isDeleted = true;
    await this.posts.save(post);
  }
}

@ApiTags('posts')
@Controller({ path: 'posts', version: '1' })
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get('feed')
  feed(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.posts.feed(page ? +page : 1, limit ? +limit : 20);
  }

  @HttpPost()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(@CurrentUser() user: User, @Body() dto: CreatePostDto) {
    return this.posts.create(user.id, dto);
  }

  @HttpPost(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  like(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.posts.like(user.id, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.posts.remove(user, id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Post, PostLike])],
  providers: [PostsService],
  controllers: [PostsController],
  exports: [PostsService],
})
export class PostsModule {}
