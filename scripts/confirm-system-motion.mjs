// Bounded confirmation of the two findings from the full visual pass.
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
const base = "http://localhost:3017",
  out = "docs/evidence/system-motion";
const fixture = JSON.parse(
  await fs.readFile("/tmp/desmos-system-motion-fixture.json", "utf8"),
);
const report = JSON.parse(
  await fs.readFile(`${out}/verification.json`, "utf8"),
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  storageState: "/tmp/desmos-system-motion-auth.json",
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
async function settled() {
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  await page.waitForFunction(
    () =>
      document
        .getAnimations()
        .every(
          (a) =>
            a.playState !== "running" ||
            a.effect?.getComputedTiming().iterations === Infinity,
        ) &&
      [...document.querySelectorAll("[data-motion-engine]")].every(
        (e) => !e.style.transform || e.style.transform === "none",
      ),
  );
}
async function shot(name) {
  await settled();
  await page.evaluate(() => document.activeElement?.blur());
  await page.screenshot({
    path: `${out}/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  const state = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    title: document.querySelector("h1")?.textContent,
    viewport: { width: innerWidth, height: innerHeight },
  }));
  for (const s of report.shots.filter((s) => s.name === name))
    Object.assign(s, {
      ...state,
      url: new URL(page.url()).pathname,
      confirmedAt: new Date().toISOString(),
    });
  console.log(name, state.overflow);
}
async function audit(name) {
  await settled();
  const a = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  const entry = {
    name,
    violations: a.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      targets: v.nodes.map((n) => n.target),
    })),
  };
  const old = report.audits.findIndex((a) => a.name === name);
  if (old >= 0) report.audits[old] = entry;
  else report.audits.push(entry);
}
await page.goto(`${base}/sales/automations?pipelineId=${fixture.pipeline.id}`);
await page
  .getByRole("button", { name: "Biblioteca de mensagens", exact: true })
  .click();
await page.getByRole("button", { name: "Criar modelo", exact: true }).click();
await page.getByLabel("Nome do modelo").fill("Proposta pronta");
await page.getByLabel("Assunto do modelo").fill("Sua proposta: {negociacao}");
await page
  .getByLabel("Corpo do modelo")
  .fill(
    "Olá, {contato}! Vamos revisar a proposta de {negociacao} para a {empresa}? {responsavel}",
  );
await page.getByRole("button", { name: "Salvar modelo", exact: true }).click();
await page
  .getByRole("button", { name: "Voltar às automações", exact: true })
  .click();
await page.getByRole("button", { name: "Assistente", exact: true }).click();
await page
  .getByLabel("Pergunte ou descreva uma automação")
  .fill("Como usar automações?");
await page.getByRole("button", { name: "Enviar pedido", exact: true }).click();
await shot("desktop-assistant");
await audit("assistant");
await page.getByRole("button", { name: "Preparar aviso por email" }).click();
await page.getByRole("button", { name: "Enviar pedido", exact: true }).click();
await shot("desktop-assistant-draft");
await audit("assistant-draft");
await page.getByRole("button", { name: "Fechar assistente" }).click();
await page
  .getByRole("navigation", { name: "Trabalho comercial" })
  .getByRole("link", { name: "Agenda", exact: true })
  .click();
await page.getByRole("button", { name: "Assistente", exact: true }).click();
await shot("desktop-assistant-agenda");
await page.getByRole("button", { name: "Fechar assistente" }).click();
await page.goto(`${base}/sales/deals`);
await page.locator(".crm-record-link").first().waitFor();
await shot("desktop-deals");
await page.setViewportSize({ width: 390, height: 844 });
await shot("mobile-deals");
await audit("mobile-deals");
const table = page.getByRole("region", {
  name: "Lista de negócios",
  exact: true,
});
await table.focus();
await table.evaluate((e) => (e.scrollLeft = 120));
const horizontal = await table.evaluate((e) => ({
  bodyOverflow: document.documentElement.scrollWidth > innerWidth,
  scrollLeft: e.scrollLeft,
  scrollWidth: e.scrollWidth,
  clientWidth: e.clientWidth,
}));
if (horizontal.bodyOverflow || horizontal.scrollLeft === 0)
  throw Error("Table scrolling failed");
await table.evaluate((e) => (e.scrollLeft = 0));
await page.goto(`${base}/sales/automations?pipelineId=${fixture.pipeline.id}`);
await page.getByRole("button", { name: "Assistente", exact: true }).click();
await page.getByLabel("Pergunte ou descreva uma automação").waitFor();
await shot("mobile-assistant");
await audit("assistant-mobile");
await page.getByRole("button", { name: "Preparar aviso por email" }).click();
await page.getByRole("button", { name: "Enviar pedido", exact: true }).click();
await shot("mobile-assistant-draft");
await audit("assistant-draft-mobile");
await page.getByRole("button", { name: "Fechar assistente" }).click();
await page.getByRole("button", { name: "Ativar tema escuro" }).click();
await page.getByRole("button", { name: "Assistente", exact: true }).click();
await shot("mobile-dark-assistant");
await audit("dark-mobile-assistant");
await context.storageState({ path: "/tmp/desmos-system-motion-auth.json" });
report.confirmedAt = new Date().toISOString();
report.confirmation = {
  method:
    "Targeted second pass: compact chat review/transcript/composer light/dark desktop/mobile; deals table keyboard focus and horizontal scrolling within its container.",
  initialFindings: [
    "mobile-deals body overflow (repaired by existing table-scroll container)",
    "chat review fields consumed the transcript (repaired by summary plus expandable adjustments)",
  ],
  table: horizontal,
  errors,
};
report.errors.push(...errors);
await fs.writeFile(`${out}/verification.json`, JSON.stringify(report, null, 2));
await browser.close();
console.log(
  JSON.stringify({
    overflow: report.shots.filter((s) => s.overflow).map((s) => s.name),
    audits: report.audits.map((a) => ({
      name: a.name,
      violations: a.violations.length,
    })),
    errors,
  }),
);
