import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Injectable, Module, Controller, Post, Body, UseGuards, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { IsNumber, IsString } from 'class-validator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { createHmac } from 'crypto';
import Razorpay from 'razorpay';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { Subscription } from '../subscriptions/subscription.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'subscription_id', type: 'bigint', unsigned: true })
  subscriptionId: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'gst_amount', type: 'decimal', precision: 10, scale: 2 })
  gstAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ length: 3, default: 'INR' })
  currency: string;

  @Column({ length: 30, nullable: true })
  method: string | null;

  @Column({ name: 'razorpay_order_id', length: 100, unique: true })
  razorpayOrderId: string;

  @Column({ name: 'razorpay_payment_id', length: 100, nullable: true })
  razorpayPaymentId: string | null;

  @Column({ type: 'enum', enum: ['pending','paid','failed','refunded'], default: 'pending' })
  status: string;

  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

class CreateOrderDto { @IsNumber() planId: number; }
class VerifyPaymentDto {
  @IsString() razorpayOrderId: string;
  @IsString() razorpayPaymentId: string;
  @IsString() razorpaySignature: string;
}

@Injectable()
export class PaymentsService {
  private readonly razorpay: Razorpay;
  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    private readonly cfg: ConfigService,
  ) {
    this.razorpay = new Razorpay({
      key_id:     this.cfg.get('RAZORPAY_KEY_ID') ?? 'rzp_test_dummy',
      key_secret: this.cfg.get('RAZORPAY_KEY_SECRET') ?? 'dummy_secret',
    });
  }

  async createOrder(userId: number, subscriptionId: number, amount: number) {
    const gst   = +(amount * 0.18).toFixed(2);
    const total = +(amount + gst).toFixed(2);

    const order = await this.razorpay.orders.create({
      amount: Math.round(total * 100),
      currency: 'INR',
      receipt: `sub_${subscriptionId}_${Date.now()}`,
      notes: { userId: userId.toString(), subscriptionId: subscriptionId.toString() },
    });

    await this.payments.save({
      subscriptionId, userId, amount, gstAmount: gst, total,
      razorpayOrderId: order.id, status: 'pending',
    });

    return { orderId: order.id, amount: total, currency: 'INR', key: this.cfg.get('RAZORPAY_KEY_ID') };
  }

  async verify(userId: number, dto: VerifyPaymentDto) {
    const body = `${dto.razorpayOrderId}|${dto.razorpayPaymentId}`;
    const expected = createHmac('sha256', this.cfg.get('RAZORPAY_KEY_SECRET') ?? '')
      .update(body)
      .digest('hex');
    if (expected !== dto.razorpaySignature) {
      throw new BadRequestException('Invalid payment signature');
    }
    const payment = await this.payments.findOne({ where: { razorpayOrderId: dto.razorpayOrderId, userId } });
    if (!payment) throw new BadRequestException('Order not found');
    payment.razorpayPaymentId = dto.razorpayPaymentId;
    payment.status = 'paid';
    payment.paidAt = new Date();
    return this.payments.save(payment);
  }

  history(userId: number) {
    return this.payments.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }
}

@ApiTags('payments')
@Controller({ path: 'payments', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post('order')
  @HttpCode(HttpStatus.OK)
  createOrder(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    // In production, look up the plan price and subscription, then create order
    return this.service.createOrder(user.id, dto.planId, 999);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verify(@CurrentUser() user: User, @Body() dto: VerifyPaymentDto) {
    return this.service.verify(user.id, dto);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Subscription])],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
