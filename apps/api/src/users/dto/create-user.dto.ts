import { SystemRole } from '@prisma/client';
import { IsDateString, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString() name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsEnum(SystemRole) @IsOptional() systemRole?: SystemRole;
  @IsDateString() hiredAt!: string;
  @IsDateString() @IsOptional() professionalSince?: string;
  @IsString() teamId!: string;
  @IsString() @IsOptional() roleId?: string;
  @IsString() @IsOptional() currentRoleStepId?: string;
  @IsString() @IsOptional() managerId?: string;
}
