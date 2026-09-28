import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const PRODUTOS_INICIAIS = [
  {
    nome: 'Monitor Gamer 27" 165Hz IPS',
    preco: 1299.90,
    descricao: 'Monitor Full HD com taxa de atualização de 165Hz, 1ms e FreeSync Premium.',
    estoque: 12
  },
  {
    nome: 'Teclado Mecânico RGB Hot-Swap',
    preco: 349.00,
    descricao: 'Switches lineares, layout ABNT2, conexão USB-C removível e iluminação RGB.',
    estoque: 20
  },
  {
    nome: 'Mouse Sem Fio 26.000 DPI',
    preco: 289.50,
    descricao: 'Sensor óptico de alta precisão, peso ultraleve de 54g e bateria de 80h.',
    estoque: 15
  },
  {
    nome: 'Headset Gamer 7.1 Surround',
    preco: 420.00,
    descricao: 'Drivers de 50mm de neodímio, microfone retrátil com cancelamento de ruído.',
    estoque: 8
  },
  {
    nome: 'Mousepad Extra Grande 90x40cm',
    preco: 79.90,
    descricao: 'Superfície Speed em tecido micro-entrelaçado com bordas costuradas.',
    estoque: 30
  }
];

async function main() {
  console.log('[Seed ms-produtos] Iniciando população de produtos de exemplo...');

  for (const produto of PRODUTOS_INICIAIS) {
    const criado = await prisma.produto.create({
      data: produto
    });
    console.log(`[Seed ms-produtos] Produto criado: "${criado.nome}" (Estoque: ${criado.estoque}, Preço: R$ ${criado.preco})`);
  }

  console.log('[Seed ms-produtos] Catálogo inicial populado com sucesso!');
}

main()
  .catch((e) => {
    console.error('[Seed ms-produtos] Erro durante seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
