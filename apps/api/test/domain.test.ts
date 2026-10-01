import { test } from "node:test";
import { scryptSync } from "node:crypto";
import assert from "node:assert/strict";
import { config as dotenv } from "dotenv";
import { fileURLToPath } from "node:url";
dotenv({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});
const {
  hashPassword,
  verifyPassword,
  opaqueToken,
  tokenHash,
  signAccess,
  verifyAccess,
  needsPasswordRehash,
} = await import("../src/shared/crypto.js");
const { hasPermission, roles } =
  await import("../src/modules/iam/domain/permissions.js");
test("scrypt usa salt individual, verifica segredo correto e rejeita hashes malformados", async () => {
  const password = "A-strong-password-123";
  const [first, second] = await Promise.all([
    hashPassword(password),
    hashPassword(password),
  ]);
  assert.ok(first.startsWith("scrypt:131072:8:1:"));
  assert.equal(needsPasswordRehash(first), false);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword("wrong-password", first), false);
  for (const malformed of [
    "",
    "sha256:hello",
    first + ":extra",
    first.replace("131072", "2147483647"),
    first.replace(/:[^:]+$/, ":zz"),
  ])
    assert.equal(await verifyPassword(password, malformed), false);
});
test("tokens opacos têm alta entropia e persistência por digest fixo", () => {
  const values = Array.from({ length: 100 }, opaqueToken);
  assert.equal(new Set(values).size, 100);
  assert.ok(values.every((value) => value.length === 43));
  assert.equal(tokenHash(values[0]!).length, 64);
  assert.notEqual(tokenHash(values[0]!), values[0]);
});
test("JWT access valida assinatura, issuer/audience e TTL de quinze minutos", async () => {
  const token = await signAccess("user-id", "session-id");
  assert.deepEqual(await verifyAccess(token), {
    userId: "user-id",
    sessionId: "session-id",
  });
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1]!, "base64url").toString(),
  );
  assert.equal(payload.exp - payload.iat, 900);
  assert.equal(payload.iss, "orbit-api");
  assert.equal(payload.aud, "orbit-web");
  const chunks = token.split(".");
  chunks[1] = Buffer.from(
    JSON.stringify({ ...payload, sub: "another-user" }),
  ).toString("base64url");
  await assert.rejects(verifyAccess(chunks.join(".")));
});
test("política central nega cargos desconhecidos e restringe administração/auditoria", () => {
  for (const role of roles)
    assert.equal(hasPermission(role, "sessions.manage"), true);
  for (const role of ["OWNER", "ADMIN"]) {
    assert.equal(hasPermission(role, "audit.view"), true);
    assert.equal(hasPermission(role, "users.manage"), true);
  }
  for (const role of [
    "MANAGER",
    "SALES",
    "SUPPORT",
    "VIEWER",
    "__proto__",
    "UNKNOWN",
  ]) {
    assert.equal(hasPermission(role, "audit.view"), false);
    assert.equal(hasPermission(role, "settings.manage"), false);
    assert.equal(hasPermission(role, "users.manage"), false);
  }
});

test("hashes legados são aceitos somente com a senha correta e sinalizam atualização", async () => {
  const password = "Legacy-password-123!";
  const salt = "abcd".repeat(8);
  const hash = scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  }).toString("hex");
  const encoded = `scrypt:16384:8:1:${salt}:${hash}`;
  assert.equal(needsPasswordRehash(encoded), true);
  assert.equal(await verifyPassword(password, encoded), true);
  assert.equal(await verifyPassword("wrong-password", encoded), false);
});
