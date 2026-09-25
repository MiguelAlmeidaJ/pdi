import { QualificationType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateQualificationDto {
  @IsString() teamId!: string;
  @IsString() @MinLength(2) name!: string;
  @IsEnum(QualificationType) type!: QualificationType;
  @IsString() @IsOptional() description?: string;
  @IsUrl() @IsOptional() referenceUrl?: string;
}
