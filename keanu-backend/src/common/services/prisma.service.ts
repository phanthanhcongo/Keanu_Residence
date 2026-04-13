import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

// List of models that support soft delete
const softDeleteModels = [
  'user',
  'emailOtp',
  'phoneOtp',
  'project',
  'unit',
  'shortlist',
  'reservation',
  'activityLog',
  'integration',
];

// Helper function to add isDeleted filter
function addSoftDeleteFilter(args: any): any {
  if (!args) {
    return { where: { isDeleted: false } };
  }

  if (!args.where) {
    args.where = {};
  }

  // Only add isDeleted filter if it's not explicitly set
  if (args.where.isDeleted === undefined) {
    args.where.isDeleted = false;
  }

  return args;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: any) {
    process.on('beforeExit', async () => {
      await this.$disconnect();
      await app.close();
    });
  }

  // Override findUnique methods to add soft delete filter
  // @ts-ignore - Type override for soft delete functionality
  get user() {
    return {
      ...super.user,
      findUnique: (args: any) => super.user.findUnique(addSoftDeleteFilter(args)),
      findFirst: (args: any) => super.user.findFirst(addSoftDeleteFilter(args)),
      findMany: (args?: any) => super.user.findMany(addSoftDeleteFilter(args)),
      count: (args?: any) => super.user.count(addSoftDeleteFilter(args)),
    } as any;
  }

  // @ts-ignore
  get emailOtp() {
    return {
      ...super.emailOtp,
      findUnique: (args: any) => super.emailOtp.findUnique(addSoftDeleteFilter(args)),
      findFirst: (args: any) => super.emailOtp.findFirst(addSoftDeleteFilter(args)),
      findMany: (args?: any) => super.emailOtp.findMany(addSoftDeleteFilter(args)),
      count: (args?: any) => super.emailOtp.count(addSoftDeleteFilter(args)),
    } as any;
  }

  // @ts-ignore
  get phoneOtp() {
    return {
      ...super.phoneOtp,
      findUnique: (args: any) => super.phoneOtp.findUnique(addSoftDeleteFilter(args)),
      findFirst: (args: any) => super.phoneOtp.findFirst(addSoftDeleteFilter(args)),
      findMany: (args?: any) => super.phoneOtp.findMany(addSoftDeleteFilter(args)),
      count: (args?: any) => super.phoneOtp.count(addSoftDeleteFilter(args)),
    } as any;
  }

  // @ts-ignore
  get project() {
    return {
      ...super.project,
      findUnique: (args: any) => super.project.findUnique(addSoftDeleteFilter(args)),
      findFirst: (args: any) => super.project.findFirst(addSoftDeleteFilter(args)),
      findMany: (args?: any) => super.project.findMany(addSoftDeleteFilter(args)),
      count: (args?: any) => super.project.count(addSoftDeleteFilter(args)),
    } as any;
  }

  // @ts-ignore
  get unit() {
    return {
      ...super.unit,
      findUnique: (args: any) => super.unit.findUnique(addSoftDeleteFilter(args)),
      findFirst: (args: any) => super.unit.findFirst(addSoftDeleteFilter(args)),
      findMany: (args?: any) => super.unit.findMany(addSoftDeleteFilter(args)),
      count: (args?: any) => super.unit.count(addSoftDeleteFilter(args)),
    } as any;
  }

  // @ts-ignore
  get shortlist() {
    return {
      ...super.shortlist,
      findUnique: (args: any) => super.shortlist.findUnique(addSoftDeleteFilter(args)),
      findFirst: (args: any) => super.shortlist.findFirst(addSoftDeleteFilter(args)),
      findMany: (args?: any) => super.shortlist.findMany(addSoftDeleteFilter(args)),
      count: (args?: any) => super.shortlist.count(addSoftDeleteFilter(args)),
    } as any;
  }

  // @ts-ignore
  get reservation() {
    return {
      ...super.reservation,
      findUnique: (args: any) => super.reservation.findUnique(addSoftDeleteFilter(args)),
      findFirst: (args: any) => super.reservation.findFirst(addSoftDeleteFilter(args)),
      findMany: (args?: any) => super.reservation.findMany(addSoftDeleteFilter(args)),
      count: (args?: any) => super.reservation.count(addSoftDeleteFilter(args)),
    } as any;
  }

  // @ts-ignore
  get activityLog() {
    return {
      ...super.activityLog,
      findUnique: (args: any) => super.activityLog.findUnique(addSoftDeleteFilter(args)),
      findFirst: (args: any) => super.activityLog.findFirst(addSoftDeleteFilter(args)),
      findMany: (args?: any) => super.activityLog.findMany(addSoftDeleteFilter(args)),
      count: (args?: any) => super.activityLog.count(addSoftDeleteFilter(args)),
    } as any;
  }

  // @ts-ignore
  get integration() {
    return {
      ...super.integration,
      findUnique: (args: any) => super.integration.findUnique(addSoftDeleteFilter(args)),
      findFirst: (args: any) => super.integration.findFirst(addSoftDeleteFilter(args)),
      findMany: (args?: any) => super.integration.findMany(addSoftDeleteFilter(args)),
      count: (args?: any) => super.integration.count(addSoftDeleteFilter(args)),
    } as any;
  }

  // Payment model doesn't have soft delete, so we can use it directly
  // @ts-ignore - Will be available after Prisma Client generation
  get payment() {
    return super.payment;
  }

  /**
   * Soft delete a record by setting isDeleted to true
   */
  async softDelete(model: string, where: any) {
    const modelName = model.charAt(0).toLowerCase() + model.slice(1);
    return (this as any)[modelName].update({
      where,
      data: { isDeleted: true },
    });
  }

  /**
   * Soft delete many records
   */
  async softDeleteMany(model: string, where: any) {
    const modelName = model.charAt(0).toLowerCase() + model.slice(1);
    return (this as any)[modelName].updateMany({
      where,
      data: { isDeleted: true },
    });
  }

  /**
   * Restore a soft deleted record
   */
  async restore(model: string, where: any) {
    const modelName = model.charAt(0).toLowerCase() + model.slice(1);
    return (this as any)[modelName].update({
      where,
      data: { isDeleted: false },
    });
  }

  /**
   * Find including deleted records (bypass soft delete filter)
   */
  async findWithDeleted(model: string, args?: any) {
    const modelName = model.charAt(0).toLowerCase() + model.slice(1);
    if (args?.where) {
      // Remove isDeleted filter if present
      delete args.where.isDeleted;
    }
    return (this as any)[modelName].findMany(args);
  }
}
