import { fail, handleOptions, mockDb, ok, readBody, requireDatabaseOrMock } from "../../../_shared";

function safeJson(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  const confirmed = body?.confirmed === true;
  if (!userId) return fail("userId 不能为空");
  if (!confirmed) return fail("请确认注销与删除请求");

  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;
  const deletedAt = new Date().toISOString();
  const db = context.env?.DB;

  if (db) {
    const records = await db.prepare("SELECT request_data FROM service_records WHERE user_id = ?").bind(userId).all();
    if (context.env?.R2?.delete) {
      await Promise.all((records.results || []).map(async (record: any) => {
        const imageKey = safeJson(record.request_data)?.imageKey;
        if (typeof imageKey === "string" && imageKey) await context.env.R2.delete(imageKey).catch(() => {});
      }));
    }
    await db.prepare("DELETE FROM feedback WHERE user_id = ?").bind(userId).run();
    await db.prepare("DELETE FROM daily_usage WHERE user_id = ?").bind(userId).run();
    await db.prepare("DELETE FROM blessing_lamps WHERE user_id = ?").bind(userId).run();
    await db.prepare("DELETE FROM incense_offerings WHERE user_id = ?").bind(userId).run();
    await db.prepare("DELETE FROM orders WHERE user_id = ?").bind(userId).run();
    await db.prepare("DELETE FROM service_records WHERE user_id = ?").bind(userId).run();
    await db.prepare("DELETE FROM account_recovery_tokens WHERE user_id = ?").bind(userId).run();
    await db.prepare("DELETE FROM user_sessions WHERE user_id = ?").bind(userId).run();
    await db.prepare("DELETE FROM user_accounts WHERE user_id = ?").bind(userId).run();
    await db.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
  } else {
    const mock = mockDb();
    mock.feedback = mock.feedback.filter((item) => item.user_id !== userId);
    mock.usage = mock.usage.filter((item) => item.user_id !== userId);
    mock.lamps = mock.lamps.filter((item) => item.user_id !== userId);
    mock.incenses = mock.incenses.filter((item) => item.user_id !== userId);
    mock.orders = mock.orders.filter((item) => item.user_id !== userId);
    mock.records = mock.records.filter((item) => item.user_id !== userId);
    mock.recoveryCredentials = mock.recoveryCredentials.filter((item) => item.user_id !== userId);
    mock.sessions = mock.sessions.filter((item) => item.user_id !== userId);
    mock.accounts = mock.accounts.filter((item) => item.user_id !== userId);
    mock.users = mock.users.filter((item) => item.id !== userId);
  }

  return ok({ deletedAt });
}

export async function onRequestOptions() { return handleOptions(); }