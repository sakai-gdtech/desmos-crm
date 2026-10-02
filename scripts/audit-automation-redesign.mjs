// Run verify-automation-redesign.mjs first to prepare fictional local auth.
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  storageState: "/tmp/desmos-redesign-visual-auth.json",
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const pipeline = JSON.parse(
  await fs.readFile("/tmp/desmos-redesign-visual-pipeline.json", "utf8"),
);
const errors = [];
const audits = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(
  `${process.env.E2E_BASE_URL ?? "http://localhost:3017"}/sales/automations?pipelineId=${pipeline.id}`,
);

async function audit(name) {
  // Inspect stable states: finite transitions are allowed to finish before axe.
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
  const result = await new AxeBuilder({ page }).analyze();
  audits.push({
    name,
    violations: result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => node.target),
    })),
  });
}

await page.locator(".automation-directory-row").first().waitFor();
await audit("directory");
await page.locator(".automation-directory-row").first().click();
await page.getByLabel("Nome da automação").waitFor();
await audit("trigger");
const activeMotionAnimations = await page.evaluate(async () => {
  document.querySelector(".automation-progress").children[1].click();
  await new Promise(requestAnimationFrame);
  return document.querySelector(".automation-editor-layout").getAnimations()
    .length;
});
await page.emulateMedia({ reducedMotion: "reduce" });
const afterRuntimeReducedMotion = await page
  .locator(".automation-editor-layout")
  .evaluate((element) => element.getAnimations().length);
await page.emulateMedia({ reducedMotion: "no-preference" });
const interrupted = await page.evaluate(async () => {
  const nav = document.querySelector(".automation-progress");
  nav.children[0].click();
  await new Promise(requestAnimationFrame);
  nav.children[1].click();
  await new Promise(requestAnimationFrame);
  return {
    animations: document
      .querySelector(".automation-editor-layout")
      .getAnimations().length,
    visibleAction:
      document.querySelector("#automation-action").getClientRects().length > 0,
  };
});
await audit("action");
await page
  .getByRole("navigation", { name: "Etapas da configuração" })
  .getByRole("button")
  .nth(2)
  .click();
await audit("review");
await page.getByRole("button", { name: "Assistente", exact: true }).click();
await page
  .getByRole("button", { name: "Enviar pedido", exact: true })
  .waitFor();
await audit("assistant");
await page.setViewportSize({ width: 390, height: 844 });
await audit("assistant-mobile");
await page.getByRole("button", { name: "Fechar assistente" }).click();
await page.getByRole("button", { name: "Ativar tema escuro" }).click();
await audit("dark-mobile");
const result = {
  activeMotionAnimations,
  afterRuntimeReducedMotion,
  interrupted,
  errors,
  audits,
};
await fs.writeFile(
  "docs/evidence/automation-redesign/accessibility-motion.json",
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
await browser.close();
