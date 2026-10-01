import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = `${root}.env`;
if (existsSync(destination)) {
  console.log(".env existente preservado.");
} else {
  const content = readFileSync(`${root}.env.example`, "utf8")
    .replace(
      "replace-with-at-least-32-random-characters",
      randomBytes(48).toString("hex"),
    )
    .replace(
      "replace-with-a-local-demo-password",
      `Orbit-${randomBytes(12).toString("base64url")}!`,
    );
  writeFileSync(destination, content, { mode: 0o600 });
  console.log(
    ".env criado com segredos aleatórios. A senha do seed está em DEMO_PASSWORD.",
  );
}
