import { QualificationType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class UpdateQualificationDto {
  @IsString() @MinLength(2) @IsOptional() name?: string;
  @IsEnum(QualificationType) @IsOptional() type?: QualificationType;
  @IsString() @IsOptional() description?: string;
  @IsUrl() @IsOptional() referenceUrl?: string;
  @IsBoolean() @IsOptional() active?: boolean;
}
