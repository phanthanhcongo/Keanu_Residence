import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum StatisticsPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class GetStatisticsDto {
  @ApiPropertyOptional({ enum: StatisticsPeriod, default: StatisticsPeriod.MONTH })
  @IsOptional()
  @IsEnum(StatisticsPeriod)
  period?: StatisticsPeriod = StatisticsPeriod.MONTH;

  @ApiPropertyOptional({ default: 30, minimum: 7, maximum: 365 })
  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(365)
  days?: number = 30;
}

