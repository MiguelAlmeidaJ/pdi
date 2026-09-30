import { IsBoolean, IsNumber, Max, Min } from 'class-validator';

export class LessonHeartbeatDto {
  @IsNumber() @Min(0)
  position!: number;

  @IsBoolean()
  playing!: boolean;

  @IsBoolean()
  visible!: boolean;

  @IsNumber() @Min(0.25) @Max(4)
  playbackRate!: number;
}
