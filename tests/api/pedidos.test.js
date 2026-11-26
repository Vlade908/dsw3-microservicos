import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createTestCluster } from './helpers/testCluster.js';

describe('ms-pedidos — Fluxo Síncrono, Snapshot Pattern e Cancelamento', () => {
  const cluster = createTestCluster(4310);
  let produto;
  let pedidoId;

  beforeAll(async () => {
    await cluster.startAll();

    const res = await fetch(`${cluster.urls.produtos}/produtos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Teclado Mecânico 75%',
        preco: 350.0,
        descricao: 'Switch Linear Hot-Swap',
        estoque: 10
      })
    });
    expect(res.status).toBe(201);
    produto = await res.json();

    await cluster.sleep(800);
  });

  afterAll(async () => {
    await cluster.stopAll();
  });

  test('POST /pedidos valida estoque via HTTP síncrono, aplica Snapshot e não duplica baixa no Broker', async () => {
    const res = await fetch(`${cluster.urls.pedidos}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produtoId: produto.id, quantidade: 2 })
    });
    const pedido = await res.json();

    expect(res.status).toBe(201);
    expect(res.headers.get('x-validation-mode')).toBe('sync-http');
    expect(pedido.status).toBe('REALIZADO');
    expect(pedido.nomeProduto).toBe('Teclado Mecânico 75%');
    expect(pedido.precoUnitario).toBe(350.0);
    expect(pedido.valorTotal).toBe(700.0);

    pedidoId = pedido.id;

    // Aguarda projeção no ms-query e garante ciclo completo do broker sem dupla baixa
    await cluster.waitUntil(async () => {
      const qRes = await fetch(`${cluster.urls.query}/query/pedidos/${pedidoId}`);
      if (!qRes.ok) return false;
      const qPed = await qRes.json();
      return qPed.nomeProduto === 'Teclado Mecânico 75%';
    });
    await cluster.sleep(2800);

    const prodAfter = await (await fetch(`${cluster.urls.produtos}/produtos/${produto.id}`)).json();
    const qProdAfter = await (await fetch(`${cluster.urls.query}/query/produtos/${produto.id}`)).json();

    expect(prodAfter.estoque).toBe(8);
    expect(qProdAfter.estoque).toBe(8);
  });

  test('Snapshot Pattern mantém nome e preço originais do pedido após alteração no catálogo', async () => {
    const putRes = await fetch(`${cluster.urls.produtos}/produtos/${produto.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Teclado Mecânico 75% V2 (Reajustado)',
        preco: 520.0,
        descricao: 'Nova versão',
        estoque: 8
      })
    });
    expect(putRes.status).toBe(200);

    const pedidoRes = await fetch(`${cluster.urls.pedidos}/pedidos/${pedidoId}`);
    const pedido = await pedidoRes.json();

    expect(pedidoRes.status).toBe(200);
    expect(pedido.nomeProduto).toBe('Teclado Mecânico 75%');
    expect(pedido.precoUnitario).toBe(350.0);
    expect(pedido.valorTotal).toBe(700.0);
  });

  test('POST /pedidos retorna 400 para quantidade inválida/insuficiente e 404 para produto inexistente', async () => {
    const estInsuf = await fetch(`${cluster.urls.pedidos}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produtoId: produto.id, quantidade: 999 })
    });
    expect(estInsuf.status).toBe(400);

    const qtdInvalida = await fetch(`${cluster.urls.pedidos}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produtoId: produto.id, quantidade: 0 })
    });
    expect(qtdInvalida.status).toBe(400);

    const prodInexistente = await fetch(`${cluster.urls.pedidos}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        produtoId: '00000000-0000-4000-8000-000000000000',
        quantidade: 1
      })
    });
    expect(prodInexistente.status).toBe(404);
  });

  test('PATCH /pedidos/:id/cancelar altera status para CANCELADO, estorna estoque uma única vez e bloqueia recancelamento', async () => {
    const cancelRes = await fetch(`${cluster.urls.pedidos}/pedidos/${pedidoId}/cancelar`, {
      method: 'PATCH'
    });
    const pedidoCancelado = await cancelRes.json();

    expect(cancelRes.status).toBe(200);
    expect(pedidoCancelado.status).toBe('CANCELADO');

    await cluster.waitUntil(async () => {
      const qRes = await fetch(`${cluster.urls.query}/query/pedidos/${pedidoId}`);
      if (!qRes.ok) return false;
      const qPed = await qRes.json();
      return qPed.status === 'CANCELADO';
    });
    await cluster.sleep(2800);

    const prodAfter = await (await fetch(`${cluster.urls.produtos}/produtos/${produto.id}`)).json();
    const qProdAfter = await (await fetch(`${cluster.urls.query}/query/produtos/${produto.id}`)).json();

    expect(prodAfter.estoque).toBe(10);
    expect(qProdAfter.estoque).toBe(10);

    const secondCancel = await fetch(`${cluster.urls.pedidos}/pedidos/${pedidoId}/cancelar`, {
      method: 'PATCH'
    });
    expect(secondCancel.status).toBe(400);
  });
});
