import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { StepCode } from '@prisma/client';

export class CreateRoleStepDto {
  @IsEnum(StepCode) code!: StepCode;
  @IsString() label!: string;
  @IsInt() @Min(0) order!: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) salary!: number;
  @IsInt() @Min(0) @IsOptional() minTenureMonths?: number;
  @IsInt() @Min(0) @IsOptional() minExperienceMonths?: number;
}

export class CreateRoleDto {
  @IsString() name!: string;
  @IsString() @IsOptional() description?: string;
  @IsString() teamId!: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => CreateRoleStepDto)
  steps!: CreateRoleStepDto[];
}
