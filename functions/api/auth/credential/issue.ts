import { createOpaqueToken, fail, genId, handleOptions, hashSecret, mockDb, ok, readBody, requireDatabaseOrMock } from "../../../_shared";

const CREDENTIAL_PREFIX = "sycred_v2_";
// 恢复凭证直至用户重新生成或注销账号才失效。
const RECOVERY_CREDENTIAL_EXPIRES_AT = "2099-12-31T23:59:59.999Z";

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  if (!userId) return fail("userId 不能为空");

  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = RECOVERY_CREDENTIAL_EXPIRES_AT;
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