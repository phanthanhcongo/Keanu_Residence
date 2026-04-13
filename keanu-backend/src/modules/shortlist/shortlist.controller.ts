import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ShortlistService } from './shortlist.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import {
  AddToShortlistDto,
  ShortlistResponseDto,
  ShortlistItemDto,
} from './dto/shortlist.dto';

@ApiTags('shortlist')
@Controller('shortlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ShortlistController {
  constructor(private readonly shortlistService: ShortlistService) {}

  /**
   * GET /api/shortlist
   * Get user's shortlist
   */
  @Get()
  @ApiOperation({
    summary: 'Get user shortlist',
    description: 'Retrieve all units in the current user\'s shortlist',
  })
  @ApiResponse({
    status: 200,
    description: 'Shortlist retrieved successfully',
    type: ShortlistResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getShortlist(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ShortlistResponseDto> {
    return this.shortlistService.getShortlist(user.id);
  }

  /**
   * POST /api/shortlist/:unitId
   * Add unit to shortlist
   */
  @Post(':unitId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add unit to shortlist',
    description: 'Add a unit to the current user\'s shortlist. Units with any status can be added.',
  })
  @ApiParam({
    name: 'unitId',
    description: 'Unit ID to add to shortlist',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Unit added to shortlist successfully',
    type: ShortlistItemDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  @ApiResponse({ status: 409, description: 'Unit already in shortlist' })
  async addToShortlist(
    @Param('unitId') unitId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ShortlistItemDto> {
    return this.shortlistService.addToShortlist(user.id, unitId);
  }

  /**
   * DELETE /api/shortlist/:unitId
   * Remove unit from shortlist
   */
  @Delete(':unitId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove unit from shortlist',
    description: 'Remove a unit from the current user\'s shortlist',
  })
  @ApiParam({
    name: 'unitId',
    description: 'Unit ID to remove from shortlist',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Unit removed from shortlist successfully',
    schema: {
      example: {
        message: 'Unit removed from shortlist successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Unit not in shortlist' })
  async removeFromShortlist(
    @Param('unitId') unitId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ message: string }> {
    return this.shortlistService.removeFromShortlist(user.id, unitId);
  }

  /**
   * DELETE /api/shortlist
   * Clear shortlist (remove all items)
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear shortlist',
    description: 'Remove all units from the current user\'s shortlist',
  })
  @ApiResponse({
    status: 200,
    description: 'Shortlist cleared successfully',
    schema: {
      example: {
        message: 'Shortlist cleared successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async clearShortlist(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ message: string }> {
    return this.shortlistService.clearShortlist(user.id);
  }
}

