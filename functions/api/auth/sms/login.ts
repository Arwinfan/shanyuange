import {
  ensureMockUser,
  ensureUserExists,
  fail,
  genId,
  handleOptions,
  isValidChinaMobile,
  maskPhone,
  mockDb,
  normalizePhone,
  ok,
  readBody,
  requireDatabaseOrMock,
} from "../../../_shared";

function normalizeCode(code: unknown) {
  return String(code || "").replace(/\D/g, "");
}

function sessionToken() {
  const random = crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Math.random().toString(36).slice(2);
  return `${genId("sess")}_${random}`;
}

async function mergeD1User(db: any, sourceUserId: string, targetUserId: string) {
  if (!sourceUserId || sourceUserId === targetUserId) return false;
  await ensureUserExists(db, targetUserId);
  await db.prepare("UPDATE service_records SET user_id = ? WHERE user_id = ?").bind(targetUserId, sourceUserId).run();
  await db.prepare("UPDATE orders SET user_id = ? WHERE user_id = ?").bind(targetUserId, sourceUserId).run();
  await db.prepare("UPDATE blessing_lamps SET user_id = ? WHERE user_id = ?").bind(targetUserId, sourceUserId).run();
  await db.prepare("UPDATE incense_offerings SET user_id = ? WHERE user_id = ?").bind(targetUserId, sourceUserId).run();
  await db.prepare("UPDATE OR IGNORE daily_usage SET user_id = ? WHERE user_id = ?").bind(targetUserId, sourceUserId).run();
  return true;
}

function mergeMockUser(sourceUserId: string, targetUserId: string) {
  if (!sourceUserId || sourceUserId === targetUserId) return false;
  const mock = mockDb();
  ensureMockUser(targetUserId);
  mock.records.forEach((item) => { if (item.user_id === sourceUserId) item.user_id = targetUserId; });
  mock.orders.forEach((item) => { if (item.user_id === sourceUserId) item.user_id = targetUserId; });
  mock.lamps.forEach((item) => { if (item.user_id === sourceUserId) item.user_id = targetUserId; });
  mock.incenses.forEach((item) => { if (item.user_id === sourceUserId) item.user_id = targetUserId; });
  mock.usage.forEach((item) => { if (item.user_id === sourceUserId) item.user_id = targetUserId; });
  return true;
}

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const phone = normalizePhone(body.phone);
  const code = normalizeCode(body.code);
  const currentUserId = typeof body.userId === "string" ? body.userId.trim() : "";

  if (!isValidChinaMobile(phone)) return fail("请输入正确的手机号");
  if (!/^\d{6}$/.test(code)) return fail("请输入 6 位验证码");

  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const db = context.env?.DB;

  if (db) {
    const sms = await db.prepare(
      "SELECT * FROM sms_codes WHERE phone = ? AND scene = 'login' AND used_at IS NULL ORDER BY created_at DESC LIMIT 1"
    ).bind(phone).first();

    if (!sms || Date.parse((sms as any).expires_at) < now.getTime()) return fail("验证码已失效，请重新获取");
    if (Number((sms as any).attempts || 0) >= 5) return fail("验证码已失效，请重新获取");
    if ((sms as any).code !== code) {
      await db.prepare("UPDATE sms_codes SET attempts = attempts + 1 WHERE id = ?").bind((sms as any).id).run();
      return fail("验证码不正确");
    }

    const account = await db.prepare("SELECT * FROM user_accounts WHERE phone = ?").bind(phone).first();
    const targetUserId = (account as any)?.user_id || currentUserId || genId("user");
    await ensureUserExists(db, targetUserId);

    if (account) {
      await mergeD1User(db, currentUserId, targetUserId);
    } else {
      await db.prepare(
        "INSERT INTO user_accounts (id, user_id, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
      ).bind(genId("acct"), targetUserId, phone, nowIso, nowIso).run();
    }

    await db.prepare("UPDATE sms_codes SET used_at = ? WHERE id = ?").bind(nowIso, (sms as any).id).run();
    const token = sessionToken();
    await db.prepare(
      "INSERT INTO user_sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(genId("session"), targetUserId, token, expiresAt, nowIso).run();

    return ok({ userId: targetUserId, sessionToken: token, expiresAt, phoneMasked: maskPhone(phone), merged: Boolean(account && currentUserId && currentUserId !== targetUserId) });
  }

  const mock = mockDb();
  const sms = [...mock.smsCodes].reverse().find((item) => item.phone === phone && item.scene === "login" && !item.used_at);
  if (!sms || Date.parse(sms.expires_at) < now.getTime()) return fail("验证码已失效，请重新获取");
  if (sms.attempts >= 5) return fail("验证码已失效，请重新获取");
  if (sms.code !== code) {
    sms.attempts += 1;
    return fail("验证码不正确");
  }

  const account = mock.accounts.find((item) => item.phone === phone);
  const targetUserId = account?.user_id || currentUserId || genId("user");
  ensureMockUser(targetUserId);
  const merged = account ? mergeMockUser(currentUserId, targetUserId) : false;

  if (!account) {
    mock.accounts.push({ id: genId("acct"), user_id: targetUserId, phone, created_at: nowIso, updated_at: nowIso });
  }

  sms.used_at = nowIso;
  const token = sessionToken();
  mock.sessions.push({ id: genId("session"), user_id: targetUserId, token, expires_at: expiresAt, created_at: nowIso });

  return ok({ userId: targetUserId, sessionToken: token, expiresAt, phoneMasked: maskPhone(phone), merged });
}

export async function onRequestOptions() {
  return handleOptions();
}
