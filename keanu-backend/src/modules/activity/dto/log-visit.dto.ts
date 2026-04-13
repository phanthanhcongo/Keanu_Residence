import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VisitAction {
  PAGE_VIEW = 'PAGE_VIEW',
  HOME_PAGE_VIEW = 'HOME_PAGE_VIEW',
  MASTERPLAN_VIEW = 'MASTERPLAN_VIEW',
  PROJECT_VIEW = 'PROJECT_VIEW',
  UNIT_VIEW = 'UNIT_VIEW',
  LOGIN = 'LOGIN',
  SEARCH = 'SEARCH',
  SHORTLISTED_UNIT = 'SHORTLISTED_UNIT',
  RESERVED_UNIT = 'RESERVED_UNIT',
  FILTER_UNIT = 'FILTER_UNIT',
  CONTACT_AGENT_VIEW = 'CONTACT_AGENT_VIEW',
  CONTACT_US_VIEW = 'CONTACT_US_VIEW',
  ENQUIRE_CLICK = 'ENQUIRE_CLICK',
  ENQUIRE_SUBMIT = 'ENQUIRE_SUBMIT',
  MAIN_WEBSITE_VIEW = 'MAIN_WEBSITE_VIEW',
  BROCHURE_VIEW = 'BROCHURE_VIEW',
  SHORTLIST_VIEW = 'SHORTLIST_VIEW',
  PROFILE_VIEW = 'PROFILE_VIEW',
  PAYMENT_HISTORY_VIEW = 'PAYMENT_HISTORY_VIEW',
}

export class LogVisitDto {
  @ApiProperty({ enum: VisitAction, description: 'Type of visit action' })
  @IsEnum(VisitAction)
  action: VisitAction;

  @ApiPropertyOptional({ description: 'Entity type (Unit, Project, etc.)' })
  @IsOptional()
  @IsString()
  entity?: string;

  @ApiPropertyOptional({ description: 'Entity ID (unitId, projectId, etc.)' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

