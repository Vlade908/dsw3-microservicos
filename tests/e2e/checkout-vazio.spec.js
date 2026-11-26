import { test, expect } from '@playwright/test';

test.describe('Checkout Vazio e Seleção Manual de Item', () => {
  test('abre vazio, permite selecionar e remover item, e retorna à vitrine', async ({ page }) => {
    await page.goto('/');

    // Abre o Checkout diretamente pelo ícone da sacola
    await page.getByRole('button', { name: 'Ir para o Checkout' }).click();

    await expect(page.getByRole('heading', { name: 'Nenhum item no checkout' })).toBeVisible();
    await expect(page.getByText('Nenhum selecionado')).toBeVisible();

    const submitBtn = page.getByRole('button', { name: /Finalizar Pedido/i });
    await expect(submitBtn).toBeDisabled();

    // Seleciona um produto disponível no seletor
    const select = page.getByRole('combobox', { name: 'Selecionar produto' });
    const firstAvailableValue = await select.evaluate((el) => {
      const opt = Array.from(el.options).find((o) => o.value && !o.disabled);
      return opt ? opt.value : '';
    });

    expect(firstAvailableValue).not.toBe('');
    await select.selectOption(firstAvailableValue);

    await expect(submitBtn).toBeEnabled();
    const removeBtn = page.getByRole('button', { name: 'Remover' });
    await expect(removeBtn).toBeVisible();

    // Remove o item e valida retorno ao estado vazio
    await removeBtn.click();
    await expect(page.getByRole('heading', { name: 'Nenhum item no checkout' })).toBeVisible();
    await expect(submitBtn).toBeDisabled();

    // Volta para a vitrine pelo botão do estado vazio
    await page.getByRole('button', { name: /Escolher produto na Vitrine/i }).click();
    const mainNav = page.getByRole('navigation', { name: 'Navegação principal' });
    await expect(mainNav.getByRole('button', { name: 'Vitrine' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });
});
