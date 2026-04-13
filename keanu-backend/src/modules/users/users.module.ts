import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../../common/services/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { GHLModule } from '../integrations/ghl/ghl.module';
import { AdminModule } from '../admin/admin.module';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';

@Module({
  imports: [AuthModule, GHLModule, CloudinaryModule, forwardRef(() => AdminModule)],
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
