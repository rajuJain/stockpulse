import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Tip, TipType, TipStatus, TipResult } from './tip.entity';
import { User } from '../users/user.entity';
import { Subscription } from '../subscriptions/subscription.entity';
import { CreateTipDto, CloseTipDto, FeedQueryDto } from './dto/tip.dto';

@Injectable()
export class TipsService {
  constructor(
    @InjectRepository(Tip) private readonly tips: Repository<Tip>,
    @InjectRepository(Subscription) private readonly subs: Repository<Subscription>,
  ) {}

  // ── Create a tip ────────────────────────────────────────────────────────
  async create(user: User, dto: CreateTipDto): Promise<Tip> {
    // SEBI gate for premium tips
    if (dto.isPaid && !user.canOfferPlan) {
      throw new ForbiddenException(
        'Only SEBI-verified users with an active plan can post premium tips',
      );
    }
    const tip = this.tips.create({
      userId: user.id,
      ticker: dto.ticker.toUpperCase(),
      tipType: dto.tipType,
      entry: dto.entry ?? null,
      target: dto.target,
      sl: dto.sl ?? null,
      horizon: dto.horizon,
      sentiment: dto.sentiment,
      reason: dto.reason ?? null,
      isPaid: dto.isPaid ?? false,
      status: TipStatus.OPEN,
    });
    return this.tips.save(tip);
  }

  // ── Public feed with visibility filtering ───────────────────────────────
  async getFeed(viewer: User | null, query: FeedQueryDto) {
    const page = Math.max(1, +query.page! || 1);
    const limit = Math.min(50, +query.limit! || 20);

    const qb = this.tips.createQueryBuilder('t')
      .leftJoinAndSelect('t.user', 'u')
      .orderBy('t.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.type) qb.andWhere('t.tip_type = :type', { type: query.type });
    if (query.ticker) qb.andWhere('t.ticker = :ticker', { ticker: query.ticker.toUpperCase() });

    const [tips, total] = await qb.getManyAndCount();

    // Mask premium tips for non-subscribers
    const subscribedAnalysts = viewer ? await this.getSubscribedAnalysts(viewer.id) : new Set<number>();
    const masked = tips.map(t => this.maskIfLocked(t, viewer, subscribedAnalysts));

    return { data: masked, page, limit, total, hasMore: page * limit < total };
  }

  // ── A single analyst's free tips (public) ───────────────────────────────
  async getAnalystFreeTips(analystId: number): Promise<Tip[]> {
    return this.tips.find({
      where: { userId: analystId, isPaid: false },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Resolved tips for profile history ───────────────────────────────────
  async getAnalystResolved(analystId: number): Promise<Tip[]> {
    return this.tips
      .createQueryBuilder('t')
      .where('t.user_id = :id', { id: analystId })
      .andWhere('t.result IS NOT NULL')
      .orderBy('t.created_at', 'DESC')
      .getMany();
  }

  // ── Analyst accuracy stats ──────────────────────────────────────────────
  async getAnalystStats(analystId: number) {
    const all = await this.tips.find({ where: { userId: analystId } });
    const resolved = all.filter(t => t.result !== null);
    const free = all.filter(t => !t.isPaid);
    const freeResolved = free.filter(t => t.result !== null);

    const acc = (arr: Tip[]) => {
      if (!arr.length) return null;
      const wins = arr.filter(t => t.result === TipResult.WIN).length;
      return Math.round((wins / arr.length) * 1000) / 10;
    };

    const byType: Record<string, any> = {};
    for (const type of [TipType.DAILY, TipType.SWING, TipType.LONGTERM]) {
      const subset = resolved.filter(t => t.tipType === type);
      byType[type] = {
        total: subset.length,
        wins: subset.filter(t => t.result === TipResult.WIN).length,
        accuracy: acc(subset),
      };
    }

    return {
      total: all.length,
      free: free.length,
      paid: all.filter(t => t.isPaid).length,
      open: all.filter(t => t.status === TipStatus.OPEN).length,
      overallAccuracy: acc(resolved),
      freeAccuracy: acc(freeResolved),
      resolved: resolved.length,
      wins: resolved.filter(t => t.result === TipResult.WIN).length,
      byType,
    };
  }

  // ── Crowd targets aggregation ───────────────────────────────────────────
  async getCrowdTargets(type?: TipType) {
    const qb = this.tips
      .createQueryBuilder('t')
      .select('t.ticker', 'ticker')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(t.target)', 'avgTarget')
      .addSelect(`SUM(CASE WHEN t.sentiment='bull' THEN 1 ELSE 0 END)`, 'bull')
      .addSelect(`SUM(CASE WHEN t.sentiment='bear' THEN 1 ELSE 0 END)`, 'bear')
      .addSelect(`SUM(CASE WHEN t.sentiment='neutral' THEN 1 ELSE 0 END)`, 'neutral')
      .where('t.status = :status', { status: TipStatus.OPEN })
      .groupBy('t.ticker');
    if (type) qb.andWhere('t.tip_type = :type', { type });

    const rows = await qb.getRawMany();
    return rows.map(r => ({
      ticker: r.ticker,
      count: +r.count,
      avgTarget: Math.round(+r.avgTarget),
      sentiments: { bull: +r.bull, bear: +r.bear, neutral: +r.neutral },
      confidence: Math.min(95, 40 + +r.count * 8 + (+r.count > 3 ? 10 : 0)),
    }));
  }

  // ── Close / resolve a tip (owner only) ──────────────────────────────────
  async closeTip(user: User, tipId: number, dto: CloseTipDto): Promise<Tip> {
    const tip = await this.tips.findOne({ where: { id: tipId } });
    if (!tip) throw new NotFoundException('Tip not found');
    if (tip.userId !== user.id) throw new ForbiddenException('You do not own this tip');
    if (tip.status !== TipStatus.OPEN) throw new BadRequestException('Tip already closed');

    tip.status = dto.status;
    tip.result = dto.result;
    tip.exitPrice = dto.exitPrice;
    tip.resolvedAt = new Date();
    return this.tips.save(tip);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  private async getSubscribedAnalysts(userId: number): Promise<Set<number>> {
    const subs = await this.subs.find({ where: { subscriberId: userId, status: 'active' as any } });
    return new Set(subs.map(s => s.analystId));
  }

  private maskIfLocked(tip: Tip, viewer: User | null, subscribedAnalysts: Set<number>): any {
    const isOwner = viewer?.id === tip.userId;
    const isSubscriber = subscribedAnalysts.has(tip.userId);
    if (!tip.isPaid || isOwner || isSubscriber) return tip;

    return {
      id: tip.id,
      userId: tip.userId,
      ticker: tip.ticker,
      tipType: tip.tipType,
      horizon: tip.horizon,
      sentiment: tip.sentiment,
      isPaid: true,
      createdAt: tip.createdAt,
      locked: true,
      user: tip.user,
    };
  }
}
