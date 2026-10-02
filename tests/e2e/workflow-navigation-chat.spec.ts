import { test, expect, type Page } from "@playwright/test";

async function account(page: Page, origin: string) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const response = await page.request.post("/api/auth/register", {
    headers: { Origin: origin },
    data: {
      name: "Ana Fluxo",
      companyName: "Empresa de fluxo",
      email: `flow-${suffix}@example.test`,
      password: `Desmos-Flow-${suffix}!`,
    },
  });
  expect(response.status()).toBe(201);
  const me = await (await page.request.get("/api/me")).json();
  const created = await page.request.post("/api/sales/pipelines", {
    headers: { Origin: origin },
    data: {
      name: "Vendas",
      stages: ["Entrada", "Reunião", "Proposta"].map((name, i) => ({
        name,
        probability: i * 30,
        color: "#173b68",
      })),
    },
  });
  expect(created.status()).toBe(201);
  return { me, pipeline: (await created.json()).item };
}

async function openingFrames(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ overflow: number; transforms: string[] }>((resolve) => {
        const frames: string[] = [];
        let overflow = 0;
        const until = performance.now() + 420;
        function frame() {
          overflow = Math.max(
            overflow,
            document.documentElement.scrollWidth - innerWidth,
          );
          const panel = document.querySelector(".global-assistant");
          if (panel) frames.push(getComputedStyle(panel).transform);
          if (performance.now() < until) requestAnimationFrame(frame);
          else resolve({ overflow, transforms: frames });
        }
        requestAnimationFrame(frame);
      }),
  );
}

for (const mobile of [false, true]) {
  test(`funil no contexto de negócios: retorno, cancelar e recuperar histórico ${mobile ? "mobile" : "desktop"}`, async ({
    page,
    baseURL,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const { pipeline } = await account(page, baseURL!);
    const board = `/sales/board?pipelineId=${pipeline.id}`;
    await page.goto(board);
    await page
      .getByRole("link", { name: "Editar etapas", exact: true })
      .click();
    await expect(page).toHaveURL(/from=board/);
    await page.locator("#stage-name-1").fill("Conversa inicial");
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "Descartar alterações do funil?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continuar editando" }).click();
    await expect(page.locator("#stage-name-1")).toHaveValue("Conversa inicial");
    // Browser history is allowed; the in-memory draft recovers on common navigation.
    await page.goBack();
    await expect(page).toHaveURL(board);
    await page
      .getByRole("link", { name: "Editar etapas", exact: true })
      .click();
    await expect(page.locator("#stage-name-1")).toHaveValue("Conversa inicial");
    await expect(
      page.getByRole("status").filter({ hasText: "Retomamos as alterações" }),
    ).toBeVisible();
    const before = (
      await (
        await page.request.get(`/api/sales/pipelines/${pipeline.id}`)
      ).json()
    ).item;
    expect(before.stages[1].name).toBe("Reunião");
    await page
      .getByRole("button", { name: "Salvar funil", exact: true })
      .click();
    await expect(page).toHaveURL(board);
    await expect(page.getByLabel("Funil", { exact: true })).toHaveValue(
      pipeline.id,
    );
    const saved = (
      await (
        await page.request.get(`/api/sales/pipelines/${pipeline.id}`)
      ).json()
    ).item;
    expect(saved.stages[1].name).toBe("Conversa inicial");
    expect(saved.stages.map((stage: { id: string }) => stage.id)).toEqual(
      pipeline.stages.map((stage: { id: string }) => stage.id),
    );
    await page
      .getByRole("link", { name: "Editar etapas", exact: true })
      .click();
    await page
      .getByLabel("Nome do funil", { exact: true })
      .fill("Alteração descartada");
    if (mobile)
      await page.getByRole("button", { name: "Abrir navegação" }).click();
    await page
      .getByRole("navigation", { name: "Trabalho comercial" })
      .getByRole("link", { name: "Agenda", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Descartar alterações do funil?" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Descartar alterações", exact: true })
      .click();
    await expect(page).toHaveURL("/sales/agenda");
    await page
      .getByRole("navigation", { name: "Planejamento comercial" })
      .getByRole("link", { name: "Atividades", exact: true })
      .click();
    await expect(page).toHaveURL("/sales/activities");
    await page.goto(`/sales/pipelines/${pipeline.id}/edit`);
    await expect(page.getByLabel("Nome do funil", { exact: true })).toHaveValue(
      "Vendas",
    );
  });

  test(`chat: composer, revisão, frames sem overflow e reload ${mobile ? "mobile" : "desktop"}`, async ({
    page,
    baseURL,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await account(page, baseURL!);
    await page.goto("/sales/tasks");
    const entry = page.getByRole("button", { name: "Assistente", exact: true });
    await entry.waitFor({ state: "visible" });
    // Invoke and sample in one browser task so the beginning is included.
    await page.evaluate(() =>
      (document.querySelector(".assistant-entry") as HTMLButtonElement).click(),
    );
    const frames = await openingFrames(page);
    expect(frames.overflow).toBe(0);
    expect(
      frames.transforms.some(
        (transform) =>
          transform !== "none" && transform !== "matrix(1, 0, 0, 1, 0, 0)",
      ),
    ).toBe(true);
    const request = page.getByLabel("Pergunte ou descreva uma automação");
    await request.fill("Como usar tarefas?");
    await request.press("Shift+Enter");
    await request.press("a");
    await expect(request).toHaveValue("Como usar tarefas?\na");
    await expect(page.getByRole("log")).toBeEmpty();
    await request.press("Enter");
    await expect(page.locator(".assistant-message-user")).toContainText(
      "Como usar tarefas?",
    );
    await expect(page.locator(".assistant-message-assistant")).toContainText(
      "Em Tarefas",
    );
    await expect(request).toHaveValue("");
    await page
      .getByRole("button", { name: "Preparar aviso por email" })
      .click();
    await request.press("Enter");
    const review = page.getByRole("region", {
      name: "Revisão do rascunho de automação",
    });
    await expect(review).toBeVisible();
    await expect(review.getByLabel("Destinatário interpretado")).toHaveValue(
      "USER",
    );
    await expect(request).toBeInViewport();
    await page.getByRole("button", { name: "Fechar assistente" }).click();
    await expect(entry).toBeFocused();
    await entry.click();
    await expect(review).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await expect(page.locator(".global-assistant")).toHaveCSS(
      "transform",
      "none",
    );
    await page.getByRole("button", { name: "Fechar assistente" }).click();
    await page.reload();
    await entry.click();
    await expect(page.getByRole("log")).toBeEmpty();
    await expect(review).toHaveCount(0);
  });
}

test("descoberta operacional respeita permissões e URLs existentes", async ({
  page,
  baseURL,
}) => {
  const { me } = await account(page, baseURL!);
  await page.route("**/api/me", (route) =>
    route.fulfill({
      json: { ...me, permissions: ["activities.view", "deals.view"] },
    }),
  );
  await page.goto("/sales/activities");
  await expect(
    page
      .getByRole("navigation", { name: "Trabalho comercial" })
      .getByRole("link", { name: "Agenda", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Planejamento comercial" })
      .getByRole("link", { name: "Tarefas" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Automações", exact: true }),
  ).toHaveCount(0);
  await page.goto("/sales/board");
  await expect(
    page.getByRole("link", { name: "Editar etapas", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Gerenciar funis", exact: true }),
  ).toHaveCount(0);
  await page.goto("/sales/pipelines");
  await expect(
    page.getByRole("link", { name: "Novo funil", exact: true }),
  ).toHaveCount(0);
  await page.goto("/settings/profile");
  await expect(
    page
      .getByRole("navigation", { name: "Configurações e conta" })
      .getByRole("link"),
  ).toHaveCount(2);
});
