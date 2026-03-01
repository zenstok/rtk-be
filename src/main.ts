import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { CustomerOfferService } from './modules/customer-offer/customer-offer.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      forbidNonWhitelisted: true,
      whitelist: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('RTK API')
    .setDescription('The RTK API description')
    .setVersion('1.0')
    .addTag('rtk')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);

  app.get(CustomerOfferService).findAllProducts(1, { limit: 10, offset: 0 });
}
bootstrap();

// TODO AI sa faca
// update endpoint-uri logica price analysis (sa facem si cu filtre & search param sa faca bine)
// CRUD solicitari produse
// CRUD users
// CRUD clients & clients contact persons
// CRUD furnizori & furnizori contact persons
// TODO endpointuri ce tin de price analysis -> ce tin de oferta (vezi si rezervare produse) -> ce tin de comanda furnizor

// CRUD produse
// produse stats,
// tabel furnizori asociati produse
// tabel intrari stoc asociate produse
// tabel iesiri stoc asociate produse

// pentru fiecare price analysis supplier group avem o sectiune in care generam comanda furnizor
// la fiecare supplier_order row am camp cantitate comandata si cantitate a se rezerva din stocul curent

// when you create a supplier order, loop through all supplier order rows and then do a db tx which calculated how much reserved from stock quantity is taken from each product and then do product.reservedStock + SUM(from all supplier order rows where this product id exists)
// if product has total stock 15 of which 7 is free
// if in the supplier order I reserved 5 I will do product.reserved += 5 (meaning it will be only 2 free now)

// if I cancel a supplier order i rollback to product.reserved -= 5

// I can cancel an offer only if all supplier order rows are canceled
// flow -> I cancel all supplier order rows -> I can cancel an offer

// 12.02.2026
// iesire stoc pot sa fac din ecranul produsului NUMAI si NUMAI daca SN-ul vine dintr-o comanda furnizor simpla, iar SN-ul nici nu a fost rezervat la vreo oferta
// altfel iesire stoc fac numai si numai din ecranul ofertei
// IESIRI STOC se fac din 2 locuri
// IESIRI STOC SE FAC DIN ECRANUL OFERTEI (daca sunt din comenzi furnizor rezervate)
// IESIRI STOC SE FAC DIN ECRANUL PRODUSULUI (daca sunt din comenzi furnizor simple)
