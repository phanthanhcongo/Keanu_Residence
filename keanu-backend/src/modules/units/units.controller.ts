import { Controller, Get, Param, Query, UsePipes, ValidationPipe, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { FilterUnitsDto } from './dto/filter-units.dto';
import { ActivityLogService } from '../../common/services/activity-log.service';
import type { Request } from 'express';

@ApiTags('units')
@Controller('units')
export class UnitsController {
  constructor(
    private readonly unitsService: UnitsService,
    private readonly activityLogService: ActivityLogService,
  ) { }

  @Get('villas')
  @ApiOperation({ summary: 'Get list of villas' })
  @ApiResponse({ status: 200, description: 'List of villas retrieved successfully' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getVillas(@Query() filterDto: FilterUnitsDto) {
    return this.unitsService.getVillas(filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific villa' })
  @ApiParam({ name: 'id', description: 'Unit ID' })
  @ApiResponse({ status: 200, description: 'Villa details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Villa not found' })
  async getVillaById(@Param('id') id: string, @Req() req: Request) {
    const villa = await this.unitsService.getVillaById(id);

    // Log unit view activity
    const user = (req as any).user;
    if (user) {
      this.activityLogService.createActivityLog({
        userId: user.id,
        action: 'UNIT_VIEW',
        entity: 'Unit',
        entityId: id,
        ipAddress: req.ip || req.socket.remoteAddress || undefined,
        userAgent: req.get('user-agent') || undefined,
      }).catch(err => console.error('Failed to log unit view activity:', err));
    } else {
      // For anonymous, we can use the activity service way if we want, 
      // but let's keep it simple here and try to log without userId if the service allows 
      // or just rely on frontend tracking for anonymous.
      // Given requirements specifically asked for Unit ID and User ID if applicable.
    }

    return villa;
  }
}

