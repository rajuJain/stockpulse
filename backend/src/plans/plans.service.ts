import { Injectable, ForbiddenException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './plan.entity';
import { User } from '../users/user.entity';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';

@Injectable()
export class PlansService {
  constructor(@InjectRepository(Plan) private readonly plans: Repository<Plan>) {}

  async create(user: User, dto: CreatePlanDto): Promise<Plan> {
    if (!user.canOfferPlan) {
      throw new ForbiddenException('SEBI-verified users only can offer paid plans');
    }
    const existing = await this.plans.findOne({ where: { userId: user.id } });
    if (existing) throw new ConflictException('You already have a plan. Update it instead.');
    return this.plans.save(this.plans.create({ ...dto, userId: user.id, active: true }));
  }

  async update(user: User, dto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.plans.findOne({ where: { userId: user.id } });
    if (!plan) throw new NotFoundException('No plan found');
    Object.assign(plan, dto);
    return this.plans.save(plan);
  }

  async deactivate(user: User): Promise<void> {
    await this.plans.update({ userId: user.id }, { active: false });
  }

  findAll(): Promise<Plan[]> {
    return this.plans.find({ where: { active: true }, relations: ['user'], order: { totalRevenue: 'DESC' } });
  }

  findByAnalyst(userId: number): Promise<Plan | null> {
    return this.plans.findOne({ where: { userId }, relations: ['user'] });
  }

  async adminDeactivate(userId: number): Promise<void> {
    await this.plans.update({ userId }, { active: false });
  }

  getPlatformRevenue(): Promise<{ total: number }> {
    return this.plans
      .createQueryBuilder('p')
      .select('SUM(p.total_revenue)', 'total')
      .where('p.active = 1')
      .getRawOne();
  }
}
