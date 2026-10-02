import { chromium, expect } from "@playwright/test";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const output = "docs/evidence/pdf-completion";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const setup = await browser.newContext({ baseURL: "http://localhost:3030" });
const stamp = Date.now();
expect(
  (
    await setup.request.post("/api/auth/register", {
      headers: { Origin: "http://localhost:3017" },
      data: {
        name: "Laboratório de performance",
        companyName: `Performance PDF fictícia ${stamp}`,
        email: `perf-pdf-${stamp}@example.test`,
        password: `Desmos-Performance-${stamp}!`,
      },
    })
  ).status(),
).toBe(201);
const response = await setup.request.post("/api/sales/pipelines", {
  headers: { Origin: "http://localhost:3017" },
  data: {
    name: "Performance PDF",
    stages: [{ name: "Entrada", color: "#405670", probability: 10 }],
  },
});
expect(response.status()).toBe(201);
const pipeline = (await response.json()).item;
const auth = await setup.storageState();
await setup.close();
const results = {
  measuredAt: new Date().toISOString(),
  baselineCommit: "bbd6fc63b369ed6a18cfc0c272d5546e764437b6",
  method:
    "Fresh production Webpack builds of baseline HEAD and final source, same Mac/API/fictitious account, Chrome headless 1440x1000, no CPU/network throttling. Each build gets a fresh browser context. 1 cold+5 warm common automation editor opens; click to input mounted +2 rAF. 5 input-to-two-rAF samples. 40 rAF frames during common editor step switches with observed Long Tasks. gzip level9 per asset is computed size, not wire traffic. Not field INP, human speed or physical-device FPS. Final reduced-motion runtime sampled separately.",
  builds: {},
};
try {
  for (const [label, port, dir] of [
    ["baseline", 3031, "/tmp/desmos-pdf-baseline"],
    ["final", 3030, "/tmp/desmos-pdf-build"],
  ]) {
    const context = await browser.newContext({
      storageState: auth,
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage(),
      assets = new Map(),
      pending = [];
    page.on("response", (response) => {
      if (/\/_next\/static\/.*\.(js|css)(\?|$)/.test(response.url()))
        pending.push(
          response
            .body()
            .then((body) =>
              assets.set(new URL(response.url()).pathname, {
                raw: body.length,
                gzip: gzipSync(body, { level: 9 }).length,
              }),
            )
            .catch(() => {}),
        );
    });
    await page.goto(
      `http://localhost:${port}/sales/automations?pipelineId=${pipeline.id}`,
    );
    await expect(
      page.getByRole("button", { name: "Criar automação", exact: true }),
    ).toBeVisible();
    await Promise.all(pending);
    const initial = [...assets.entries()];
    // Exact modern script tags from SSR HTML exclude speculative Link prefetch.
    const html = await (
      await context.request.get(
        `http://localhost:${port}/sales/automations?pipelineId=${pipeline.id}`,
      )
    ).text();
    const routeScripts = [
      ...new Set(
        [...html.matchAll(/<script\b[^>]*>/g)]
          .filter(([tag]) => !/nomodule/i.test(tag))
          .map(([tag]) => tag.match(/src="([^"]+)"/)?.[1])
          .filter(
            (src) => src?.startsWith("/_next/static/") && src.endsWith(".js"),
          ),
      ),
    ];
    let routeScriptJsGzip = 0;
    for (const src of routeScripts)
      routeScriptJsGzip += gzipSync(
        await readFile(
          `${dir}/apps/web/.next/${decodeURIComponent(src.replace(/^\/_next\//, ""))}`,
        ),
        { level: 9 },
      ).length;
    const openMs = [];
    for (let i = 0; i < 6; i++) {
      openMs.push(
        await page.evaluate(async () => {
          const t = performance.now();
          [...document.querySelectorAll("button")]
            .find((el) => el.textContent.trim() === "Criar automação")
            .click();
          await new Promise((resolve) => {
            if (document.querySelector("#automation-name")) return resolve();
            const observer = new MutationObserver(() => {
              if (document.querySelector("#automation-name")) {
                observer.disconnect();
                resolve();
              }
            });
            observer.observe(document.body, { childList: true, subtree: true });
          });
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          );
          return performance.now() - t;
        }),
      );
      if (i < 5)
        await page
          .getByRole("button", { name: "Voltar às automações", exact: true })
          .click();
    }
    const inputMs = [];
    for (let i = 0; i < 5; i++)
      inputMs.push(
        await page.evaluate(async (i) => {
          const t = performance.now(),
            input = document.querySelector("#automation-name");
          Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value",
          ).set.call(input, `Teste ${i}`);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          );
          return performance.now() - t;
        }, i),
      );
    const frames = await page.evaluate(async () => {
      const gaps = [],
        longTasks = [];
      const observer = new PerformanceObserver((list) =>
        longTasks.push(...list.getEntries().map((entry) => entry.duration)),
      );
      observer.observe({ type: "longtask" });
      let previous = performance.now();
      for (let i = 0; i < 40; i++) {
        const time = await new Promise(requestAnimationFrame);
        gaps.push(time - previous);
        previous = time;
        if (i % 6 === 0)
          document
            .querySelectorAll(".automation-progress button")
            [i % 12 === 0 ? 1 : 0]?.click();
      }
      observer.disconnect();
      const sorted = gaps.slice(1).sort((a, b) => a - b);
      return {
        count: sorted.length,
        p95FrameGapMs: sorted[Math.floor(sorted.length * 0.95)],
        maxFrameGapMs: sorted.at(-1),
        observedLongTasksMs: longTasks,
      };
    });
    await Promise.all(pending);
    const staticFiles = await readdir(`${dir}/apps/web/.next/static`, {
      recursive: true,
    });
    let totalJsRaw = 0,
      totalJsGzip = 0;
    for (const file of staticFiles.filter((file) => file.endsWith(".js"))) {
      const body = await readFile(`${dir}/apps/web/.next/static/${file}`);
      totalJsRaw += body.length;
      totalJsGzip += gzipSync(body, { level: 9 }).length;
    }
    const median = (values) =>
      [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
    results.builds[label] = {
      initialAssets: initial,
      routeScripts,
      routeScriptJsGzip,
      initialJsGzip: initial
        .filter(([path]) => path.endsWith(".js"))
        .reduce((sum, [, asset]) => sum + asset.gzip, 0),
      totalJsRaw,
      totalJsGzip,
      openMs,
      warmOpenMedianMs: median(openMs.slice(1)),
      inputMs,
      inputMedianMs: median(inputMs),
      frames,
    };
    if (label === "final") {
      await page.emulateMedia({ reducedMotion: "reduce" });
      results.reducedMotion = await page.evaluate(async () => {
        document.querySelectorAll(".automation-progress button")[0]?.click();
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
        return {
          matches: matchMedia("(prefers-reduced-motion: reduce)").matches,
          activeAnimations: document
            .getAnimations()
            .filter((animation) => animation.playState === "running").length,
        };
      });
      expect(
        (
          await context.request.post(
            `http://localhost:${port}/api/sales/deals`,
            {
              headers: { Origin: "http://localhost:3017" },
              data: {
                title: "Negócio fictício de verificação",
                pipelineId: pipeline.id,
                stageId: pipeline.stages[0].id,
                currency: "BRL",
                value: "900.00",
                source: "Laboratório",
              },
            },
          )
        ).status(),
      ).toBe(201);
      await page.goto(
        `http://localhost:${port}/sales/deals?pipelineId=${pipeline.id}`,
      );
      await page.getByLabel("Origem", { exact: true }).fill("Laboratório");
      await expect(
        page.getByRole("link", {
          name: "Negócio fictício de verificação",
          exact: true,
        }),
      ).toBeVisible();
      await page.screenshot({
        path: `${output}/09-deals-filters-desktop-production.png`,
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: "Ativar tema escuro" }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      await page.screenshot({
        path: `${output}/10-deals-filters-mobile-dark-production.png`,
        fullPage: true,
      });
    }
    await context.close();
  }
  await writeFile(
    `${output}/performance.json`,
    JSON.stringify(results, null, 2),
  );
  console.log(
    JSON.stringify({
      baseline: results.builds.baseline,
      final: results.builds.final,
      reducedMotion: results.reducedMotion,
    }),
  );
} finally {
  await browser.close();
}
