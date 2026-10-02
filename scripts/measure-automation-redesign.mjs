// Production builds served locally on 3018 (508bfaf) and 3019 (working copy).
// Uses the fictional account prepared by verify-automation-redesign.mjs.
import { chromium } from "playwright";
import fs from "node:fs/promises";
import { gzipSync } from "node:zlib";
const pipeline = JSON.parse(
  await fs.readFile("/tmp/desmos-redesign-visual-pipeline.json", "utf8"),
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = {
  measuredAt: new Date().toISOString(),
  method:
    "Chrome headless, production Webpack, same Mac/API/account, 1440x1000, no CPU/network throttling. In-page performance.now: click until editor input exists plus two rAF; input event plus two rAF. 1 cold + 5 warm opens, 5 input samples. These are local lab latencies, not field INP/FPS or user data. gzip counts computed per fetched/output asset at level 9; not observed wire compression.",
  builds: {},
};
for (const [name, port] of [
  ["base", 3018],
  ["final", 3019],
]) {
  const context = await browser.newContext({
    storageState: "/tmp/desmos-redesign-visual-auth.json",
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const sizes = new Map();
  const tasks = [];
  page.on("response", (response) => {
    const url = response.url();
    if (/\/_next\/static\/.*\.(js|css)(\?|$)/.test(url))
      tasks.push(
        response
          .body()
          .then((body) =>
            sizes.set(url, {
              raw: body.length,
              gzip: gzipSync(body, { level: 9 }).length,
            }),
          ),
      );
  });
  await page.goto(
    `http://localhost:${port}/sales/automations?pipelineId=${pipeline.id}`,
  );
  await page.locator(".automation-directory-row").first().waitFor();
  await Promise.all(tasks);
  const initial = [...sizes.entries()];
  const openMs = [];
  for (let i = 0; i < 6; i++) {
    openMs.push(
      await page.evaluate(async () => {
        const t = performance.now();
        document.querySelector(".automation-directory-row").click();
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
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
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
        const t = performance.now();
        const input = document.querySelector("#automation-name");
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        ).set.call(input, "Proposta " + i);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        );
        return performance.now() - t;
      }, i),
    );
  await Promise.all(tasks);
  const assets = await fs.readdir(
    `/tmp/desmos-redesign-build/${name}/apps/web/.next/static`,
    { recursive: true },
  );
  let jsRaw = 0,
    jsGzip = 0,
    cssRaw = 0,
    cssGzip = 0;
  for (const file of assets.filter((f) => /\.(js|css)$/.test(f))) {
    const data = await fs.readFile(
      `/tmp/desmos-redesign-build/${name}/apps/web/.next/static/${file}`,
    );
    if (file.endsWith(".js")) {
      jsRaw += data.length;
      jsGzip += gzipSync(data, { level: 9 }).length;
    } else {
      cssRaw += data.length;
      cssGzip += gzipSync(data, { level: 9 }).length;
    }
  }
  const sum = (list) => ({
    raw: list.reduce((a, [, s]) => a + s.raw, 0),
    gzip: list.reduce((a, [, s]) => a + s.gzip, 0),
    count: list.length,
  });
  const median = (list) =>
    [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];
  results.builds[name] = {
    allOutput: { jsRaw, jsGzip, cssRaw, cssGzip },
    initialJS: sum(initial.filter(([u]) => /\.js(\?|$)/.test(u))),
    initialCSS: sum(initial.filter(([u]) => /\.css(\?|$)/.test(u))),
    afterEditorJS: sum(
      [...sizes.entries()].filter(([u]) => /\.js(\?|$)/.test(u)),
    ),
    openMs,
    coldOpenMs: openMs[0],
    warmOpenMedianMs: median(openMs.slice(1)),
    inputMs,
    inputMedianMs: median(inputMs),
  };
  await context.close();
}
await browser.close();
await fs.writeFile(
  "docs/evidence/automation-redesign/performance.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
