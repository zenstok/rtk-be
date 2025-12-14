import { Injectable } from '@nestjs/common';
import { CreateCustomerOfferDto } from './dto/create-customer-offer.dto';
import { UpdateCustomerOfferDto } from './dto/update-customer-offer.dto';

@Injectable()
export class CustomerOfferService {
  create(createCustomerOfferDto: CreateCustomerOfferDto) {
    return 'This action adds a new customerOffer';
  }

  findAll() {
    return `This action returns all customerOffer`;
  }

  findOne(id: number) {
    return `This action returns a #${id} customerOffer`;
  }

  update(id: number, updateCustomerOfferDto: UpdateCustomerOfferDto) {
    return `This action updates a #${id} customerOffer`;
  }

  remove(id: number) {
    return `This action removes a #${id} customerOffer`;
  }
}
