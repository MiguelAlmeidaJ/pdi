import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateCourseModuleDto {
  @IsString() @MinLength(2) @MaxLength(160) @IsOptional()
  title?: string;

  @IsString() @MaxLength(1000) @IsOptional()
  description?: string;

  @IsInt() @Min(0) @IsOptional()
  order?: number;

  @IsBoolean() @IsOptional()
  active?: boolean;
}
