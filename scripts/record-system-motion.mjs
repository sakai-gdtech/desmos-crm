// Final production walkthrough, with the fictional local QA workspace only.
import { chromium } from "playwright";
import fs from "node:fs/promises";
const out = "docs/evidence/system-motion";
const fixture = JSON.parse(
  await fs.readFile("/tmp/desmos-system-motion-fixture.json", "utf8"),
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  storageState: "/tmp/desmos-system-motion-auth.json",
  viewport: { width: 1440, height: 1000 },
  recordVideo: {
    dir: "/tmp/desmos-system-motion/video",
    size: { width: 1440, height: 1000 },
  },
});
const page = await context.newPage();
page.setDefaultTimeout(12000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const pause = () => page.waitForTimeout(700);
await page.goto(
  `http://localhost:3019/sales/board?pipelineId=${fixture.pipeline.id}`,
);
await page.getByRole("link", { name: "Editar etapas", exact: true }).waitFor();
const light = page.getByRole("button", { name: "Ativar tema claro" });
if (await light.count()) await light.click();
await pause();
await page.getByRole("link", { name: "Editar etapas", exact: true }).click();
await page
  .getByRole("button", { name: /Mover .+ para baixo/ })
  .first()
  .click();
await pause();
await page.getByRole("button", { name: "Cancelar", exact: true }).click();
await pause();
await page.getByRole("button", { name: "Continuar editando" }).click();
await pause();
await page.getByRole("button", { name: "Cancelar", exact: true }).click();
await page
  .getByRole("button", { name: "Descartar alterações", exact: true })
  .click();
await pause();
await page.getByRole("link", { name: "Gerenciar funis", exact: true }).click();
await pause();
await page
  .getByRole("navigation", { name: "Trabalho comercial" })
  .getByRole("link", { name: "Automações", exact: true })
  .click();
await page
  .getByRole("button", { name: "Biblioteca de mensagens", exact: true })
  .click();
await pause();
await page
  .getByRole("button", { name: "Voltar às automações", exact: true })
  .click();
await page.getByRole("button", { name: "Assistente", exact: true }).click();
await pause();
await page
  .getByLabel("Pergunte ou descreva uma automação")
  .fill("Como usar esta tela?");
await page.getByRole("button", { name: "Enviar pedido", exact: true }).click();
await pause();
await page.getByRole("button", { name: "Preparar aviso por email" }).click();
await page.getByRole("button", { name: "Enviar pedido", exact: true }).click();
await pause();
await page.getByText("Ajustar interpretação", { exact: true }).click();
await pause();
await page.getByText("Ajustar interpretação", { exact: true }).click();
await page
  .getByRole("button", { name: "Gerar rascunho para revisão", exact: true })
  .click();
await page.getByLabel("Nome da automação", { exact: true }).waitFor();
await pause();
await page.getByRole("button", { name: "Continuar", exact: true }).click();
await pause();
await page.getByRole("button", { name: "Continuar", exact: true }).click();
await pause();
await page
  .getByRole("button", { name: "Voltar às automações", exact: true })
  .click();
await page
  .getByRole("button", { name: "Descartar e continuar", exact: true })
  .click();
await page
  .getByRole("navigation", { name: "Trabalho comercial" })
  .getByRole("link", { name: "Agenda", exact: true })
  .click();
await page.getByRole("button", { name: "Assistente", exact: true }).click();
await pause();
await page.getByRole("button", { name: "Fechar assistente" }).click();
await context.storageState({ path: "/tmp/desmos-system-motion-auth.json" });
const video = page.video();
await context.close();
await video.saveAs(`${out}/system-motion-walkthrough.webm`);
await video.delete();
await browser.close();
await fs.writeFile(
  `${out}/video.json`,
  JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      build: "production exact final source",
      viewport: { width: 1440, height: 1000 },
      fixture: "fictional local QA account",
      method:
        "Live Playwright interaction recording: stage reorder/cancel, contextual navigation, message library, chat conversation and draft review, progressive editor, retained conversation in Agenda. No real sends or persistent pipeline changes.",
      errors,
    },
    null,
    2,
  ),
);
if (errors.length) throw Error(errors.join("\n"));
console.log("Final production walkthrough saved.");
