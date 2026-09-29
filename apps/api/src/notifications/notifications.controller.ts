import { Controller, Get, Param, Put, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';

type AuthenticatedRequest = {
  user: { sub: string };
};

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  findAll(
    @Request() request: AuthenticatedRequest,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notifications.findAll(request.user.sub, unreadOnly === 'true');
  }

  @Get('unread-count')
  unreadCount(@Request() request: AuthenticatedRequest) {
    return this.notifications.unreadCount(request.user.sub);
  }

  @Put('read-all')
  markAllRead(@Request() request: AuthenticatedRequest) {
    return this.notifications.markAllRead(request.user.sub);
  }

  @Put(':id/read')
  markRead(@Param('id') id: string, @Request() request: AuthenticatedRequest) {
    return this.notifications.markRead(request.user.sub, id);
  }
}
