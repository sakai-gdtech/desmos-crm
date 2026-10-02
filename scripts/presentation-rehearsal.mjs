// Current rehearsal creates isolated fictional companies; never resets existing data.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
const startedAt = new Date().toISOString();
const result = await new Promise((resolve, reject) => {
  const child = spawn(
    "npx",
    [
      "playwright",
      "test",
      "tests/e2e/pdf-completion.spec.ts",
      "--reporter=json",
    ],
    {
      env: { ...process.env, PLAYWRIGHT_CHANNEL: "chrome" },
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  child.on("error", reject);
  child.on("exit", (code) => {
    try {
      resolve({ exitCode: code, report: JSON.parse(output) });
    } catch (error) {
      reject(error);
    }
  });
});
await mkdir("docs/evidence/pdf-completion", { recursive: true });
await writeFile(
  "docs/evidence/pdf-completion/rehearsal.json",
  JSON.stringify(
    {
      startedAt,
      finishedAt: new Date().toISOString(),
      method:
        "Current PDF rehearsal; three UI scenarios with isolated fictional companies, no fixture reset, no external sending.",
      ...result,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    startedAt,
    exitCode: result.exitCode,
    stats: result.report.stats,
  }),
);
if (result.exitCode) process.exit(result.exitCode);
