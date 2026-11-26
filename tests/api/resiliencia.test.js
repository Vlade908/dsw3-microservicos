import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createTestCluster } from './helpers/testCluster.js';

describe('Resiliência — Fallback de Cache, Modo Síncrono Estrito (503) e Store-and-Forward', () => {
  const cluster = createTestCluster(4320);
  let produto;

  beforeAll(async () => {
    await cluster.startAll();

    const res = await fetch(`${cluster.urls.produtos}/produtos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Mouse Wireless 4K',
        preco: 290.0,
        descricao: 'Sensor PixArt',
        estoque: 10
      })
    });
    expect(res.status).toBe(201);
    produto = await res.json();

    // Garante que o cache replicado no ms-pedidos recebeu PRODUTO_CRIADO
    await cluster.sleep(1000);
  });

  afterAll(async () => {
    await cluster.stopAll();
  });

  test('Com ms-produtos offline: X-Sync-Strict retorna 503; fallback aprova pedido e reconcilia estoque uma única vez ao voltar', async () => {
    await cluster.stopService('ms-produtos');

    const strictRes = await fetch(`${cluster.urls.pedidos}/pedidos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Strict': 'true'
      },
      body: JSON.stringify({ produtoId: produto.id, quantidade: 2 })
    });
    expect(strictRes.status).toBe(503);

    const fallbackRes = await fetch(`${cluster.urls.pedidos}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produtoId: produto.id, quantidade: 2 })
    });
    const fallbackPedido = await fallbackRes.json();

    expect(fallbackRes.status).toBe(201);
    expect(fallbackRes.headers.get('x-validation-mode')).toBe('cache-fallback');
    expect(fallbackPedido.status).toBe('REALIZADO');

    // Religa ms-produtos e valida reconciliação única (10 - 2 = 8)
    await cluster.startService('ms-produtos');

    await cluster.waitUntil(async () => {
      const pRes = await fetch(`${cluster.urls.produtos}/produtos/${produto.id}`);
      if (!pRes.ok) return false;
      const p = await pRes.json();
      return p.estoque === 8;
    }, 15000);

    await cluster.sleep(2800);

    const prodFinal = await (await fetch(`${cluster.urls.produtos}/produtos/${produto.id}`)).json();
    const qryProdFinal = await (await fetch(`${cluster.urls.query}/query/produtos/${produto.id}`)).json();
    expect(prodFinal.estoque).toBe(8);
    expect(qryProdFinal.estoque).toBe(8);
  });

  test('Com ms-pedidos offline: Store-and-Forward via Event Broker drena comando e preserva idempotência de estoque', async () => {
    await cluster.stopService('ms-pedidos');

    const cmdPedidoId = '22222222-3333-4444-8555-666666666666';
    const pubRes = await fetch(`${cluster.urls.broker}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'pedidos',
        event: 'PEDIDO_CRIAR_COMANDO',
        payload: {
          id: cmdPedidoId,
          pedidoId: cmdPedidoId,
          produtoId: produto.id,
          nomeProduto: produto.nome,
          precoUnitario: 290.0,
          quantidade: 3,
          valorTotal: 870.0,
          dataPedido: new Date().toISOString(),
          status: 'REALIZADO',
          estoqueJaAtualizado: false
        }
      })
    });
    expect(pubRes.status).toBe(202);

    // Enquanto ms-pedidos está offline, ms-produtos baixa para 5 e ms-query já indexa o pedido
    await cluster.waitUntil(async () => {
      const [pRes, qRes] = await Promise.all([
        fetch(`${cluster.urls.produtos}/produtos/${produto.id}`),
        fetch(`${cluster.urls.query}/query/pedidos/${cmdPedidoId}`)
      ]);
      if (!pRes.ok || !qRes.ok) return false;
      const p = await pRes.json();
      const q = await qRes.json();
      return p.estoque === 5 && q.nomeProduto === produto.nome;
    }, 15000);

    // Religa ms-pedidos e confirma persistência no SQLite sem dupla baixa no estoque
    await cluster.startService('ms-pedidos');

    await cluster.waitUntil(async () => {
      const pedRes = await fetch(`${cluster.urls.pedidos}/pedidos/${cmdPedidoId}`);
      return pedRes.ok;
    }, 15000);

    await cluster.sleep(2800);

    const pedPersistido = await (
      await fetch(`${cluster.urls.pedidos}/pedidos/${cmdPedidoId}`)
    ).json();
    const prodFinal = await (await fetch(`${cluster.urls.produtos}/produtos/${produto.id}`)).json();
    const qryProdFinal = await (
      await fetch(`${cluster.urls.query}/query/produtos/${produto.id}`)
    ).json();

    expect(pedPersistido.nomeProduto).toBe('Mouse Wireless 4K');
    expect(pedPersistido.status).toBe('REALIZADO');
    expect(prodFinal.estoque).toBe(5);
    expect(qryProdFinal.estoque).toBe(5);
  });
});
