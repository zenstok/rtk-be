import { Test, TestingModule } from '@nestjs/testing';
import { CustomerOfferController } from './customer-offer.controller';
import { CustomerOfferService } from './customer-offer.service';

describe('CustomerOfferController', () => {
  let controller: CustomerOfferController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerOfferController],
      providers: [CustomerOfferService],
    }).compile();

    controller = module.get<CustomerOfferController>(CustomerOfferController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
