import {
  envValue,
  fail,
  genId,
  handleOptions,
  isMockSmsAllowed,
  isValidChinaMobile,
  maskPhone,
  mockDb,
  normalizePhone,
  ok,
  readBody,
  requireDatabaseOrMock,
} from "../../../_shared";

const SMS_EXPIRES_SECONDS = 300;

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const phone = normalizePhone(body.phone);
  if (!isValidChinaMobile(phone)) return fail("请输入正确的手机号");

  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  if (!isMockSmsAllowed(context.env)) {
    return fail("短信服务暂未开放，请稍后再试", 503);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + SMS_EXPIRES_SECONDS * 1000).toISOString();
  const code = envValue(context.env, "MOCK_SMS_CODE") || "123456";
  const db = context.env?.DB;

  if (db) {
    const recent = await db.prepare(
      "SELECT COUNT(*) as total FROM sms_codes WHERE phone = ? AND created_at >= ?"
    ).bind(phone, new Date(now.getTime() - 60_000).toISOString()).first();
    if (Number((recent as any)?.total || 0) >= 1) return fail("验证码已发送，请稍后再试");

    await db.prepare(
      "INSERT INTO sms_codes (id, phone, code, scene, expires_at, used_at, attempts, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(genId("sms"), phone, code, "login", expiresAt, null, 0, nowIso).run();
  } else {
    const mock = mockDb();
    const recent = mock.smsCodes.some((item) => item.phone === phone && Date.parse(item.created_at) >= now.getTime() - 60_000);
    if (recent) return fail("验证码已发送，请稍后再试");
    mock.smsCodes.push({
      id: genId("sms"),
      phone,
      code,
      scene: "login",
      expires_at: expiresAt,
      used_at: null,
      attempts: 0,
      created_at: nowIso,
    });
  }

  return ok({ phoneMasked: maskPhone(phone), expiresIn: SMS_EXPIRES_SECONDS });
}

export async function onRequestOptions() {
  return handleOptions();
}
