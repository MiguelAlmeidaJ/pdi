import { Module } from '@nestjs/common';
import { QualificationsController } from './qualifications.controller';
import { QualificationsService } from './qualifications.service';

@Module({ controllers: [QualificationsController], providers: [QualificationsService] })
export class QualificationsModule {}
