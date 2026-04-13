import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { FilterUnitsDto } from './dto/filter-units.dto';

@Injectable()
export class UnitsService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async getVillas(filterDto?: FilterUnitsDto) {
    const where: any = {
      isDeleted: false,
    };

    // Filter by unitType if provided
    if (filterDto?.unitType) {
      where.unitType = filterDto.unitType;
    }

    // Filter by status if provided
    if (filterDto?.status && filterDto.status.length > 0) {
      where.status = { in: filterDto.status };
    }

    // Always filter by primary project, ignoring any projectId parameter
    const primaryProject = await this.prisma.project.findFirst({
      where: { isPrimary: true, isDeleted: false },
      select: { id: true },
    });

    if (primaryProject) {
      where.projectId = primaryProject.id;
    }

    const villas = await this.prisma.unit.findMany({
      where,
      select: {
        id: true,
        unitNumber: true,
        unitType: true,
        size: true,
        bedrooms: true,
        bathrooms: true,
        price: true,
        launchPrice: true,
        status: true,
        shortlistCount: true,
        imageUrls: true,
        features: true,
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
            location: true,
            heroImageUrl: true,
            status: true,
            reservationDuration: true,
            depositAmount: true,
            isPrimary: true,
          },
        },
      },
    });

    // Convert Prisma Decimal types to numbers for JSON serialization
    const mappedVillas = await Promise.all(villas.map(async villa => {
      let imageUrls: string[] = [];
      if (villa.imageUrls && Array.isArray(villa.imageUrls) && (villa.imageUrls as string[]).length > 0) {
        imageUrls = villa.imageUrls as string[];
      }

      return {
        ...villa,
        imageUrls,
        size: Number(villa.size),
        bathrooms: Number(villa.bathrooms),
        price: Number(villa.price),
        launchPrice: villa.launchPrice ? Number(villa.launchPrice) : null,
        project: {
          ...villa.project,
          depositAmount: Number(villa.project.depositAmount),
        },
      };
    }));

    return mappedVillas;
  }

  async getVillaById(id: string) {
    const villa = await this.prisma.unit.findUnique({
      where: { id, isDeleted: false },
      select: {
        id: true,
        unitNumber: true,
        unitType: true,
        size: true,
        bedrooms: true,
        bathrooms: true,
        price: true,
        launchPrice: true,
        status: true,
        shortlistCount: true,
        imageUrls: true,
        features: true,
        description: true,
        floorPlanUrl: true,
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
            location: true,
            heroImageUrl: true,
            status: true,
            reservationDuration: true,
            depositAmount: true,
            isPrimary: true,
            launchDate: true,
            launchTime: true,
          },
        },
      },
    });

    if (!villa) {
      throw new NotFoundException('Villa not found');
    }

    let imageUrls: string[] = [];
    if (villa.imageUrls && Array.isArray(villa.imageUrls) && (villa.imageUrls as string[]).length > 0) {
      imageUrls = villa.imageUrls as string[];
    }

    return {
      success: true,
      data: {
        ...villa,
        imageUrls,
        size: Number(villa.size),
        bathrooms: Number(villa.bathrooms),
        price: Number(villa.price),
        launchPrice: villa.launchPrice ? Number(villa.launchPrice) : null,
        project: {
          ...villa.project,
          depositAmount: Number(villa.project.depositAmount),
        },
      }
    };
  }
}
