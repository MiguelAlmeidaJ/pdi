import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { DevelopmentService } from './development.service';
import { UserQualificationsService } from './user-qualifications.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, DevelopmentService, UserQualificationsService],
})
export class UsersModule {}
