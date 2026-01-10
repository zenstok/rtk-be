import { Module } from '@nestjs/common';
import { BnrApiService } from './bnr-api.service';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BnrApiHistory } from './entities/bnr-api-history.entity';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([BnrApiHistory])],
  providers: [BnrApiService],
  exports: [BnrApiService],
})
export class BnrApiModule {}
