import { test, expect } from '@playwright/test';

const PRODUTOS_API = 'http://localhost:3001/produtos';

test.describe('Fluxo Completo de Compra e Cancelamento na UI', () => {
  let createdProduct;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(PRODUTOS_API, {
      data: {
        nome: `[E2E] Headset Teste ${Date.now()}`,
        preco: 450.0,
        descricao: 'Item temporário para validação E2E de compra e estorno',
        estoque: 5
      }
    });
    expect(res.status()).toBe(201);
    createdProduct = await res.json();
  });

  test.afterAll(async ({ request }) => {
    if (createdProduct?.id) {
      await request.delete(`${PRODUTOS_API}/${createdProduct.id}`).catch(() => {});
    }
  });

  test('compra na vitrine, limpa checkout após confirmação, cancela em Meus Pedidos e estorna estoque', async ({
    page,
    request
  }) => {
    await page.goto('/');

    // Filtra pelo produto de teste usando a busca inline
    await page.getByRole('button', { name: 'Buscar produtos' }).click();
    await page
      .getByRole('textbox', { name: 'Buscar produtos cadastrados' })
      .fill(createdProduct.nome);

    const card = page.locator('#vitrine-catalogo article', { hasText: createdProduct.nome });
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.getByRole('button', { name: 'Comprar' }).click();

    // No Checkout com o item pré-selecionado, finaliza a compra
    const submitBtn = page.getByRole('button', { name: /Finalizar Pedido/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Recibo de sucesso aparece e a seleção do checkout volta a ficar vazia
    await expect(
      page.getByRole('heading', { name: 'Pedido Confirmado', exact: true })
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Nenhum item no checkout' })).toBeVisible();

    // Fecha a busca inline no header para restaurar a navegação principal e acessa Meus Pedidos
    await page.getByRole('button', { name: 'Fechar busca' }).click();
    const mainNav = page.getByRole('navigation', { name: 'Navegação principal' });
    await mainNav.getByRole('button', { name: 'Meus Pedidos' }).click();

    const orderCard = page.locator('article', { hasText: createdProduct.nome }).first();
    await expect(orderCard).toBeVisible({ timeout: 10000 });
    await expect(orderCard).toContainText('REALIZADO');
    await expect(orderCard).toContainText('Snapshot Imutável');

    await orderCard.getByRole('button', { name: 'Cancelar pedido' }).click();
    const cancelDialog = page.getByRole('dialog', { name: 'Confirmar cancelamento do pedido' });
    await expect(cancelDialog).toBeVisible();
    await cancelDialog.getByRole('button', { name: 'Confirmar Cancelamento' }).click();

    await expect(orderCard).toContainText('CANCELADO', { timeout: 10000 });

    // Valida que o estoque foi recomposto para 5 no ms-produtos
    await expect
      .poll(
        async () => {
          const prodRes = await request.get(`${PRODUTOS_API}/${createdProduct.id}`);
          const prod = await prodRes.json();
          return prod.estoque;
        },
        { timeout: 10000 }
      )
      .toBe(5);
  });
});
