import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne } from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole { USER = 'user', ADMIN = 'admin' }
export enum UserStatus { ACTIVE = 'active', SUSPENDED = 'suspended', DELETED = 'deleted' }

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 50, unique: true })
  handle: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string | null;

  @Exclude()
  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ name: 'avatar_url', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: 'boolean', default: false })
  sebi: boolean;

  @Column({ name: 'reg_no', length: 50, nullable: true })
  regNo: string | null;

  @Column({ name: 'sebi_verified', type: 'boolean', default: false })
  sebiVerified: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  accuracy: number | null;

  @Column({ type: 'int', default: 0 })
  streak: number;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ name: 'followers_count', type: 'int', default: 0 })
  followersCount: number;

  @Column({ name: 'email_verified_at', type: 'datetime', nullable: true })
  emailVerifiedAt: Date | null;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /** Only SEBI-verified users can offer paid plans */
  get canOfferPlan(): boolean {
    return this.sebi && this.sebiVerified && this.status === UserStatus.ACTIVE;
  }
}
