import { IsOptional, IsString, IsUrl } from 'class-validator';

export class SubmitQualificationDto {
  @IsUrl()
  evidenceUrl!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
