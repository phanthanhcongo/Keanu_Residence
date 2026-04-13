import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { LogVisitDto } from './dto/log-visit.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import type { Request } from 'express';

@ApiTags('activity')
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post('log-visit')
  @Public()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Log a page visit or user action (authenticated or anonymous)' })
  @ApiResponse({ status: 201, description: 'Visit logged successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: LogVisitDto })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async logVisit(
    @Body() dto: LogVisitDto,
    @Req() req: Request,
  ) {
    // Check if user is authenticated (optional)
    const user = (req as any).user;
    
    // If user is authenticated, log with userId, otherwise log as anonymous
    if (user) {
      return this.activityService.logVisit({
        ...dto,
        userId: user.id,
        ipAddress: req.ip || req.socket.remoteAddress || undefined,
        userAgent: req.get('user-agent') || undefined,
      });
    } else {
      return this.activityService.logVisitAnonymous({
        ...dto,
        ipAddress: req.ip || req.socket.remoteAddress || undefined,
        userAgent: req.get('user-agent') || undefined,
      });
    }
  }

  @Post('log-visit-anonymous')
  @ApiOperation({ summary: 'Log a page visit for anonymous users' })
  @ApiResponse({ status: 201, description: 'Visit logged successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiBody({ type: LogVisitDto })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async logVisitAnonymous(
    @Body() dto: LogVisitDto,
    @Req() req: Request,
  ) {
    // For anonymous visits, we can use a system user ID or skip userId
    // For now, we'll skip logging if no user (or create a system user)
    return this.activityService.logVisitAnonymous({
      ...dto,
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
    });
  }
}

