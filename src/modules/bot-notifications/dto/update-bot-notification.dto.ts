import { PartialType } from '@nestjs/swagger';
import { CreateBotNotificationDto } from './create-bot-notification.dto';

export class UpdateBotNotificationDto extends PartialType(CreateBotNotificationDto) {}
