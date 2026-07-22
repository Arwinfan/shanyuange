import { fail, handleOptions, mockDb, ok, readBody, requireDatabaseOrMock } from "../../_shared";

function safeJson(text: string | null | undefined) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const { userId, recordId } = body || {};

  if (!userId) return fail("userId 不能为空");
  if (!recordId) return fail("recordId 不能为空");

  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  const db = context.env?.DB;
  if (db) {
    const record = await db.prepare("SELECT * FROM service_records WHERE id = ? AND user_id = ? AND type = 'fortune_palmistry'")
      .bind(recordId, userId).first();
    if (!record) return fail("记录不存在", 404);

    const requestData = safeJson((record as any).request_data) || {};
    if (requestData.imageKey && context.env?.R2?.delete) {
      await context.env.R2.delete(requestData.imageKey);
    }

    const nextRequestData = { ...requestData, imageBase64: "[deleted]", imageDeleted: true, imageDeletedAt: new Date().toISOString() };
    await db.prepare("UPDATE service_records SET request_data = ?, updated_at = ? WHERE id = ?")
      .bind(JSON.stringify(nextRequestData), nextRequestData.imageDeletedAt, recordId).run();
    return ok({ recordId, imageDeleted: true });
  }

  const record = mockDb().records.find((item) => item.id === recordId && item.user_id === userId && item.type === "fortune_palmistry");
  if (!record) return fail("记录不存在", 404);
  const requestData = safeJson(record.request_data) || {};
  record.request_data = JSON.stringify({ ...requestData, imageBase64: "[deleted]", imageDeleted: true, imageDeletedAt: new Date().toISOString() });
  return ok({ recordId, imageDeleted: true });
}

export async function onRequestOptions() { return handleOptions(); }
