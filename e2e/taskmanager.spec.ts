import { expect, test } from '@playwright/test';

test('renders a task created through tRPC in the initial server HTML', async ({ request }) => {
  const title = `SSR tarefa ${crypto.randomUUID()}`;
  const createdResponse = await request.post('/api/trpc/task.create', {
    headers: { 'content-type': 'application/json' },
    data: { titulo: title, descricao: 'Criada diretamente pela procedure tRPC.' },
  });
  expect(createdResponse.ok(), `${createdResponse.status()} ${await createdResponse.text()}`).toBeTruthy();
  const created = await createdResponse.json() as { result: { data: { id: string } } };

  try {
    const html = await (await request.get('/tarefas')).text();
    expect(html).toContain(title);
    expect(html).toContain('Criada diretamente pela procedure tRPC.');
  } finally {
    await request.post('/api/trpc/task.delete', { data: { id: created.result.data.id } });
  }
});

test('creates, edits and deletes a task through the modal flow', async ({ page }) => {
  const title = `Tarefa UI ${crypto.randomUUID()}`;
  await page.goto('/tarefas');
  await page.getByRole('button', { name: 'Nova tarefa' }).click();

  const dialog = page.getByRole('dialog', { name: 'Nova tarefa' });
  await expect(dialog.getByLabel(/Título da tarefa/)).toBeFocused();
  await dialog.getByLabel(/Título da tarefa/).fill(title);
  await dialog.getByLabel('Descrição (opcional)').fill('Descrição original.');
  await dialog.getByRole('button', { name: 'Criar tarefa' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Tarefa criada com sucesso.');
  await page.reload();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  await page.getByRole('button', { name: `Editar ${title}` }).click();
  const editDialog = page.getByRole('dialog', { name: 'Editar tarefa' });
  await editDialog.getByLabel(/Título da tarefa/).fill(`${title} atualizada`);
  await editDialog.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('heading', { name: `${title} atualizada` })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: `${title} atualizada` })).toBeVisible();

  await page.getByRole('button', { name: `Excluir ${title} atualizada` }).click();
  const deleteDialog = page.getByRole('dialog', { name: 'Excluir tarefa?' });
  await expect(deleteDialog.getByRole('button', { name: 'Excluir tarefa' })).toBeFocused();
  await deleteDialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(deleteDialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: `${title} atualizada` })).toBeVisible();
  await expect(page.getByRole('button', { name: `Excluir ${title} atualizada` })).toBeFocused();
  await page.getByRole('button', { name: `Excluir ${title} atualizada` }).click();
  const confirmation = page.getByRole('dialog', { name: 'Excluir tarefa?' });
  await confirmation.getByRole('button', { name: 'Excluir tarefa' }).click();
  await expect(page.getByRole('heading', { name: `${title} atualizada` })).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Tarefa excluída com sucesso.');
  await page.reload();
  await expect(page.getByRole('heading', { name: `${title} atualizada` })).toHaveCount(0);
});

test('validates a blank title and closes the dialog with Escape, restoring focus', async ({ page }) => {
  await page.goto('/tarefas');
  const opener = page.getByRole('button', { name: 'Nova tarefa' });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Nova tarefa' });
  await dialog.getByRole('button', { name: 'Criar tarefa' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Informe um título');
  const closeButton = dialog.getByRole('button', { name: 'Fechar formulário' });
  const submitButton = dialog.getByRole('button', { name: 'Criar tarefa' });
  await closeButton.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(submitButton).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(closeButton).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();

  await opener.click();
  const cancelledDialog = page.getByRole('dialog', { name: 'Nova tarefa' });
  await cancelledDialog.getByLabel(/Título da tarefa/).fill('Rascunho cancelado');
  await cancelledDialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(cancelledDialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Rascunho cancelado' })).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('keeps form values visible when the create mutation fails', async ({ page }) => {
  await page.route('**/api/trpc/task.create**', (route) => route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({
      error: {
        message: 'Ocorreu um erro inesperado. Tente novamente.',
        code: -32603,
        data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500, path: 'task.create' },
      },
    }),
  }));
  await page.goto('/tarefas');
  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nova tarefa' });
  const title = dialog.getByLabel(/Título da tarefa/);
  await title.fill('Não perder este rascunho');
  await dialog.getByLabel('Descrição (opcional)').fill('Manter a descrição também.');
  await dialog.getByRole('button', { name: 'Criar tarefa' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Não foi possível concluir a operação.');
  await expect(title).toHaveValue('Não perder este rascunho');
  await expect(dialog.getByLabel('Descrição (opcional)')).toHaveValue('Manter a descrição também.');
});

test('keeps the layout inside desktop and mobile viewports', async ({ page }) => {
  await page.goto('/tarefas');
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole('heading', { name: 'Minhas tarefas' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: '/tmp/taskmanager-desktop.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: '/tmp/taskmanager-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await expect(page.getByRole('dialog', { name: 'Nova tarefa' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: '/tmp/taskmanager-mobile-modal.png', fullPage: true });
});

test('loads more tasks when the list sentinel enters view without duplicates', async ({ request, page }) => {
  const prefix = `Infinite scroll ${crypto.randomUUID()}`;
  const createdIds: string[] = [];

  try {
    for (let index = 1; index <= 12; index += 1) {
      const response = await request.post('/api/trpc/task.create', {
        data: { titulo: `${prefix} ${index}` },
      });
      expect(response.ok(), `${response.status()} ${await response.text()}`).toBeTruthy();
      const body = await response.json() as { result: { data: { id: string } } };
      createdIds.push(body.result.data.id);
    }

    await page.goto('/tarefas');
    const taskTitles = page.locator('.task-card h3').filter({ hasText: prefix });
    await expect(taskTitles).toHaveCount(8);
    const loadStatus = page.getByRole('status').filter({ hasText: 'Buscando tarefas mais antigas' });
    const scrollStartedAt = Date.now();
    await page.locator('.task-list-sentinel').scrollIntoViewIfNeeded();
    await expect(loadStatus).toBeVisible();
    await expect(taskTitles).toHaveCount(8);
    await expect(taskTitles).toHaveCount(12);
    expect(Date.now() - scrollStartedAt).toBeGreaterThanOrEqual(650);

    const loadedTitles = await taskTitles.allTextContents();
    expect(new Set(loadedTitles).size).toBe(12);
    await expect(page.getByText(/^Exibindo \d+ tarefas carregadas\.$/)).toBeVisible();
  } finally {
    await Promise.all(createdIds.map((id) => request.post('/api/trpc/task.delete', { data: { id } })));
  }
});

test('loads the next page with the button when IntersectionObserver is unavailable', async ({ request, page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'IntersectionObserver', { value: undefined, configurable: true });
  });

  const prefix = `Fallback scroll ${crypto.randomUUID()}`;
  const createdIds: string[] = [];

  try {
    for (let index = 1; index <= 9; index += 1) {
      const response = await request.post('/api/trpc/task.create', {
        data: { titulo: `${prefix} ${index}` },
      });
      expect(response.ok(), `${response.status()} ${await response.text()}`).toBeTruthy();
      const body = await response.json() as { result: { data: { id: string } } };
      createdIds.push(body.result.data.id);
    }

    await page.goto('/tarefas');
    const taskTitles = page.locator('.task-card h3').filter({ hasText: prefix });
    await expect(taskTitles).toHaveCount(8);
    await page.getByRole('button', { name: 'Carregar mais' }).click();
    await expect(taskTitles).toHaveCount(9);
  } finally {
    await Promise.all(createdIds.map((id) => request.post('/api/trpc/task.delete', { data: { id } })));
  }
});

test('keeps loaded pages consistent when tasks are created and deleted', async ({ request, page }) => {
  const prefix = `Page mutation ${crypto.randomUUID()}`;
  const newTitle = `${prefix} criada pela UI`;
  const createdIds: string[] = [];

  try {
    for (let index = 1; index <= 12; index += 1) {
      const response = await request.post('/api/trpc/task.create', {
        data: { titulo: `${prefix} ${index}` },
      });
      expect(response.ok(), `${response.status()} ${await response.text()}`).toBeTruthy();
      const body = await response.json() as { result: { data: { id: string } } };
      createdIds.push(body.result.data.id);
    }

    await page.goto('/tarefas');
    const scenarioTitles = page.locator('.task-card h3').filter({ hasText: prefix });
    await expect(scenarioTitles).toHaveCount(8);
    await page.locator('.task-list-sentinel').scrollIntoViewIfNeeded();
    await expect(scenarioTitles).toHaveCount(12);

    await page.getByRole('button', { name: 'Nova tarefa' }).click();
    const createDialog = page.getByRole('dialog', { name: 'Nova tarefa' });
    await createDialog.getByLabel(/Título da tarefa/).fill(newTitle);
    await createDialog.getByRole('button', { name: 'Criar tarefa' }).click();
    await expect(scenarioTitles).toHaveCount(13);
    await expect(page.getByRole('heading', { name: newTitle })).toBeVisible();

    const removedTitle = (await page.locator('.task-card h3').filter({ hasText: prefix }).last().textContent())?.trim() ?? '';
    expect(removedTitle).not.toBe('');
    await page.getByRole('button', { name: `Excluir ${removedTitle}`, exact: true }).click();
    await page.getByRole('dialog', { name: 'Excluir tarefa?' }).getByRole('button', { name: 'Excluir tarefa' }).click();
    await expect(page.getByRole('heading', { name: removedTitle, exact: true })).toHaveCount(0);
    await expect(scenarioTitles).toHaveCount(12);
    const visibleTitles = await scenarioTitles.allTextContents();
    expect(new Set(visibleTitles).size).toBe(12);
  } finally {
    const remainingTasksResponse = await request.get('/api/trpc/task.list');
    if (remainingTasksResponse.ok()) {
      const body = await remainingTasksResponse.json() as { result: { data: { id: string; titulo: string }[] } };
      const createdByUi = body.result.data.find((task) => task.titulo === newTitle);
      if (createdByUi) createdIds.push(createdByUi.id);
    }
    await Promise.all(createdIds.map(async (id) => {
      const response = await request.post('/api/trpc/task.delete', { data: { id } });
      if (!response.ok() && response.status() !== 404) throw new Error(`Falha ao limpar a tarefa temporária ${id}.`);
    }));
  }
});
