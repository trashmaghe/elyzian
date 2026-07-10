import { Module } from '@nestjs/common';
import { GlpiService } from './glpi.service';

@Module({
  providers: [GlpiService],
  exports: [GlpiService],
})
export class GlpiModule {}
