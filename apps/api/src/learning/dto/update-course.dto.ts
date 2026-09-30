import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCourseDto {
  @IsString() @MinLength(2) @MaxLength(160) @IsOptional()
  title?: string;

  @IsString() @MaxLength(2000) @IsOptional()
  description?: string;

  @IsString() @MaxLength(1500000) @IsOptional()
  coverUrl?: string | null;

  @IsString() @IsOptional()
  qualificationId?: string;

  @IsBoolean() @IsOptional()
  active?: boolean;
}
