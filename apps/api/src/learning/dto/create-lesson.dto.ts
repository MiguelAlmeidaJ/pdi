import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateCourseLessonDto {
  @IsString() @MinLength(2) @MaxLength(180)
  title!: string;

  @IsString() @MaxLength(1500) @IsOptional()
  description?: string;

  @IsInt() @Min(0) @IsOptional()
  order?: number;

  @IsInt() @Min(80) @Max(100) @IsOptional()
  minCompletionPercent?: number;
}
