import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerOfferDto } from './create-customer-offer.dto';

export class UpdateCustomerOfferDto extends PartialType(CreateCustomerOfferDto) {}
