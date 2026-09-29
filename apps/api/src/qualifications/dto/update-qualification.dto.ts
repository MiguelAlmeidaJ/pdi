import { Type } from 'class-transformer';
import { QualificationType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, IsUrl, MinLength, ValidateNested } from 'class-validator';

export class UpdateQualificationLinkDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsUrl()
  url!: string;
}

export class UpdateQualificationDto {
  @IsString() @MinLength(2) @IsOptional() name?: string;
  @IsEnum(QualificationType) @IsOptional() type?: QualificationType;
  @IsString() @IsOptional() description?: string;
  @IsBoolean() @IsOptional() active?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateQualificationLinkDto)
  @IsOptional()
  links?: UpdateQualificationLinkDto[];
}
