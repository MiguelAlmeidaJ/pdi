import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateCourseModuleDto {
  @IsString() @MinLength(2) @MaxLength(160)
  title!: string;

  @IsString() @MaxLength(1000) @IsOptional()
  description?: string;

  @IsInt() @Min(0) @IsOptional()
  order?: number;
}
