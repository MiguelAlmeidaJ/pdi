import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class ChangeCareerStepDto {
  @IsString()
  targetRoleStepId!: string;

  @IsString()
  @MinLength(5)
  reason!: string;

  @IsDateString()
  @IsOptional()
  effectiveAt?: string;
}
