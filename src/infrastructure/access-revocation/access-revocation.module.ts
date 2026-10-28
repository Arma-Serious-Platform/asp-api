import { Global, Module } from '@nestjs/common';
import { AccessRevocationService } from './access-revocation.service';

@Global()
@Module({
  providers: [AccessRevocationService],
  exports: [AccessRevocationService],
})
export class AccessRevocationModule {}
