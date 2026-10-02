import { selectOption } from "./select-option.mjs";
// Local QA only: fictional account/data, no invitation or communication sends.
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3017";
const out = "docs/evidence/system-motion";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const desktop = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
let page = await desktop.newPage();
const errors = [];
const shots = [];
const audits = [];
page.on("pageerror", (error) => errors.push(error.message));
const instrument = () => {
  const original = Element.prototype.animate;
  const log = [];
  Object.assign(window, { __motionEvidence: log });
  Element.prototype.animate = function (frames, options) {
    const entry = {
      target: this.getAttribute("data-motion-key"),
      frames,
      duration: options?.duration,
      at: performance.now(),
      canceled: false,
      completed: false,
    };
    log.push(entry);
    const animation = original.call(this, frames, options);
    animation.addEventListener("finish", () => {
      entry.completed = true;
    });
    animation.addEventListener("cancel", () => {
      entry.canceled = true;
    });
    return animation;
  };
};
await desktop.addInitScript(instrument);
async function create(path, data) {
  const response = await page.request.post(`${base}/api${path}`, {
    headers: { Origin: base },
    data,
  });
  if (!response.ok())
    throw new Error(`${path}: ${response.status()} ${await response.text()}`);
  return response.json();
}
const suffix = Date.now();
await create("/auth/register", {
  name: "Ana Desmos",
  companyName: "Aurora · dados de demonstração",
  email: `motion-visual-${suffix}@example.test`,
  password: `Desmos-Motion-${suffix}!`,
});
const me = await (await page.request.get(`${base}/api/me`)).json();
const pipeline = (
  await create("/sales/pipelines", {
    name: "Vendas consultivas",
    stages: ["Entrada", "Reunião", "Proposta"].map((name, i) => ({
      name,
      probability: i * 35,
      color: "#173b68",
    })),
  })
).item;
const companies = [];
for (const name of ["Aurora Digital", "Andrade Projetos"])
  companies.push(
    (
      await create("/crm/companies", {
        name,
        segment: "Tecnologia",
        assignedTo: me.user.id,
      })
    ).item,
  );
const contact = (
  await create("/crm/contacts", {
    name: "Marina",
    lastName: "Andrade",
    companyId: companies[0].id,
    assignedTo: me.user.id,
    email: "marina@example.test",
  })
).item;
const leads = [];
for (const [name, temperature] of [
  ["Carolina Andrade", "HOT"],
  ["Rafael Costa", "WARM"],
  ["Luiza Pereira", "COLD"],
])
  leads.push(
    (
      await create("/crm/leads", {
        name,
        companyName: "Empresa de exemplo",
        temperature,
        assignedTo: me.user.id,
      })
    ).item,
  );
await create("/crm/tags", { name: "Prioridade comercial", color: "#173b68" });
const deals = [];
for (let i = 0; i < 4; i++)
  deals.push(
    (
      await create("/sales/deals", {
        title: [
          "Projeto Aurora",
          "Expansão Andrade",
          "Implantação comercial",
          "Plataforma da equipe",
        ][i],
        pipelineId: pipeline.id,
        stageId: pipeline.stages[i % 3].id,
        value: String(25000 + i * 3500),
        currency: "BRL",
        assignedTo: me.user.id,
        companyId: companies[i % 2].id,
        contactId: i % 2 === 0 ? contact.id : undefined,
      })
    ).item,
  );
const tasks = [];
for (let i = 0; i < 3; i++)
  tasks.push(
    (
      await create("/sales/tasks", {
        title: [
          "Revisar proposta da Aurora",
          "Confirmar agenda com Marina",
          "Preparar apresentação",
        ][i],
        assignedTo: me.user.id,
        dealId: deals[i].id,
        dueAt: new Date(Date.now() + (i - 1) * 86400000).toISOString(),
        priority: i === 0 ? "HIGH" : "MEDIUM",
      })
    ).item,
  );
const activity = (
  await create("/sales/activities", {
    title: "Reunião de acompanhamento",
    type: "MEETING",
    assignedTo: me.user.id,
    dealId: deals[0].id,
    scheduledAt: new Date().toISOString(),
    duration: 30,
  })
).item;
await desktop.storageState({ path: "/tmp/desmos-system-motion-auth.json" });
await fs.writeFile(
  "/tmp/desmos-system-motion-fixture.json",
  JSON.stringify({
    pipeline,
    deals,
    tasks,
    leads,
    contact,
    companies,
    activity,
  }),
);

async function settle(p) {
  await p.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await p.waitForFunction(
    () =>
      document
        .getAnimations()
        .every(
          (animation) =>
            animation.playState !== "running" ||
            animation.effect?.getComputedTiming().iterations === Infinity,
        ) &&
      [...document.querySelectorAll("[data-motion-engine]")].every(
        (node) => !node.style.transform || node.style.transform === "none",
      ),
    undefined,
    { timeout: 1500 },
  );
}
async function frames(p, name, selectors) {
  await p.evaluate(
    ({ name, selectors }) => {
      const log = [];
      window.__renderedMotion ??= [];
      window.__renderedMotion.push({ name, frames: log });
      const end = performance.now() + 700;
      function frame() {
        log.push({
          at: performance.now(),
          overflow: Math.max(
            0,
            document.documentElement.scrollWidth - innerWidth,
          ),
          elements: selectors.flatMap((selector) => {
            const element = document.querySelector(selector);
            if (!element) return [];
            const box = element.getBoundingClientRect();
            return [
              {
                selector,
                engine: element.dataset.motionEngine,
                transform: getComputedStyle(element).transform,
                x: box.x,
                y: box.y,
              },
            ];
          }),
        });
        if (performance.now() < end) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    },
    { name, selectors },
  );
}
async function shot(p, name) {
  await settle(p);
  await p.evaluate(() => {
    document.activeElement?.blur();
    scrollTo({ top: 0, behavior: "instant" });
  });
  await p.screenshot({
    path: `${out}/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  const state = await p.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    title: document.querySelector("h1")?.textContent,
    viewport: { width: innerWidth, height: innerHeight },
  }));
  console.log(`Captured ${name}`);
  shots.push({ name, url: new URL(p.url()).pathname, ...state });
}
async function go(p, route, name) {
  await p.goto(`${base}${route}`);
  await p.locator("h1").first().waitFor();
  await p.waitForFunction(() =>
    [...document.querySelectorAll(".loading-page")].every(
      (node) => !node.getClientRects().length,
    ),
  );
  await shot(p, name);
}
async function audit(p, name) {
  await settle(p);
  const result = await new AxeBuilder({ page: p })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  audits.push({
    name,
    violations: result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      targets: v.nodes.map((n) => n.target),
    })),
  });
}

const routes = [
  ["workspace", "/workspace"],
  ["onboarding", "/onboarding"],
  ["leads", "/crm/leads"],
  ["contacts", "/crm/contacts"],
  ["companies", "/crm/companies"],
  ["lead-detail", `/crm/leads/${leads[0].id}`],
  ["lead-form", `/crm/leads/${leads[0].id}/edit`],
  ["tags", "/crm/tags"],
  ["trash", "/crm/trash"],
  ["board", `/sales/board?pipelineId=${pipeline.id}`],
  ["deals", "/sales/deals"],
  ["deal-detail", `/sales/deals/${deals[0].id}`],
  ["deal-form", `/sales/deals/${deals[0].id}/edit`],
  ["proposal", `/sales/deals/${deals[0].id}/proposal`],
  ["pipelines", "/sales/pipelines"],
  ["stages", `/sales/pipelines/${pipeline.id}/edit`],
  ["tasks", "/sales/tasks"],
  ["task-detail", `/sales/tasks/${tasks[0].id}`],
  ["task-form", `/sales/tasks/${tasks[0].id}/edit`],
  ["activities", "/sales/activities"],
  ["activity-form", `/sales/activities/${activity.id}/edit`],
  ["agenda", "/sales/agenda"],
  ["automations", `/sales/automations?pipelineId=${pipeline.id}`],
  ...["company", "team", "profile", "sessions", "audit"].map((name) => [
    `settings-${name}`,
    `/settings/${name}`,
  ]),
];
for (const [name, route] of routes) await go(page, route, `desktop-${name}`);

// Record only the actual motion walkthrough, not the static inventory tour.
const recording = await browser.newContext({
  storageState: "/tmp/desmos-system-motion-auth.json",
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: `${out}/raw-video`, size: { width: 1440, height: 1000 } },
});
await recording.addInitScript(instrument);
page = await recording.newPage();
page.on("pageerror", (error) => errors.push(error.message));
// Authenticated navigation happens through real shell links; context animates.
await page.goto(`${base}/workspace`);
await page.locator(".radar-row").first().click();
await page.getByRole("dialog", { name: "Detalhes do negócio" }).waitFor();
await page
  .locator(".drawer-content .loading-page")
  .waitFor({ state: "hidden" });
await shot(page, "desktop-deal-drawer");
await page.getByRole("button", { name: "Fechar negócio" }).click();
await page
  .getByRole("navigation", { name: "Trabalho comercial" })
  .getByRole("link", { name: "Negócios", exact: true })
  .click();
const card = page.locator(`[data-motion-key="${deals[0].id}"]`);
await card.getByRole("button", { name: "Mover", exact: true }).click();
await frames(page, "kanban", [`[data-motion-key="${deals[0].id}"]`]);
await selectOption(card.getByLabel("Mover para etapa"), pipeline.stages[1].id);
await page.waitForFunction(
  (id) =>
    document.querySelector(`[data-motion-key="${id}"]`)?.dataset
      .motionEngine === "motion.dev",
  deals[0].id,
);
await settle(page);
const boardMotion = await page.evaluate(() => window.__motionEvidence);
const boardRendered = await page.evaluate(() => window.__renderedMotion);
await audit(page, "board");
await page.goto(`${base}/sales/pipelines/${pipeline.id}/edit`);
await page.locator("#stage-name-0").waitFor();
await page.locator("#stage-name-0").scrollIntoViewIfNeeded();
await frames(page, "stages-reversal", [
  ".sales-stage-editor fieldset",
  ".sales-stage-editor fieldset:nth-child(2)",
]);
await page.evaluate(() =>
  document.querySelector('[aria-label="Mover Entrada para baixo"]').click(),
);
await page.evaluate(() => new Promise(requestAnimationFrame));
await page.evaluate(() =>
  document.querySelector('[aria-label="Mover Entrada para cima"]').click(),
);
const beforeReduced = await page.evaluate(
  () =>
    [...document.querySelectorAll("[data-motion-engine]")].filter(
      (element) =>
        element.getAnimations().some((a) => a.playState === "running") ||
        (element.style.transform && element.style.transform !== "none"),
    ).length,
);
await page.emulateMedia({ reducedMotion: "reduce" });
await page.evaluate(
  () =>
    new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    ),
);
const afterReduced = await page.evaluate(
  () =>
    [...document.querySelectorAll("[data-motion-engine]")].filter(
      (element) =>
        element.getAnimations().some((a) => a.playState === "running") ||
        (element.style.transform && element.style.transform !== "none"),
    ).length,
);
const stagesMotion = await page.evaluate(() => window.__motionEvidence);
const stagesRendered = await page.evaluate(() => window.__renderedMotion);
await page.emulateMedia({ reducedMotion: "no-preference" });
await go(
  page,
  `/sales/automations?pipelineId=${pipeline.id}`,
  "desktop-automations",
);
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
await shot(page, "desktop-message-form");
await page.getByRole("button", { name: "Salvar modelo", exact: true }).click();
await shot(page, "desktop-library");
await page
  .getByRole("button", { name: "Voltar às automações", exact: true })
  .click();
await page
  .getByRole("button", { name: "Criar automação", exact: true })
  .click();
await page.getByLabel("Nome da automação").fill("Preparar próximo contato");
await page.getByRole("button", { name: "Continuar", exact: true }).click();
await selectOption(page.getByLabel("Modelo de mensagem", { exact: true }), {
  label: "Proposta pronta · revisão 1",
});
await shot(page, "desktop-automation-action");
await page.getByRole("button", { name: "Continuar", exact: true }).click();
await shot(page, "desktop-automation-review");
await page
  .getByRole("button", { name: "Salvar rascunho", exact: true })
  .click();
await audit(page, "automations");
await page.getByRole("button", { name: "Assistente", exact: true }).click();
await frames(page, "chat-desktop", [".global-assistant"]);
await page
  .getByRole("button", { name: "Enviar pedido", exact: true })
  .waitFor();
await page
  .getByLabel("Pergunte ou descreva uma automação")
  .fill("Como usar automações?");
await page.getByRole("button", { name: "Enviar pedido", exact: true }).click();
await shot(page, "desktop-assistant");
await audit(page, "assistant");
await page.getByRole("button", { name: "Preparar aviso por email" }).click();
await page.getByRole("button", { name: "Enviar pedido", exact: true }).click();
await shot(page, "desktop-assistant-draft");
await audit(page, "assistant-draft");
const chatRendered = await page.evaluate(() => window.__renderedMotion);
await page.getByRole("button", { name: "Fechar assistente" }).click();
await page
  .getByRole("navigation", { name: "Trabalho comercial" })
  .getByRole("link", { name: "Agenda", exact: true })
  .click();
await page.getByRole("button", { name: "Assistente", exact: true }).click();
await shot(page, "desktop-assistant-agenda");
await page.getByRole("button", { name: "Fechar assistente" }).click();
await audit(page, "agenda");
await go(page, "/crm/leads", "desktop-leads");
await audit(page, "crm");
await go(page, "/settings/company", "desktop-settings-company");
await audit(page, "settings-company");

// Same fictional tenant in mobile; copy only its own local demo storage.
const localData = await page.evaluate(() =>
  Object.fromEntries(
    Object.entries(localStorage).filter(([key]) => key.startsWith("desmos-")),
  ),
);
const video = page.video();
await recording.close();
await video.saveAs(`${out}/system-motion-walkthrough.webm`);
await video.delete();
// Respect the existing per-user API limit across the dense QA inventory.
await new Promise((resolve) => setTimeout(resolve, 30000));
const mobile = await browser.newContext({
  storageState: "/tmp/desmos-system-motion-auth.json",
  viewport: { width: 390, height: 844 },
});
await mobile.addInitScript((data) => {
  for (const [key, value] of Object.entries(data))
    localStorage.setItem(key, value);
}, localData);
const phone = await mobile.newPage();
phone.on("pageerror", (error) => errors.push(error.message));
for (const [index, [name, route]] of routes.entries()) {
  if (index === 14) await new Promise((resolve) => setTimeout(resolve, 30000));
  await go(phone, route, `mobile-${name}`);
}
await phone.goto(`${base}/sales/automations?pipelineId=${pipeline.id}`);
await phone
  .getByRole("button", { name: "Biblioteca de mensagens", exact: true })
  .waitFor();
await phone
  .getByRole("button", { name: "Biblioteca de mensagens", exact: true })
  .click();
await shot(phone, "mobile-library");
await phone.getByRole("button", { name: "Assistente", exact: true }).click();
await frames(phone, "chat-mobile", [".global-assistant"]);
await phone
  .getByRole("button", { name: "Enviar pedido", exact: true })
  .waitFor();
await shot(phone, "mobile-assistant");
await audit(phone, "assistant-mobile");
await phone.getByRole("button", { name: "Preparar aviso por email" }).click();
await phone.getByRole("button", { name: "Enviar pedido", exact: true }).click();
await shot(phone, "mobile-assistant-draft");
const mobileChatRendered = await phone.evaluate(() => window.__renderedMotion);
await phone.getByRole("button", { name: "Fechar assistente" }).click();
await phone.getByRole("button", { name: "Abrir navegação" }).click();
await shot(phone, "mobile-navigation");
await phone.keyboard.press("Escape");
await phone.getByRole("button", { name: "Ativar tema escuro" }).click();
for (const [name, route] of routes.filter(([name]) =>
  [
    "workspace",
    "board",
    "leads",
    "tasks",
    "agenda",
    "automations",
    "settings-company",
  ].includes(name),
))
  await go(phone, route, `mobile-dark-${name}`);
await audit(phone, "dark-mobile-settings");
await phone.getByRole("button", { name: "Assistente", exact: true }).click();
await phone
  .getByLabel("Pergunte ou descreva uma automação")
  .fill("Como organizar meus próximos contatos?");
await phone.getByRole("button", { name: "Enviar pedido", exact: true }).click();
await shot(phone, "mobile-dark-assistant");
await audit(phone, "dark-mobile-assistant");

const guest = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const auth = await guest.newPage();
auth.on("pageerror", (error) => errors.push(error.message));
for (const mode of [
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "verify-email",
  "accept-invitation",
])
  await go(auth, `/${mode}`, `desktop-auth-${mode}`);
await go(auth, "/login", "desktop-auth-login");
await audit(auth, "auth-login");
await auth.setViewportSize({ width: 390, height: 844 });
for (const mode of [
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "verify-email",
  "accept-invitation",
])
  await go(auth, `/${mode}`, `mobile-auth-${mode}`);
const report = {
  capturedAt: new Date().toISOString(),
  base,
  method:
    "Local development Chrome, fictional tenant; stable screenshots, video of real interactions, Motion.dev rendered frames and native animation records. Screenshot does not prove motion. No physical phone or field metrics.",
  errors,
  shots,
  audits,
  motion: {
    beforeReduced,
    afterReduced,
    board: boardMotion,
    stages: stagesMotion,
    rendered: [
      ...boardRendered,
      ...stagesRendered,
      ...chatRendered,
      ...mobileChatRendered,
    ].filter(
      (group, i, groups) =>
        groups.findIndex((candidate) => candidate.name === group.name) === i,
    ),
  },
};
await fs.writeFile(`${out}/verification.json`, JSON.stringify(report, null, 2));
await desktop.close();
await mobile.close();
await guest.close();
await browser.close();
console.log(
  JSON.stringify(
    {
      captures: shots.length,
      overflow: shots.filter((shot) => shot.overflow).map((shot) => shot.name),
      errors,
      audits: audits.map((a) => ({
        name: a.name,
        violations: a.violations.length,
      })),
      beforeReduced,
      afterReduced,
    },
    null,
    2,
  ),
);
