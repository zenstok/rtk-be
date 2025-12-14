import { Module } from '@nestjs/common';
import { CustomerOfferService } from './customer-offer.service';
import { CustomerOfferController } from './customer-offer.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerOffer } from './entities/customer-offer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerOffer])],
  controllers: [CustomerOfferController],
  providers: [CustomerOfferService],
})
export class CustomerOfferModule {}
