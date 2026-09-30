import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateVisualIdentityDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @IsOptional()
  appName?: string;

  @IsString()
  @MaxLength(160)
  @IsOptional()
  tagline?: string;

  @IsString()
  @MaxLength(1500000)
  @IsOptional()
  logoLight?: string | null;

  @IsString()
  @MaxLength(1500000)
  @IsOptional()
  logoDark?: string | null;

  @IsString()
  @MaxLength(1500000)
  @IsOptional()
  iconLight?: string | null;

  @IsString()
  @MaxLength(1500000)
  @IsOptional()
  iconDark?: string | null;
}
