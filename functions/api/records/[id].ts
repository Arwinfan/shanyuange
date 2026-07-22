import { handleOptions, ok, fail, mockDb, requireDatabaseOrMock } from "../../_shared";
import { buildFullResultFromRecord, recordSummary, recordTitle } from "../../_business";

function safeJson(text: string | null | undefined) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function buildRecordPayload(record: any) {
  const preview = safeJson(record.preview_data) || {};
  const requestData = safeJson(record.request_data) || {};
  const storedFull = safeJson(record.full_data);
  const paid = record.paid === 1 || record.paid === true;
  const fullResult = storedFull || buildFullResultFromRecord(record.type, requestData, preview);
  const data: any = {
    recordId: record.id,
    type: record.type,
    title: recordTitle(record.type, preview),
    summary: recordSummary(record.type, preview),
    status: record.status,
    paid,
    preview,
    createdAt: record.created_at,
  };

  if (paid && fullResult) data.fullResult = fullResult;
  return data;
}

export async function onRequestGet(context: any) {
  const url = new URL(context.request.url);
  const userId = url.searchParams.get("userId");
  // 从路径提取 recordId: /api/records/rec_xxx
  const pathParts = url.pathname.split("/");
  const recordId = pathParts[pathParts.length - 1];

  if (!userId) return fail("userId 不能为空");
  if (!recordId) return fail("recordId 不能为空");

  const db = context.env?.DB;
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  if (db) {
    const record = await db.prepare(
      "SELECT * FROM service_records WHERE id = ? AND user_id = ?"
    ).bind(recordId, userId).first();
    if (!record) return fail("记录不存在", 404);
    return ok(buildRecordPayload(record));
  }

  const record = mockDb().records.find(r => r.id === recordId && r.user_id === userId);
  if (!record) return fail("记录不存在", 404);

  return ok(buildRecordPayload(record));
}

export async function onRequestOptions() { return handleOptions(); }
