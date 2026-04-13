import { Module } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { CurrencyGateway } from './currency.gateway';

@Module({
  providers: [CurrencyService, CurrencyGateway],
  exports: [CurrencyService],
})
export class CurrencyModule {}
