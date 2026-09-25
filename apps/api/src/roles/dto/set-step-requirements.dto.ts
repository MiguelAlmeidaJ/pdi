import { ArrayMinSize, IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class StepRequirementDto {
  @IsString() qualificationId!: string;
  @IsBoolean() @IsOptional() required?: boolean;
  @IsString() @IsOptional() notes?: string;
}

export class SetStepRequirementsDto {
  @IsArray() @ArrayMinSize(0) @ValidateNested({ each: true }) @Type(() => StepRequirementDto)
  requirements!: StepRequirementDto[];
}
