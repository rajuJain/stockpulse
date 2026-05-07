import { Entity, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('post_likes')
export class PostLike {
  @PrimaryColumn({ name: 'post_id', type: 'bigint', unsigned: true })
  postId: number;

  @PrimaryColumn({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
