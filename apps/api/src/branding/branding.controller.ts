import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { BrandingService } from './branding.service';
import { UpdateVisualIdentityDto } from './dto/update-visual-identity.dto';

@ApiTags('branding')
@Controller('branding')
export class BrandingController {
  constructor(private readonly branding: BrandingService) {}

  @Public()
  @Get('visual-identity')
  getVisualIdentity() {
    return this.branding.getVisualIdentity();
  }

  @ApiBearerAuth()
  @Roles(SystemRole.ADMIN)
  @Put('visual-identity')
  updateVisualIdentity(@Body() dto: UpdateVisualIdentityDto) {
    return this.branding.updateVisualIdentity(dto);
  }
}
