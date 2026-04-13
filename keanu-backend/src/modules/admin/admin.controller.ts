import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  UsePipes,
  ValidationPipe,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UserManipulationService } from './user-manipulation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import {
  ListUsersDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  CreateUserDto,
} from './dto/users.dto';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ListProjectsDto,
} from './dto/projects.dto';
import {
  CreateUnitDto,
  UpdateUnitDto,
  ListUnitsDto,
} from './dto/units.dto';
import {
  ListReservationsDto,
  UpdateReservationStatusDto,
  UpdatePaymentStatusDto,
} from './dto/reservations.dto';
import {
  ListActivityLogsDto,
} from './dto/activity-logs.dto';
import {
  GetStatisticsDto,
} from './dto/statistics.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../modules/users/entities/user.entity';
import { ForbiddenException } from '@nestjs/common';


@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly userManipulationService: UserManipulationService,
  ) { }

  // ============================================================================
  // USERS MANAGEMENT
  // ============================================================================

  @Post('users')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users with filters' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @UsePipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }))
  async listUsers(@Query() dto: ListUsersDto) {
    return this.adminService.listUsers(dto);
  }

  @Get('users/export-csv')
  @ApiOperation({ summary: 'Export users to CSV' })
  @ApiResponse({ status: 200, description: 'CSV file downloaded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async exportUsersCSV(@Res() res: import('express').Response) {
    const csv = await this.adminService.exportUsersToCSV();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `users-export-${timestamp}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user detail' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserDetail(@Param('id') userId: string) {
    return this.adminService.getUserDetail(userId);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Cannot modify ADMIN or SUPER_ADMIN users' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateUserRole(
    @Param('id') userId: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.adminService.updateUserRole(userId, dto, user.id, ipAddress, userAgent);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Update user status (verify/lock)' })
  @ApiResponse({ status: 200, description: 'User status updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Cannot modify ADMIN or SUPER_ADMIN users' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateUserStatus(
    @Param('id') userId: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.adminService.updateUserStatus(userId, dto, user.id, ipAddress, userAgent);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete ADMIN or SUPER_ADMIN users' })
  async deleteUser(
    @Param('id') userId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.adminService.deleteUser(userId, user.id, ipAddress, userAgent);
  }

  @Patch('users/:id/restore')
  @ApiOperation({ summary: 'Restore deleted user' })
  @ApiResponse({ status: 200, description: 'User restored successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'User is not deleted' })
  async restoreUser(
    @Param('id') userId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.adminService.restoreUser(userId, user.id, ipAddress, userAgent);
  }

  // ============================================================================
  // PROJECTS MANAGEMENT
  // ============================================================================

  @Get('projects')
  @ApiOperation({ summary: 'List all projects with filters' })
  @ApiResponse({ status: 200, description: 'Projects retrieved successfully' })
  @UsePipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }))
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SALES)
  async listProjects(@Query() dto: ListProjectsDto) {
    return this.adminService.listProjects(dto);
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'Get project detail' })
  @ApiResponse({ status: 200, description: 'Project retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProjectDetail(@Param('id') projectId: string) {
    return this.adminService.getProjectDetail(projectId);
  }

  @Post('projects')
  @ApiOperation({ summary: 'Create new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  @ApiResponse({ status: 409, description: 'Project slug already exists' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createProject(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.adminService.createProject(dto, user.id, ipAddress, userAgent);
  }

  @Patch('projects/:id')
  @ApiOperation({ summary: 'Update project' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateProject(
    @Param('id') projectId: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.adminService.updateProject(projectId, dto, user.id, ipAddress, userAgent);
  }

  @Delete('projects/:id')
  @ApiOperation({ summary: 'Delete project' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete project with LIVE status or with units or reservations' })
  async deleteProject(
    @Param('id') projectId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.adminService.deleteProject(projectId, user.id, ipAddress, userAgent);
  }

  @Patch('projects/:id/restore')
  @ApiOperation({ summary: 'Restore deleted project' })
  @ApiResponse({ status: 200, description: 'Project restored successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 400, description: 'Project is not deleted' })
  async restoreProject(
    @Param('id') projectId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.adminService.restoreProject(projectId, user.id, ipAddress, userAgent);
  }

  // ============================================================================
  // UNITS MANAGEMENT
  // ============================================================================

  @Get('units')
  @ApiOperation({ summary: 'List all units with filters' })
  @ApiResponse({ status: 200, description: 'Units retrieved successfully' })
  @UsePipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }))
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SALES)
  async listUnits(@Query() dto: ListUnitsDto) {
    return this.adminService.listUnits(dto);
  }

  @Get('units/:id')
  @ApiOperation({ summary: 'Get unit detail' })
  @ApiResponse({ status: 200, description: 'Unit retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SALES)
  async getUnitDetail(@Param('id') unitId: string) {
    return this.adminService.getUnitDetail(unitId);
  }

  @Post('units')
  @ApiOperation({ summary: 'Create new unit' })
  @ApiResponse({ status: 201, description: 'Unit created successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 409, description: 'Unit number already exists' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createUnit(
    @Body() dto: CreateUnitDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.adminService.createUnit(dto, user.id, ipAddress, userAgent);
  }

  @Patch('units/:id')
  @ApiOperation({ summary: 'Update unit' })
  @ApiResponse({ status: 200, description: 'Unit updated successfully' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SALES)
  async updateUnit(
    @Param('id') unitId: string,
    @Body() dto: UpdateUnitDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: any,
  ) {
    let filteredDto = dto;

    if (user.role === UserRole.SALES) {
      // For SALES users, only allow status field
      // Filter out all other fields and undefined values
      const allowedFields = ['status'];
      const updates = Object.keys(dto).filter(key => dto[key] !== undefined && dto[key] !== null);
      const invalidUpdates = updates.filter(field => !allowedFields.includes(field));

      if (invalidUpdates.length > 0) {
        throw new ForbiddenException(`Sales role can only update unit status. Invalid fields: ${invalidUpdates.join(', ')}`);
      }

      // Create a clean DTO with only status field
      filteredDto = {
        status: dto.status,
      } as UpdateUnitDto;
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.adminService.updateUnit(unitId, filteredDto, user.id, ipAddress, userAgent);
  }

  @Delete('units/:id')
  @ApiOperation({ summary: 'Delete unit' })
  @ApiResponse({ status: 200, description: 'Unit deleted successfully' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete unit with reservations or shortlists' })
  async deleteUnit(
    @Param('id') unitId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.adminService.deleteUnit(unitId, user.id, ipAddress, userAgent);
  }

  @Patch('units/:id/restore')
  @ApiOperation({ summary: 'Restore deleted unit' })
  @ApiResponse({ status: 200, description: 'Unit restored successfully' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  @ApiResponse({ status: 400, description: 'Unit is not deleted or project is deleted' })
  async restoreUnit(
    @Param('id') unitId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.adminService.restoreUnit(unitId, user.id, ipAddress, userAgent);
  }

  @Post('units/:id/images')
  @ApiOperation({ summary: 'Upload unit images' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Images uploaded successfully' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  @UseInterceptors(FilesInterceptor('files', 10, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB per file
    },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
        return cb(new Error('Only image files are allowed'), false);
      }
      cb(null, true);
    },
  }))
  async uploadUnitImages(
    @Param('id') unitId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: any,
  ) {
    if (!files || files.length === 0) {
      throw new Error('No files uploaded');
    }
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.adminService.uploadUnitImages(unitId, files, user.id, ipAddress, userAgent);
  }

  // ============================================================================
  // RESERVATIONS MANAGEMENT
  // ============================================================================

  @Get('reservations')
  @ApiOperation({ summary: 'List all reservations with filters' })
  @ApiResponse({ status: 200, description: 'Reservations retrieved successfully' })
  @UsePipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }))
  async listReservations(@Query() dto: ListReservationsDto) {
    try {
      const result = await this.adminService.listReservations(dto);
      console.log('Controller returning result:', {
        dataLength: result.data?.length || 0,
        hasPagination: !!result.pagination,
      });
      return result;
    } catch (error) {
      console.error('Controller error in listReservations:', error);
      throw error;
    }
  }
  @Get('reservations/export-csv')
  @ApiOperation({ summary: 'Export reservations to CSV' })
  @ApiResponse({ status: 200, description: 'CSV file downloaded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async exportReservationsCSV(@Res() res: import('express').Response) {
    const csv = await this.adminService.exportReservationsToCSV();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `reservations-export-${timestamp}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }


  @Get('reservations/:id')
  @ApiOperation({ summary: 'Get reservation detail' })
  @ApiResponse({ status: 200, description: 'Reservation retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  async getReservationDetail(@Param('id') reservationId: string) {
    return this.adminService.getReservationDetail(reservationId);
  }

  @Patch('reservations/:id/status')
  @ApiOperation({ summary: 'Update reservation status' })
  @ApiResponse({ status: 200, description: 'Reservation status updated successfully' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateReservationStatus(
    @Param('id') reservationId: string,
    @Body() dto: UpdateReservationStatusDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.adminService.updateReservationStatus(reservationId, dto, user.id, ipAddress, userAgent);
  }

  @Patch('reservations/:id/payment-status')
  @ApiOperation({ summary: 'Update payment status' })
  @ApiResponse({ status: 200, description: 'Payment status updated successfully' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updatePaymentStatus(
    @Param('id') reservationId: string,
    @Body() dto: UpdatePaymentStatusDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.adminService.updatePaymentStatus(reservationId, dto, user.id, ipAddress, userAgent);
  }



  // ============================================================================
  // ACTIVITY LOGS
  // ============================================================================

  @Get('activity-logs')
  @ApiOperation({ summary: 'List activity logs with filters' })
  @ApiResponse({ status: 200, description: 'Activity logs retrieved successfully' })
  @UsePipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }))
  async listActivityLogs(@Query() dto: ListActivityLogsDto) {
    return this.adminService.listActivityLogs(dto);
  }

  @Get('activity-logs/export-csv')
  @ApiOperation({ summary: 'Export activity logs to CSV' })
  @ApiResponse({ status: 200, description: 'CSV file downloaded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async exportActivityLogsCSV(@Res() res: import('express').Response) {
    const csv = await this.adminService.exportActivityLogsToCSV();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `activity-logs-export-${timestamp}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  @Get('statistics')
  @ApiOperation({ summary: 'Get statistics for charts (visits and new registrations)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @UsePipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }))
  async getStatistics(@Query() dto: GetStatisticsDto) {
    return this.adminService.getStatistics(dto);
  }

  @Get('online-users')
  @ApiOperation({ summary: 'Get current online user count' })
  @ApiResponse({ status: 200, description: 'Online user count retrieved successfully' })
  async getOnlineUserCount() {
    const count = this.adminService.getOnlineUserCount();
    return {
      onlineUserCount: count,
    };
  }

  @Get('online-users/manipulated')
  @ApiOperation({ summary: 'Get current manipulated user count (real + delta)' })
  @ApiResponse({ status: 200, description: 'Manipulated user count retrieved successfully' })
  async getManipulatedUserCount() {
    return this.adminService.getUserCountBreakdown();
  }

  @Get('online-users/manipulated/debug')
  @ApiOperation({ summary: 'Get debug info for manipulated user count' })
  @ApiResponse({ status: 200, description: 'Debug info retrieved successfully' })
  async getManipulatedUserDebug() {
    const breakdown = await this.adminService.getUserCountBreakdown();
    const manipulation = await this.userManipulationService.getDebugInfo();
    return {
      ...breakdown,
      manipulation,
    };
  }

  @Get('online-users/debug')
  @ApiOperation({ summary: 'Get debug info about online users (Admin only)' })
  @ApiResponse({ status: 200, description: 'Debug info retrieved successfully' })
  async getOnlineUsersDebug() {
    const debugInfo = AdminService.getOnlineUsersDebugInfo();
    return debugInfo;
  }

  @Post('online-users/reset')
  @ApiOperation({ summary: 'Reset online user tracking (Admin only, for testing)' })
  @ApiResponse({ status: 200, description: 'Online user tracking reset successfully' })
  async resetOnlineUsers() {
    AdminService.resetOnlineUsers();
    return {
      message: 'Online user tracking has been reset',
      onlineUserCount: 0,
    };
  }

  // ============================================================================
  // FOMO EFFECT
  // ============================================================================

  @Post('fomo/trigger')
  @ApiOperation({ summary: 'Trigger FOMO effect (only works within 10 min of launch)' })
  @ApiResponse({ status: 200, description: 'FOMO effect triggered successfully' })
  @ApiResponse({ status: 400, description: 'Launch is too far away or no primary project' })
  async triggerFomo() {
    return this.adminService.triggerFomo();
  }

  @Post('fomo/stop')
  @ApiOperation({ summary: 'Stop FOMO effect immediately' })
  @ApiResponse({ status: 200, description: 'FOMO effect stopped' })
  async stopFomo() {
    return this.adminService.stopFomo();
  }

  @Get('fomo/status')
  @ApiOperation({ summary: 'Get current FOMO effect status' })
  @ApiResponse({ status: 200, description: 'FOMO status retrieved' })
  async getFomoStatus() {
    return this.adminService.getFomoStatus();
  }
}
