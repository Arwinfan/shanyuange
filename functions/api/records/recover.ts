import { handleOptions, ok, fail, mockDb, requireDatabaseOrMock } from "../../_shared";
import { buildFullResultFromRecord, recordSummary, recordTitle } from "../../_business";

function safeJson(text: string | null | undefined) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function toRecoveredRecord(record: any, ownerVerified = false) {
  const preview = safeJson(record.preview_data) || {};
  const requestData = safeJson(record.request_data) || {};
  const paid = record.paid === 1 || record.paid === true;
  const fullResult = safeJson(record.full_data) || buildFullResultFromRecord(record.type, requestData, preview);
  const payload: any = {
    recordId: record.id,
    type: record.type,
    title: recordTitle(record.type, preview),
    summary: recordSummary(record.type, preview),
    status: record.status,
    paid,
    preview,
    createdAt: record.created_at,
  };
  if (paid && ownerVerified) {
    payload.fullResult = fullResult;
  } else if (paid) {
    payload.protected = true;
    payload.message = "该记录已解锁，出于隐私保护，仅当前浏览器身份可查看完整内容。";
  }
  return payload;
}

export async function onRequestGet(context: any) {
  const url = new URL(context.request.url);
  const recordId = url.searchParams.get("recordId") || "";
  const userId = url.searchParams.get("userId") || "";

  if (!/^rec_[a-z0-9]+$/i.test(recordId)) return fail("请输入有效记录号");

  const db = context.env?.DB;
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  if (db) {
    const record = await db.prepare("SELECT * FROM service_records WHERE id = ?").bind(recordId).first();
    if (!record) return fail("记录不存在", 404);
    return ok(toRecoveredRecord(record, Boolean(userId && (record as any).user_id === userId)));
  }

  const record = mockDb().records.find((item) => item.id === recordId);
  if (!record) return fail("记录不存在", 404);
  return ok(toRecoveredRecord(record, Boolean(userId && record.user_id === userId)));
}

export async function onRequestOptions() { return handleOptions(); }
