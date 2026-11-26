import { Type } from 'class-transformer';
import { CourseDelivery, CourseModality, QualificationType } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUrl, Min, MinLength, ValidateNested } from 'class-validator';

export class QualificationLinkDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsUrl()
  url!: string;
}

export class CreateQualificationDto {
  @IsString() @IsOptional() teamId?: string;
  @IsString() @MinLength(2) name!: string;
  @IsEnum(QualificationType) type!: QualificationType;
  @IsString() @IsOptional() description?: string;
  @IsInt() @Min(1) @IsOptional() requiredMonths?: number;
  @IsEnum(CourseModality) @IsOptional() courseModality?: CourseModality;
  @IsEnum(CourseDelivery) @IsOptional() courseDelivery?: CourseDelivery;
  @IsString() @IsOptional() courseInstructions?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QualificationLinkDto)
  @IsOptional()
  links?: QualificationLinkDto[];
}
