import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatus } from './subscription.entity';
import { Plan } from '../plans/plan.entity';
import { User } from '../users/user.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription) private readonly subs: Repository<Subscription>,
    @InjectRepository(Plan) private readonly plans: Repository<Plan>,
  ) {}

  async subscribe(user: User, planId: number): Promise<Subscription> {
    const plan = await this.plans.findOne({ where: { id: planId } });
    if (!plan || !plan.active) throw new NotFoundException('Plan not available');
    if (plan.userId === user.id) throw new BadRequestException('Cannot subscribe to your own plan');
    if (plan.subscriberCount >= plan.maxSubs) throw new BadRequestException('Plan is full');

    const existing = await this.subs.findOne({
      where: { subscriberId: user.id, analystId: plan.userId, status: SubscriptionStatus.ACTIVE },
    });
    if (existing) throw new BadRequestException('Already subscribed');

    const now = new Date();
    const end = new Date(now);
    const cycleDays = plan.billingCycle === 'monthly' ? 30 : plan.billingCycle === 'quarterly' ? 90 : 365;
    end.setDate(end.getDate() + cycleDays);

    const sub = await this.subs.save(
      this.subs.create({
        subscriberId: user.id,
        planId: plan.id,
        analystId: plan.userId,
        status: SubscriptionStatus.ACTIVE,
        currentEnd: end,
      }),
    );

    plan.subscriberCount += 1;
    plan.totalRevenue = +plan.totalRevenue + +plan.price;
    await this.plans.save(plan);

    return sub;
  }

  async cancel(user: User, subId: number): Promise<void> {
    const sub = await this.subs.findOne({ where: { id: subId } });
    if (!sub || sub.subscriberId !== user.id) throw new NotFoundException('Subscription not found');
    sub.status = SubscriptionStatus.CANCELLED;
    sub.cancelledAt = new Date();
    await this.subs.save(sub);
  }

  mySubscriptions(userId: number): Promise<Subscription[]> {
    return this.subs.find({
      where: { subscriberId: userId, status: SubscriptionStatus.ACTIVE },
      relations: ['plan', 'analyst'],
      order: { startedAt: 'DESC' },
    });
  }

  analystSubscribers(analystId: number): Promise<Subscription[]> {
    return this.subs.find({
      where: { analystId, status: SubscriptionStatus.ACTIVE },
      relations: ['subscriber'],
    });
  }

  isSubscribed(subscriberId: number, analystId: number): Promise<boolean> {
    return this.subs
      .count({ where: { subscriberId, analystId, status: SubscriptionStatus.ACTIVE } })
      .then(c => c > 0);
  }
}
