import { selectOption } from "./select-option.mjs";
// Local visual evidence. Creates a fictional test account; sends no communication.
import { chromium } from "playwright";
import fs from "node:fs/promises";
const base = process.env.E2E_BASE_URL ?? "http://localhost:3017";
const out = "docs/evidence/automation-redesign";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: `${out}/video`, size: { width: 1280, height: 900 } },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const suffix = Date.now();
const headers = { Origin: base };
const reg = await page.request.post(`${base}/api/auth/register`, {
  headers,
  data: {
    name: "Ana Design",
    companyName: "Desmos · revisão visual",
    email: `visual-${suffix}@example.test`,
    password: `Desmos-Visual-${suffix}!`,
  },
});
if (reg.status() !== 201)
  throw new Error(`Registration failed: ${reg.status()}`);
const me = await (await page.request.get(`${base}/api/me`)).json();
const response = await page.request.post(`${base}/api/sales/pipelines`, {
  headers,
  data: {
    name: "Vendas consultivas",
    stages: ["Entrada", "Reunião", "Proposta", "Fechamento"].map((name, i) => ({
      name,
      probability: i * 25,
      color: "#173b68",
    })),
  },
});
if (response.status() !== 201)
  throw new Error(`Pipeline failed: ${response.status()}`);
const pipeline = (await response.json()).item;
await page.goto(`${base}/sales/automations?pipelineId=${pipeline.id}`);
await page
  .getByRole("button", { name: "Criar automação", exact: true })
  .waitFor();
async function shot(name) {
  await page.evaluate(() => {
    document.activeElement?.blur();
    scrollTo({ top: 0, behavior: "instant" });
  });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await page.screenshot({
    path: `${out}/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
await shot("desktop-directory");
await page
  .getByRole("button", { name: "Biblioteca de mensagens", exact: true })
  .click();
await page.getByRole("button", { name: "Criar modelo", exact: true }).click();
await page.getByLabel("Nome do modelo").fill("Proposta pronta");
await page.getByLabel("Assunto do modelo").fill("Sua proposta: {negociacao}");
await page
  .getByLabel("Corpo do modelo")
  .fill(
    "Olá, {contato}!\n\nPreparamos a proposta para {negociacao} na {empresa}. Podemos conversar sobre os próximos passos?\n\n{responsavel}",
  );
await shot("desktop-library-editor");
await page.getByRole("button", { name: "Salvar modelo", exact: true }).click();
await shot("desktop-library");
await page
  .getByRole("button", { name: "Voltar às automações", exact: true })
  .click();
await page
  .getByRole("button", { name: "Criar automação", exact: true })
  .click();
await page
  .getByLabel("Nome da automação")
  .fill("Enviar proposta ao entrar na etapa");
await shot("desktop-trigger");
await page.getByRole("button", { name: "Continuar", exact: true }).click();
await selectOption(page.getByLabel("Modelo de mensagem", { exact: true }), {
  label: "Proposta pronta · revisão 1",
});
await shot("desktop-action");
await page.getByRole("button", { name: "Continuar", exact: true }).click();
await page.getByRole("button", { name: "Simular envio", exact: true }).click();
await page
  .getByRole("button", { name: "Salvar rascunho", exact: true })
  .click();
await shot("desktop-review");
await page.getByRole("button", { name: "Assistente", exact: true }).click();
await page.getByRole("button", { name: "Como usar esta tela?" }).click();
await page.getByRole("button", { name: "Enviar pedido", exact: true }).click();
await shot("desktop-assistant");
await page.getByRole("button", { name: "Fechar assistente" }).click();
await page
  .getByRole("navigation", { name: "Trabalho comercial" })
  .getByRole("link", { name: "Agenda", exact: true })
  .click();
await page.getByRole("button", { name: "Assistente", exact: true }).click();
await shot("desktop-assistant-agenda");
await page.getByRole("button", { name: "Fechar assistente" }).click();
await page.goto(`${base}/sales/automations?pipelineId=${pipeline.id}`);
await page
  .getByRole("button", { name: /Enviar proposta ao entrar na etapa/ })
  .click();
await page
  .getByRole("navigation", { name: "Etapas da configuração" })
  .getByRole("button")
  .nth(2)
  .click();
await page.getByRole("button", { name: "Ativar tema escuro" }).click();
await shot("dark-review");
await page.setViewportSize({ width: 390, height: 844 });
await shot("mobile-dark-review");
await page.getByRole("button", { name: "Ativar tema claro" }).click();
await page
  .getByRole("button", { name: "Voltar às automações", exact: true })
  .click();
await shot("mobile-directory");
await page
  .getByRole("button", { name: "Biblioteca de mensagens", exact: true })
  .click();
await shot("mobile-library");
await page
  .getByRole("button", { name: "Voltar às automações", exact: true })
  .click();
await page
  .getByRole("button", { name: /Enviar proposta ao entrar na etapa/ })
  .click();
await shot("mobile-trigger");
await page.getByRole("button", { name: "Continuar", exact: true }).click();
await shot("mobile-action");
await page.getByRole("button", { name: "Continuar", exact: true }).click();
await shot("mobile-review");
await page.getByRole("button", { name: "Assistente", exact: true }).click();
await page
  .getByRole("button", { name: "Enviar pedido", exact: true })
  .waitFor();
await shot("mobile-assistant");
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > innerWidth,
);
await context.storageState({ path: "/tmp/desmos-redesign-visual-auth.json" });
await fs.writeFile(
  "/tmp/desmos-redesign-visual-pipeline.json",
  JSON.stringify(pipeline),
);
const video = page.video();
await context.close();
if (video) {
  await video.saveAs(`${out}/desmos-automation-walkthrough.webm`);
  await video.delete();
}
await browser.close();
await fs.writeFile(
  `${out}/visual-results.json`,
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      viewportDesktop: [1440, 1000],
      viewportMobile: [390, 844],
      errors,
      mobileOverflow: overflow,
      user: me.user.name,
    },
    null,
    2,
  ),
);
if (errors.length || overflow) process.exitCode = 1;
