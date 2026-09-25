import { QualificationStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

export class SetUserQualificationDto {
  @IsEnum(QualificationStatus)
  status!: QualificationStatus;

  @IsDateString()
  @IsOptional()
  completedAt?: string;

  @IsUrl()
  @IsOptional()
  evidenceUrl?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
