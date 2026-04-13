import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProjectsService, ProjectCountdownResponse } from './projects.service';
import {
  ProjectApiResponseDto,
  ProjectsListApiResponseDto,
  ProjectCountdownApiResponseDto,
} from './dto/project-response.dto';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * GET /api/projects
   * List all projects
   */
  @Get()
  @ApiOperation({
    summary: 'Get all projects',
    description: 'Retrieve a list of all projects ordered by launch date',
  })
  @ApiResponse({
    status: 200,
    description: 'Projects retrieved successfully',
    type: ProjectsListApiResponseDto,
  })
  async getAllProjects(): Promise<ProjectsListApiResponseDto> {
    const projects = await this.projectsService.getAllProjects();
    return {
      success: true,
      data: projects,
    };
  }

  /**
   * GET /api/projects/primary
   * Get primary project
   */
  @Get('primary')
  @ApiOperation({
    summary: 'Get primary project',
    description: 'Retrieve detailed information about the primary project',
  })
  @ApiResponse({
    status: 200,
    description: 'Primary project retrieved successfully',
    type: ProjectApiResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No primary project found',
    schema: {
      example: {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No primary project found',
        },
      },
    },
  })
  async getPrimaryProject(): Promise<ProjectApiResponseDto> {
    const project = await this.projectsService.getPrimaryProject();
    return {
      success: true,
      data: project,
    };
  }

  /**
   * GET /api/projects/:slug
   * Get project by slug
   */
  @Get(':slug')
  @ApiOperation({
    summary: 'Get project by slug',
    description: 'Retrieve detailed information about a specific project using its slug',
  })
  @ApiParam({
    name: 'slug',
    description: 'Project slug (URL-friendly identifier)',
    example: 'skyview-towers',
  })
  @ApiResponse({
    status: 200,
    description: 'Project retrieved successfully',
    type: ProjectApiResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
    schema: {
      example: {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Project with slug "skyview-towers" not found',
        },
      },
    },
  })
  async getProjectBySlug(@Param('slug') slug: string): Promise<ProjectApiResponseDto> {
    const project = await this.projectsService.getProjectBySlug(slug);
    return {
      success: true,
      data: project,
    };
  }

  /**
   * GET /api/projects/primary/countdown
   * Get countdown data for the primary project
   */
  @Get('primary/countdown')
  @ApiOperation({
    summary: 'Get countdown data for primary project launch',
    description:
      'Retrieve real-time countdown data showing time remaining until the primary project launch. Data is cached for 1 minute but countdown is recalculated on each request for accuracy.',
  })
  @ApiResponse({
    status: 200,
    description: 'Countdown data retrieved successfully',
    type: ProjectCountdownApiResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No primary project found',
    schema: {
      example: {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No primary project found',
        },
      },
    },
  })
  async getPrimaryCountdown(): Promise<ProjectCountdownApiResponseDto> {
    const countdown = await this.projectsService.getPrimaryProjectCountdown();
    return {
      success: true,
      data: countdown,
    };
  }

  /**
   * GET /api/projects/:slug/countdown
   * Get countdown data for a project
   */
  @Get(':slug/countdown')
  @ApiOperation({
    summary: 'Get countdown data for project launch',
    description:
      'Retrieve real-time countdown data showing time remaining until project launch. Data is cached for 1 minute but countdown is recalculated on each request for accuracy.',
  })
  @ApiParam({
    name: 'slug',
    description: 'Project slug (URL-friendly identifier)',
    example: 'skyview-towers',
  })
  @ApiResponse({
    status: 200,
    description: 'Countdown data retrieved successfully',
    type: ProjectCountdownApiResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
    schema: {
      example: {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Project with slug "skyview-towers" not found',
        },
      },
    },
  })
  async getCountdown(@Param('slug') slug: string): Promise<ProjectCountdownApiResponseDto> {
    const countdown = await this.projectsService.getCountdown(slug);
    return {
      success: true,
      data: countdown,
    };
  }
}

