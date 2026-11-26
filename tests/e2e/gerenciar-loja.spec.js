import { test, expect } from '@playwright/test';

const PRODUTOS_API = 'http://localhost:3001/produtos';

test.describe('Gerenciar Loja — CRUD com Pré-visualização de Imagem Adaptativa', () => {
  const uniqueName = `[E2E] Webcam Vertical ${Date.now()}`;

  test.afterAll(async ({ request }) => {
    try {
      const res = await request.get(PRODUTOS_API);
      if (res.ok()) {
        const list = await res.json();
        for (const p of list) {
          if (typeof p.nome === 'string' && p.nome.startsWith('[E2E] Webcam Vertical')) {
            await request.delete(`${PRODUTOS_API}/${p.id}`);
          }
        }
      }
    } catch {}
  });

  test('cadastra com preview adaptativo Retrato, edita preço e exclui pelo modal', async ({
    page
  }) => {
    const verticalSvgUrl =
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="500"><rect width="300" height="500" fill="#0071e3"/></svg>'
      );

    await page.goto('/');

    const mainNav = page.getByRole('navigation', { name: 'Navegação principal' });
    await mainNav.getByRole('button', { name: 'Gerenciar Loja' }).click();

    await page.getByRole('button', { name: 'Novo Produto' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.locator('#prod-name').fill(uniqueName);
    await dialog.locator('#prod-price').fill('499.90');
    await dialog.locator('#prod-stock').fill('12');
    await dialog.locator('#prod-desc').fill('Produto criado via Playwright E2E');
    await dialog.locator('#prod-img').fill(verticalSvgUrl);

    // Pré-visualização reconhece proporção Retrato e ativa Enquadramento adaptativo
    await expect(dialog.getByText('Pré-visualização da vitrine')).toBeVisible();
    await expect(dialog.getByText('300×500px')).toBeVisible();
    await expect(dialog.getByText('Retrato')).toBeVisible();
    await expect(dialog.getByText('Enquadramento adaptativo')).toBeVisible();

    await dialog.locator('button[type="submit"]').click();
    await expect(dialog).toBeHidden({ timeout: 10000 });

    // Localiza o produto cadastrado na listagem administrativa
    const itemCard = page.locator('article', { hasText: uniqueName });
    await expect(itemCard).toBeVisible({ timeout: 10000 });
    await expect(itemCard).toContainText('R$ 499,90');

    // Edita o preço
    await itemCard.getByRole('button', { name: 'Editar' }).click();
    await expect(dialog).toBeVisible();
    await dialog.locator('#prod-price').fill('549.90');
    await dialog.locator('button[type="submit"]').click();
    await expect(dialog).toBeHidden({ timeout: 10000 });

    await expect(itemCard).toContainText('R$ 549,90');

    // Exclui pelo modal de confirmação
    await page.getByRole('button', { name: `Excluir ${uniqueName}` }).click();
    const confirmModal = page.getByRole('dialog');
    await expect(confirmModal).toBeVisible();
    await confirmModal.getByRole('button', { name: 'Excluir Produto' }).click();

    await expect(page.locator('article', { hasText: uniqueName })).toHaveCount(0, {
      timeout: 10000
    });
  });
});
