import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

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

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
// TODO endpointuri ce tin de price analysis -> ce tin de oferta (vezi si rezervare produse) -> ce tin de comanda furnizor

// dupa ce rafinez campurile de baza
// vad care pe unde am fisiere atasabile
// fac file module
// fac fk catre file unde pun fisiere

// mai exista un status validata dupa cel de generata, cat timp e generata se pot modifica valorile din comanda furnizor la PRET (nu si la cantitate)
// daca am nevoie sa modific si cantitatea ca am rezervat din stoc neasociat prea mult, atunci anulez comanda cu totul si o refac

// pentru fiecare price analysis supplier group avem o sectiune in care generam comanda furnizor
// la fiecare supplier_order row am camp cantitate comandata si cantitate a se rezerva din stocul curent

// when you create a supplier order, loop through all supplier order rows and then do a db tx which calculated how much reserved from stock quantity is taken from each product and then do product.reservedStock + SUM(from all supplier order rows where this product id exists)
// if product has total stock 15 of which 7 is free
// if in the supplier order I reserved 5 I will do product.reserved += 5 (meaning it will be only 2 free now)

// if I cancel a supplier order i rollback to product.reserved -= 5

// I can cancel an offer only if all supplier order rows are canceled
// flow -> I cancel all supplier order rows -> I can cancel an offer
