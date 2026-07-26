import { fail, handleOptions, mockDb, ok, readBody, requireDatabaseOrMock } from "../../../_shared";

function safeJson(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

function recordPayload(row: any) {
  return {
    recordId: row.id,
    type: row.type,
    status: row.status,
    paid: Boolean(row.paid),
    preview: safeJson(row.preview_data),
    fullResult: safeJson(row.full_data),
    submitted: safeJson(row.request_data),
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  if (!userId) return fail("userId 不能为空");

  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;
  const generatedAt = new Date().toISOString();
  const db = context.env?.DB;

  if (db) {
    const [account, records, lamps, incense, feedback] = await Promise.all([
      db.prepare("SELECT phone, created_at, updated_at FROM user_accounts WHERE user_id = ? ORDER BY created_at DESC").bind(userId).all(),
      db.prepare("SELECT * FROM service_records WHERE user_id = ? ORDER BY created_at DESC").bind(userId).all(),
      db.prepare("SELECT name_raw, donor_name_raw, relation, lamp_type, duration, wish, created_at FROM blessing_lamps WHERE user_id = ? ORDER BY created_at DESC").bind(userId).all(),
      db.prepare("SELECT dedication, wish, status, started_at, ends_at, created_at FROM incense_offerings WHERE user_id = ? ORDER BY created_at DESC").bind(userId).all(),
      db.prepare("SELECT category, page_path, content, contact, status, created_at, updated_at FROM feedback WHERE user_id = ? ORDER BY created_at DESC").bind(userId).all(),
    ]);
    return ok({ generatedAt, account: account.results || [], records: (records.results || []).map(recordPayload), lamps: lamps.results || [], incense: incense.results || [], feedback: feedback.results || [] });
  }

  const mock = mockDb();
  return ok({
    generatedAt,
    account: mock.accounts.filter((item) => item.user_id === userId),
    records: mock.records.filter((item) => item.user_id === userId).map(recordPayload),
    lamps: mock.lamps.filter((item) => item.user_id === userId),
    incense: mock.incenses.filter((item) => item.user_id === userId),
    feedback: mock.feedback.filter((item) => item.user_id === userId),
  });
}

export async function onRequestOptions() { return handleOptions(); }