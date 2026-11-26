import { IsDateString, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString() @MinLength(2) @IsOptional() name?: string;
  @IsEmail() @IsOptional() email?: string;
  @IsDateString() @IsOptional() hiredAt?: string | null;
  @IsDateString() @IsOptional() professionalSince?: string | null;
  @IsString() @IsOptional() teamId?: string;
  @IsString() @IsOptional() roleId?: string | null;
  @IsString() @IsOptional() currentRoleStepId?: string | null;
  @IsDateString() @IsOptional() currentRoleStepStartedAt?: string | null;
  @IsString() @IsOptional() managerId?: string | null;
}
