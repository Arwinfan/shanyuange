import { handleOptions, ok, fail, mockDb, requireDatabaseOrMock } from "../../_shared";
import { recordSummary, recordTitle } from "../../_business";

function toRecordItem(row: any) {
  const preview = typeof row.preview_data === "string" ? JSON.parse(row.preview_data || "{}") : row.preview || {};
  return {
    recordId: row.id || row.recordId,
    type: row.type,
    title: recordTitle(row.type, preview),
    summary: recordSummary(row.type, preview),
    paid: row.paid === 1 || row.paid === true,
    status: row.status,
    createdAt: row.created_at || row.createdAt,
  };
}

export async function onRequestGet(context: any) {
  const url = new URL(context.request.url);
  const userId = url.searchParams.get("userId");
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20");

  if (!userId) return fail("userId 不能为空");

  const db = context.env?.DB;
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  if (db) {
    const result = await db.prepare(
      "SELECT id, type, status, paid, preview_data, created_at FROM service_records WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).bind(userId, pageSize, (page - 1) * pageSize).all();
    const countResult = await db.prepare("SELECT COUNT(*) as total FROM service_records WHERE user_id = ?").bind(userId).first();
    return ok({ items: (result.results || []).map(toRecordItem), total: (countResult as any)?.total || 0, page, pageSize });
  }

  const userRecords = mockDb().records.filter(r => r.user_id === userId);
  const paged = userRecords.slice((page - 1) * pageSize, page * pageSize);
  const items = paged.map(toRecordItem);

  return ok({ items, total: userRecords.length, page, pageSize });
}

export async function onRequestOptions() { return handleOptions(); }
