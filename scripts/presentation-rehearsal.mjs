import { chromium, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
const origin = process.env.E2E_BASE_URL ?? "http://localhost:3017";
const result = [];
async function reset() {
  await new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", "demo:reset"], { stdio: "pipe" });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`Reset failed ${code}`)),
    );
    child.on("error", reject);
  });
}
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (let round = 1; round <= 2; round++) {
    await reset();
    const context = await browser.newContext({
      baseURL: origin,
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
      ...(round === 2
        ? {
            recordVideo: {
              dir: ".impeccable/review/recordings",
              size: { width: 1440, height: 900 },
            },
          }
        : {}),
    });
    const login = await context.request.post("/api/auth/login", {
      headers: { Origin: origin },
      data: { email: "ana@nexa.com", password: process.env.DEMO_PASSWORD },
    });
    if (!login.ok()) throw new Error(`Login ${login.status()}`);
    const page = await context.newPage();
    const pause = async () => {
      if (round === 2) await page.waitForTimeout(900);
    };
    const pipelines = (
      await (await context.request.get("/api/sales/pipelines")).json()
    ).items;
    const pipeline = pipelines.find((p) => p.demoFixture);
    expect(pipeline).toBeTruthy();
    const deals = (
      await (
        await context.request.get(`/api/sales/deals?pipelineId=${pipeline.id}`)
      ).json()
    ).items;
    const aurora = deals.find((d) => d.title.includes("Aurora"));
    await page.goto("/workspace");
    await expect(
      page.getByRole("heading", { name: "Radar Comercial", exact: true }),
    ).toBeVisible();
    await pause();
    await page
      .locator(".radar-list")
      .getByRole("link", { name: /Implantação comercial · Aurora Digital/ })
      .click();
    const drawer = page.getByRole("dialog", { name: "Detalhes do negócio" });
    await expect(drawer).toBeVisible();
    await pause();
    await drawer
      .getByRole("button", { name: "Criar tarefa", exact: true })
      .click();
    await drawer
      .getByLabel("O que precisa ser feito?")
      .fill("Confirmar proposta com Marina");
    await pause();
    await drawer
      .getByRole("button", { name: "Salvar tarefa", exact: true })
      .click();
    await expect(drawer.getByText("Próxima ação registrada.")).toBeVisible();
    await pause();
    await drawer
      .getByRole("button", { name: "Ver proposta", exact: true })
      .click();
    await drawer
      .getByLabel("Descrição", { exact: true })
      .fill("Implantação comercial");
    await drawer.getByLabel("Preço unitário (BRL)").fill("20000.00");
    const products = (
      await (await context.request.get("/api/sales/products")).json()
    ).items;
    await drawer
      .getByLabel("Adicionar do catálogo")
      .selectOption(
        products.find((p) => p.name === "Treinamento da equipe").id,
      );
    await pause();
    await drawer
      .getByRole("button", { name: "Salvar proposta", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (
            await (
              await context.request.get(
                `/api/sales/deals/${aurora.id}/proposal`,
              )
            ).json()
          ).item?.total,
      )
      .toBe("25000.00");
    await pause();
    // The existing stage control triggers the single demonstration rule in the same transaction.
    await drawer
      .getByRole("button", { name: "Fechar proposta", exact: true })
      .click();
    await drawer
      .getByLabel("Etapa", { exact: true })
      .selectOption(pipeline.stages.find((s) => s.name === "Proposta").id);
    await expect
      .poll(
        async () =>
          (
            await (
              await context.request.get(
                `/api/sales/pipelines/${pipeline.id}/demo-automation`,
              )
            ).json()
          ).executions.length,
      )
      .toBe(1);
    const tasks = (
      await (
        await context.request.get(`/api/sales/tasks?dealId=${aurora.id}`)
      ).json()
    ).items;
    expect(
      tasks.filter((t) => t.title.startsWith("Acompanhar proposta")).length,
    ).toBe(1);
    await pause();
    await drawer
      .getByRole("button", { name: "Marcar como ganho", exact: true })
      .click();
    const win = page.getByRole("dialog", { name: "Confirmar negócio ganho" });
    await expect(win).toContainText("25.000,00");
    await pause();
    await win
      .getByRole("button", { name: "Confirmar ganho", exact: true })
      .click();
    await expect(
      drawer
        .locator(".sales-value-heading")
        .getByText("Ganha", { exact: true }),
    ).toBeVisible();
    await pause();
    await expect(win).not.toBeVisible();
    await drawer.getByRole("button", { name: "Fechar negócio" }).click();
    await expect(page.locator(".commercial-indicators")).toContainText(
      "25.000,00",
    );
    const data = await (
      await context.request.get(
        `/api/sales/dashboard?pipelineId=${pipeline.id}`,
      )
    ).json();
    expect(data.totals[0].wonValue).toBe("25000.00");
    expect(data.totals[0].openValue).toBe("30000.00");
    expect(data.noActionCount).toBe(1);
    await pause();
    await page.reload();
    await expect(page.locator(".commercial-indicators")).toContainText(
      "25.000,00",
    );
    await pause();
    if (round === 2) {
      await page.goto(`/sales/automations?pipelineId=${pipeline.id}`);
      await expect(
        page.getByRole("heading", {
          name: "Acompanhamento de proposta",
          exact: true,
        }),
      ).toBeVisible();
      await pause();
    }
    const video = page.video();
    await context.close();
    if (video) {
      await mkdir("docs/demo", { recursive: true });
      await video.saveAs("docs/demo/desmos-apresentacao.webm");
    }
    result.push({
      round,
      pipelineId: pipeline.id,
      dealId: aurora.id,
      proposalTotal: "25000.00",
      wonValue: data.totals[0].wonValue,
      openValue: data.totals[0].openValue,
      automaticTasks: 1,
      reload: true,
    });
  }
  await reset();
  await writeFile(
    ".impeccable/review/presentation-rehearsal.json",
    JSON.stringify({ result, restored: true }, null, 2),
  );
  console.log(JSON.stringify({ result, restored: true }));
} finally {
  await browser.close();
}
