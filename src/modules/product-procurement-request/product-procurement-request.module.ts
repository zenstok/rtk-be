import { Module } from '@nestjs/common';
import { ProductProcurementRequestService } from './product-procurement-request.service';
import { ProductProcurementRequestController } from './product-procurement-request.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductProcurementRequest } from './entities/product-procurement-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductProcurementRequest])],
  controllers: [ProductProcurementRequestController],
  providers: [ProductProcurementRequestService],
})
export class ProductProcurementRequestModule {}
