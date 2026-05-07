import { IsString, IsEnum, IsNumber, IsBoolean, IsOptional, Min, MaxLength } from 'class-validator';
import { TipType, Sentiment, TipStatus, TipResult } from '../tip.entity';

export class CreateTipDto {
  @IsString() @MaxLength(20) ticker: string;
  @IsEnum(TipType) tipType: TipType;
  @IsOptional() @IsNumber() @Min(0) entry?: number;
  @IsNumber() @Min(0) target: number;
  @IsOptional() @IsNumber() @Min(0) sl?: number;
  @IsString() @MaxLength(10) horizon: string;
  @IsEnum(Sentiment) sentiment: Sentiment;
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
  @IsOptional() @IsBoolean() isPaid?: boolean;
}

export class CloseTipDto {
  @IsEnum(TipStatus) status: TipStatus;
  @IsEnum(TipResult) result: TipResult;
  @IsNumber() @Min(0) exitPrice: number;
}

export class FeedQueryDto {
  @IsOptional() @IsEnum(TipType) type?: TipType;
  @IsOptional() @IsString() ticker?: string;
  @IsOptional() page?: number = 1;
  @IsOptional() limit?: number = 20;
}
