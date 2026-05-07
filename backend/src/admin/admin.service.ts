import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus, UserRole } from '../users/user.entity';
import { Plan } from '../plans/plan.entity';
import { Tip } from '../tips/tip.entity';
import { Post } from '../posts/post.entity';
import { Subscription } from '../subscriptions/subscription.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Plan) private readonly plans: Repository<Plan>,
    @InjectRepository(Tip) private readonly tips: Repository<Tip>,
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(Subscription) private readonly subs: Repository<Subscription>,
  ) {}

  // ── Platform overview ───────────────────────────────────────────────────
  async getOverview() {
    const [totalUsers, activeUsers, sebiVerified, sebiPending, activePlans, totalSubs, totalPosts, totalTips, premiumTips, suspendedUsers] = await Promise.all([
      this.users.count({ where: { role: UserRole.USER } }),
      this.users.count({ where: { role: UserRole.USER, status: UserStatus.ACTIVE } }),
      this.users.count({ where: { sebi: true, sebiVerified: true } }),
      this.users.count({ where: { sebi: true, sebiVerified: false } }),
      this.plans.count({ where: { active: true } }),
      this.subs.count({ where: { status: 'active' as any } }),
      this.posts.count({ where: { isDeleted: false } }),
      this.tips.count(),
      this.tips.count({ where: { isPaid: true } }),
      this.users.count({ where: { status: UserStatus.SUSPENDED } }),
    ]);

    const revenue = await this.plans
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.total_revenue),0)', 'total')
      .getRawOne();

    return {
      totalUsers, activeUsers, sebiVerified, sebiPending,
      activePlans, totalSubs, totalPosts, totalTips, premiumTips, suspendedUsers,
      totalRevenue: +revenue.total,
    };
  }

  // ── Users list with filters ─────────────────────────────────────────────
  async getUsers(filter: { role?: string; status?: string; sebi?: string; search?: string }) {
    const qb = this.users.createQueryBuilder('u').where('u.role = :r', { r: UserRole.USER });
    if (filter.status) qb.andWhere('u.status = :s', { s: filter.status });
    if (filter.sebi === 'verified') qb.andWhere('u.sebi_verified = 1');
    if (filter.sebi === 'pending') qb.andWhere('u.sebi = 1 AND u.sebi_verified = 0');
    if (filter.sebi === 'none') qb.andWhere('u.sebi = 0');
    if (filter.search) qb.andWhere('(u.name LIKE :q OR u.handle LIKE :q OR u.email LIKE :q)', { q: `%${filter.search}%` });
    return qb.orderBy('u.created_at', 'DESC').getMany();
  }

  // ── SEBI verification queue ─────────────────────────────────────────────
  getSebiQueue() {
    return this.users.find({ where: { sebi: true, sebiVerified: false }, order: { createdAt: 'ASC' } });
  }

  async approveSebi(userId: number, adminId: number): Promise<User> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.sebi) throw new BadRequestException('User has no SEBI registration');

    user.sebiVerified = true;
    return this.users.save(user);
  }

  async rejectSebi(userId: number): Promise<User> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.sebi = false;
    user.regNo = null;
    user.sebiVerified = false;
    return this.users.save(user);
  }

  // ── User suspension ─────────────────────────────────────────────────────
  async suspendUser(userId: number): Promise<User> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.status = UserStatus.SUSPENDED;
    return this.users.save(user);
  }

  async unsuspendUser(userId: number): Promise<User> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.status = UserStatus.ACTIVE;
    return this.users.save(user);
  }

  // ── Plan management ─────────────────────────────────────────────────────
  async deactivatePlan(userId: number): Promise<void> {
    await this.plans.update({ userId }, { active: false });
  }

  getAllPlans() {
    return this.plans.find({ where: { active: true }, relations: ['user'], order: { totalRevenue: 'DESC' } });
  }

  // ── Content moderation ──────────────────────────────────────────────────
  async deletePost(postId: number): Promise<void> {
    await this.posts.update({ id: postId }, { isDeleted: true });
  }

  async deleteTip(tipId: number): Promise<void> {
    await this.tips.delete({ id: tipId });
  }

  // ── Platform analytics ──────────────────────────────────────────────────
  async getTipsByType() {
    return this.tips
      .createQueryBuilder('t')
      .select('t.tip_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.tip_type')
      .getRawMany();
  }

  async getRevenueByAnalyst() {
    return this.plans
      .createQueryBuilder('p')
      .leftJoin('p.user', 'u')
      .select('u.id', 'userId')
      .addSelect('u.name', 'name')
      .addSelect('p.total_revenue', 'revenue')
      .where('p.active = 1')
      .orderBy('p.total_revenue', 'DESC')
      .getRawMany();
  }
}
