import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { MessagesModule } from '../messages/messages.module';
import { GlpiModule } from './glpi.module';
import { GlpiWebhookController } from './glpi-webhook.controller';

@Module({
  imports: [GlpiModule, ChatModule, MessagesModule],
  controllers: [GlpiWebhookController],
})
export class GlpiWebhookModule {}
