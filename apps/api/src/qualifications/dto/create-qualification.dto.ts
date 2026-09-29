import { Type } from 'class-transformer';
import { QualificationType } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, IsUrl, MinLength, ValidateNested } from 'class-validator';

export class QualificationLinkDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsUrl()
  url!: string;
}

export class CreateQualificationDto {
  @IsString() teamId!: string;
  @IsString() @MinLength(2) name!: string;
  @IsEnum(QualificationType) type!: QualificationType;
  @IsString() @IsOptional() description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QualificationLinkDto)
  @IsOptional()
  links?: QualificationLinkDto[];
}
