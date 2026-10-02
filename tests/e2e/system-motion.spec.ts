import { test, expect, type Page } from "@playwright/test";

async function fixture(page: Page, origin: string) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const reg = await page.request.post("/api/auth/register", {
    headers: { Origin: origin },
    data: {
      name: "Ana Motion",
      companyName: "Empresa de movimento",
      email: `motion-${suffix}@example.test`,
      password: `Desmos-Motion-${suffix}!`,
    },
  });
  expect(reg.status()).toBe(201);
  const response = await page.request.post("/api/sales/pipelines", {
    headers: { Origin: origin },
    data: {
      name: "Vendas",
      stages: ["Entrada", "Reunião", "Proposta"].map((name, i) => ({
        name,
        probability: i * 35,
        color: "#173b68",
      })),
    },
  });
  expect(response.status()).toBe(201);
  const pipeline = (await response.json()).item;
  const dealResponse = await page.request.post("/api/sales/deals", {
    headers: { Origin: origin },
    data: {
      title: "Projeto Aurora",
      pipelineId: pipeline.id,
      stageId: pipeline.stages[0].id,
      value: "25000",
      currency: "BRL",
    },
  });
  expect(dealResponse.status()).toBe(201);
  return { pipeline, deal: (await dealResponse.json()).item };
}

async function recordMotion(page: Page) {
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    const records: {
      target: string | null;
      frames: unknown;
      duration: unknown;
    }[] = [];
    Object.assign(window, { __motionRecords: records });
    Element.prototype.animate = function (frames, options) {
      const indexed = frames as PropertyIndexedKeyframes;
      const normalized = Array.isArray(frames)
        ? frames
        : Array.isArray(indexed.transform)
          ? indexed.transform.map((transform) => ({ transform }))
          : frames;
      records.push({
        target: this.getAttribute("data-motion-key"),
        frames: normalized,
        duration: typeof options === "object" ? options.duration : options,
      });
      return animate.call(this, frames, options);
    };
  });
}
async function records(page: Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __motionRecords: {
            target: string;
            frames: { transform: string }[];
            duration: number;
          }[];
        }
      ).__motionRecords,
  );
}
async function settle(page: Page) {
  await page.evaluate(() =>
    Promise.allSettled(
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.effect?.getComputedTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished),
    ),
  );
}

async function sampleLayout(page: Page, ids: string[]) {
  await page.evaluate((ids) => {
    const samples: { id: string; transform: string; engine?: string }[] = [];
    Object.assign(window, { __layoutSamples: samples });
    const until = performance.now() + 700;
    const frame = () => {
      for (const id of ids) {
        const element = document.querySelector<HTMLElement>(
          `[data-motion-key="${id}"]`,
        );
        if (element)
          samples.push({
            id,
            transform: getComputedStyle(element).transform,
            engine: element.dataset.motionEngine,
          });
      }
      if (performance.now() < until) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, ids);
}
async function movedWithMotion(page: Page) {
  return page.evaluate(() =>
    (
      window as unknown as {
        __layoutSamples: { transform: string; engine?: string }[];
      }
    ).__layoutSamples.some(
      (sample) =>
        sample.engine === "motion.dev" &&
        sample.transform !== "none" &&
        sample.transform !== "matrix(1, 0, 0, 1, 0, 0)",
    ),
  );
}

test("movimento entre etapas e reordenação interrompível preservam dados e reduced motion runtime", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(90000);
  await recordMotion(page);
  const { pipeline, deal } = await fixture(page, baseURL!);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`/sales/board?pipelineId=${pipeline.id}`);
  const card = page.locator(`[data-motion-key="${deal.id}"]`);
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Mover", exact: true }).click();
  await sampleLayout(page, [deal.id]);
  await card.getByLabel("Mover para etapa").selectOption(pipeline.stages[1].id);
  await expect.poll(() => movedWithMotion(page)).toBe(true);
  await expect(
    page
      .getByRole("region", { name: "Etapa Reunião", exact: true })
      .getByRole("link", { name: "Projeto Aurora" }),
  ).toBeVisible();
  expect(
    (await (await page.request.get(`/api/sales/deals/${deal.id}`)).json()).item
      .stageId,
  ).toBe(pipeline.stages[1].id);
  await page.goto(`/sales/pipelines/${pipeline.id}/edit`);
  const stage = page.locator("#stage-name-0");
  await expect(stage).toBeVisible();
  await stage.scrollIntoViewIfNeeded();
  const ids = await page
    .locator(".sales-stage-editor fieldset")
    .evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("data-motion-key")),
    );
  await sampleLayout(page, ids as string[]);
  // Trigger a reversal before the first layout animation completes.
  await page.evaluate(() => {
    (
      document.querySelector(
        '[aria-label="Mover Entrada para baixo"]',
      ) as HTMLButtonElement
    ).click();
  });
  await expect(page.locator("#stage-name-1")).toHaveValue("Entrada");
  await page.evaluate(() =>
    (
      document.querySelector(
        '[aria-label="Mover Entrada para cima"]',
      ) as HTMLButtonElement
    ).click(),
  );
  await expect(page.locator("#stage-name-0")).toHaveValue("Entrada");
  await expect.poll(() => movedWithMotion(page)).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  expect(
    await page.evaluate(
      () =>
        Array.from(document.querySelectorAll("[data-motion-engine]"))
          .flatMap((element) => element.getAnimations())
          .filter((animation) => animation.playState === "running").length,
    ),
  ).toBe(0);
  const count = (await records(page)).length;
  await page.getByRole("button", { name: "Mover Entrada para baixo" }).click();
  expect((await records(page)).length).toBe(count);
  await page.getByRole("button", { name: "Salvar funil", exact: true }).click();
  await expect(page).toHaveURL("/sales/pipelines");
  const saved = (
    await (await page.request.get(`/api/sales/pipelines/${pipeline.id}`)).json()
  ).item;
  expect(saved.stages.map((s: { id: string }) => s.id)).toEqual([
    pipeline.stages[1].id,
    pipeline.stages[0].id,
    pipeline.stages[2].id,
  ]);
  expect(errors).toEqual([]);
});

test("mobile: painéis repetidos/interrompidos, foco e contexto continuam utilizáveis", async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await recordMotion(page);
  await fixture(page, baseURL!);
  await page.goto("/sales/tasks");
  await expect(
    page.getByRole("heading", { name: "Tarefas", exact: true }),
  ).toBeVisible();
  const menu = page.getByRole("button", { name: "Abrir navegação" });
  for (let i = 0; i < 3; i++) {
    await menu.click();
    await expect(
      page.getByRole("link", { name: "Desmos CRM — início" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
  }
  const assistant = page.getByRole("button", {
    name: "Assistente",
    exact: true,
  });
  await assistant.click();
  await page
    .getByRole("button", { name: "Enviar pedido", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Como usar esta tela?" }).click();
  await page
    .getByRole("button", { name: "Enviar pedido", exact: true })
    .click();
  await expect(page.getByRole("log")).toContainText("Em Tarefas");
  await page.keyboard.press("Escape");
  await expect(assistant).toBeFocused();
  await assistant.click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  expect(
    await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((animation) => animation.playState === "running").length,
    ),
  ).toBe(0);
  await page.keyboard.press("Escape");
  await menu.click();
  await page
    .getByRole("navigation", { name: "Trabalho comercial" })
    .getByRole("link", { name: "Agenda", exact: true })
    .click();
  await expect(page).toHaveURL("/sales/agenda");
  await assistant.click();
  await expect(page.getByRole("log")).toContainText("Em Tarefas");
  await expect(page.locator(".global-assistant-heading")).toContainText(
    "Agenda",
  );
  await settle(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test("reduced motion inicial: autenticação e formulários permanecem visíveis sem animações", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await recordMotion(page);
  for (const route of [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/accept-invitation",
  ]) {
    await page.goto(route);
    await expect(page.locator(".auth-form-wrap h1")).toBeVisible();
    expect((await records(page)).length).toBe(0);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  }
});
