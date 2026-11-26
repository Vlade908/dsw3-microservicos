import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createTestCluster } from './helpers/testCluster.js';

describe('ms-produtos — CRUD e Validações de Catálogo', () => {
  const cluster = createTestCluster(4300);
  let produtoCriadoId;

  beforeAll(async () => {
    await cluster.startAll();
  });

  afterAll(async () => {
    await cluster.stopAll();
  });

  test('GET /health retorna status UP', async () => {
    const res = await fetch(`${cluster.urls.produtos}/health`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('UP');
    expect(body.service).toBe('ms-produtos');
  });

  test('POST /produtos cadastra produto com imagemUrl opcional (201)', async () => {
    const res = await fetch(`${cluster.urls.produtos}/produtos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Monitor VERO 27 QHD',
        preco: 1890.5,
        descricao: 'Painel IPS 165Hz 1ms',
        imagemUrl: 'https://exemplo.com/monitor.png',
        estoque: 12
      })
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBeTruthy();
    expect(body.nome).toBe('Monitor VERO 27 QHD');
    expect(body.preco).toBe(1890.5);
    expect(body.imagemUrl).toBe('https://exemplo.com/monitor.png');
    expect(body.estoque).toBe(12);

    produtoCriadoId = body.id;
  });

  test('POST /produtos rejeita payloads inválidos com HTTP 400', async () => {
    const invalids = [
      { nome: '   ', preco: 100, estoque: 5 },
      { nome: 'Sem Preço Negativo', preco: -10, estoque: 5 },
      { nome: 'Estoque Decimal', preco: 100, estoque: 1.5 },
      { nome: 'Estoque Negativo', preco: 100, estoque: -1 }
    ];

    for (const payload of invalids) {
      const res = await fetch(`${cluster.urls.produtos}/produtos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      expect(res.status).toBe(400);
    }
  });

  test('GET /produtos e GET /produtos/:id retornam o catálogo e tratam 404', async () => {
    const listRes = await fetch(`${cluster.urls.produtos}/produtos`);
    const list = await listRes.json();

    expect(listRes.status).toBe(200);
    expect(Array.isArray(list)).toBe(true);
    expect(list.some((p) => p.id === produtoCriadoId)).toBe(true);

    const detailRes = await fetch(`${cluster.urls.produtos}/produtos/${produtoCriadoId}`);
    const detail = await detailRes.json();
    expect(detailRes.status).toBe(200);
    expect(detail.nome).toBe('Monitor VERO 27 QHD');

    const notFoundRes = await fetch(
      `${cluster.urls.produtos}/produtos/00000000-0000-4000-8000-000000000000`
    );
    expect(notFoundRes.status).toBe(404);
  });

  test('PUT /produtos/:id atualiza dados e retorna 404 para UUID inexistente', async () => {
    const updateRes = await fetch(`${cluster.urls.produtos}/produtos/${produtoCriadoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Monitor VERO 27 QHD Pro',
        preco: 1999.0,
        descricao: 'Painel IPS calibrado',
        estoque: 15
      })
    });
    const updated = await updateRes.json();

    expect(updateRes.status).toBe(200);
    expect(updated.nome).toBe('Monitor VERO 27 QHD Pro');
    expect(updated.preco).toBe(1999.0);
    expect(updated.estoque).toBe(15);

    const notFoundRes = await fetch(
      `${cluster.urls.produtos}/produtos/00000000-0000-4000-8000-000000000000`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'X', preco: 10, estoque: 1 })
      }
    );
    expect(notFoundRes.status).toBe(404);
  });

  test('DELETE /produtos/:id remove produto e subsequente GET retorna 404', async () => {
    const delRes = await fetch(`${cluster.urls.produtos}/produtos/${produtoCriadoId}`, {
      method: 'DELETE'
    });
    expect(delRes.status).toBe(200);

    const getAfterDel = await fetch(`${cluster.urls.produtos}/produtos/${produtoCriadoId}`);
    expect(getAfterDel.status).toBe(404);
  });
});
