import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCourseDto {
  @IsString() @MinLength(2) @MaxLength(160)
  title!: string;

  @IsString() @IsOptional() @MaxLength(2000)
  description?: string;

  @IsString() @IsOptional() @MaxLength(1500000)
  coverUrl?: string;

  @IsString()
  qualificationId!: string;
}
