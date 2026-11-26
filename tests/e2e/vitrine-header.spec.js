import { test, expect } from '@playwright/test';

test.describe('Vitrine e Header Editorial VERO Store', () => {
  test('exibe header editorial, busca inline com Escape, fundo branco nas fotos e popover dos 4 serviços', async ({
    page
  }) => {
    await page.goto('/');

    // Header editorial VERO STORE e navegação principal sem contadores/ícones redundantes
    const header = page.locator('header');
    await expect(header.getByRole('button', { name: /VERO Store/i })).toBeVisible();

    const mainNav = page.getByRole('navigation', { name: 'Navegação principal' });
    await expect(mainNav.getByRole('button', { name: 'Vitrine' })).toBeVisible();
    await expect(mainNav.getByRole('button', { name: 'Meus Pedidos' })).toBeVisible();
    await expect(mainNav.getByRole('button', { name: 'Gerenciar Loja' })).toBeVisible();

    // Aguarda cards reais da vitrine renderizarem
    const cards = page.locator('#vitrine-catalogo article');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    // Verifica que o palco visual da foto usa fundo branco puro (rgb(255, 255, 255))
    const stageBg = await cards
      .first()
      .locator('.aspect-\\[4\\/3\\]')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(stageBg).toBe('rgb(255, 255, 255)');

    // Busca inline no header e fechamento com Escape
    await page.getByRole('button', { name: 'Buscar produtos' }).click();
    const searchInput = page.getByRole('textbox', { name: 'Buscar produtos cadastrados' });
    await expect(searchInput).toBeFocused();
    await searchInput.fill('__termo_inexistente_e2e__');
    await expect(page.getByText('Nenhum produto encontrado')).toBeVisible();

    await searchInput.press('Escape');
    await expect(searchInput).toBeHidden();

    // Limpa busca reabrindo se necessário e fechando pelo X
    await page.getByRole('button', { name: 'Buscar produtos' }).click();
    await page.getByRole('button', { name: 'Fechar busca' }).click();
    await expect(cards.first()).toBeVisible();

    // Popover de disponibilidade dos 4 microsserviços
    await page.getByRole('button', { name: 'Disponibilidade dos serviços' }).click();
    const statusDialog = page.getByRole('dialog', { name: 'Disponibilidade dos Serviços VERO' });
    await expect(statusDialog).toBeVisible();
    await expect(statusDialog.getByText('ms-produtos')).toBeVisible();
    await expect(statusDialog.getByText('ms-pedidos')).toBeVisible();
    await expect(statusDialog.getByText('event-broker')).toBeVisible();
    await expect(statusDialog.getByText('ms-query')).toBeVisible();

    await statusDialog.getByRole('button', { name: 'Fechar painel de serviços' }).click();
    await expect(statusDialog).toBeHidden();
  });
});
