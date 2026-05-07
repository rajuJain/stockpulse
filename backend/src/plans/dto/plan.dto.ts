import { IsString, IsNumber, IsEnum, IsArray, IsOptional, IsBoolean, Min, MaxLength } from 'class-validator';
import { BillingCycle } from '../plan.entity';

export class CreatePlanDto {
  @IsString() @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsNumber() @Min(99) price: number;
  @IsEnum(BillingCycle) billingCycle: BillingCycle = BillingCycle.MONTHLY;
  @IsNumber() @Min(10) maxSubs: number;
  @IsArray() @IsString({ each: true }) focus: string[];
  @IsArray() @IsString({ each: true }) perks: string[];
}

export class UpdatePlanDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsNumber() @Min(99) price?: number;
  @IsOptional() @IsEnum(BillingCycle) billingCycle?: BillingCycle;
  @IsOptional() @IsNumber() @Min(10) maxSubs?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) focus?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) perks?: string[];
  @IsOptional() @IsBoolean() active?: boolean;
}
