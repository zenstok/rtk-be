import { Test, TestingModule } from '@nestjs/testing';
import { CustomerOfferService } from './customer-offer.service';

describe('CustomerOfferService', () => {
  let service: CustomerOfferService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomerOfferService],
    }).compile();

    service = module.get<CustomerOfferService>(CustomerOfferService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
