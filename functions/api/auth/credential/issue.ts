import { createOpaqueToken, fail, genId, handleOptions, hashSecret, mockDb, ok, readBody, requireDatabaseOrMock } from "../../../_shared";

const CREDENTIAL_PREFIX = "sycred_v2_";
const CREDENTIAL_TTL_MS = 15 * 60 * 1000;

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  if (!userId) return fail("userId 不能为空");

  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + CREDENTIAL_TTL_MS).toISOString();
  const token = createOpaqueToken();
  const tokenHash = await hashSecret(token);
  const db = context.env?.DB;

  if (db) {
    await db.prepare("DELETE FROM account_recovery_tokens WHERE user_id = ? OR expires_at <= ?").bind(userId, nowIso).run();
    await db.prepare(
      "INSERT INTO account_recovery_tokens (id, user_id, token_hash, expires_at, used_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind(genId("cred"), userId, tokenHash, expiresAt, null, nowIso).run();
  } else {
    const mock = mockDb();
    mock.recoveryCredentials = mock.recoveryCredentials.filter((item) => item.user_id !== userId && Date.parse(item.expires_at) > now.getTime());
    mock.recoveryCredentials.push({ id: genId("cred"), user_id: userId, token_hash: tokenHash, expires_at: expiresAt, used_at: null, created_at: nowIso });
  }

  return ok({ credential: `${CREDENTIAL_PREFIX}${token}`, expiresAt });
}

export async function onRequestOptions() { return handleOptions(); }