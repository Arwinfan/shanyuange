import { createUserSession, fail, handleOptions, hashSecret, mockDb, ok, readBody, requireDatabaseOrMock } from "../../../_shared";

const CREDENTIAL_PREFIX = "sycred_v2_";

function normalizeCredential(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.startsWith(CREDENTIAL_PREFIX) ? text.slice(CREDENTIAL_PREFIX.length) : "";
}

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const token = normalizeCredential(body?.credential);
  if (!/^[a-f0-9]{64}$/i.test(token)) return fail("账号凭证格式不正确");

  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  const now = new Date();
  const nowIso = now.toISOString();
  const tokenHash = await hashSecret(token);
  const db = context.env?.DB;
  let userId = "";

  if (db) {
    const row = await db.prepare(
      "SELECT id, user_id FROM account_recovery_tokens WHERE token_hash = ? AND expires_at > ? LIMIT 1",
    ).bind(tokenHash, nowIso).first();
    if (!row) return fail("账号凭证已失效或已使用，请在原设备重新生成", 404);
    await db.prepare("UPDATE account_recovery_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL")
      .bind(nowIso, (row as any).id).run();
    userId = (row as any).user_id;
  } else {
    const row = mockDb().recoveryCredentials.find((item) => item.token_hash === tokenHash && Date.parse(item.expires_at) > now.getTime());
    if (!row) return fail("账号凭证已失效或已使用，请在原设备重新生成", 404);
    row.used_at = nowIso;
    userId = row.user_id;
  }

  const session = await createUserSession(context.env, userId);
  return ok({ userId, sessionToken: session.token, expiresAt: session.expiresAt });
}

export async function onRequestOptions() { return handleOptions(); }