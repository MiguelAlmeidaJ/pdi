import { Type } from 'class-transformer';
import { CourseDelivery, CourseModality, QualificationType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, Min, MinLength, ValidateNested } from 'class-validator';

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
  @IsInt() @Min(1) @IsOptional() requiredMonths?: number;
  @IsEnum(CourseModality) @IsOptional() courseModality?: CourseModality;
  @IsEnum(CourseDelivery) @IsOptional() courseDelivery?: CourseDelivery;
  @IsString() @IsOptional() courseInstructions?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateQualificationLinkDto)
  @IsOptional()
  links?: UpdateQualificationLinkDto[];
}
