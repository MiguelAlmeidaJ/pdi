import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class UpdateRoleStepDto {
  @IsString() id!: string;
  @IsString() label!: string;
  @IsInt() @Min(0) order!: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) salary!: number;
  @IsInt() @Min(0) @IsOptional() minTenureMonths?: number;
  @IsInt() @Min(0) @IsOptional() minExperienceMonths?: number;
  @IsInt() @Min(0) @IsOptional() minMonthsInCurrentStep?: number;
}

export class UpdateRoleDto {
  @IsString() name!: string;
  @IsString() @IsOptional() description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateRoleStepDto)
  steps!: UpdateRoleStepDto[];
}
