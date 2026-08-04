import { envValue, fail, handleOptions, mockDb, ok, readBody, requireDatabaseOrMock } from "../../_shared";
import { REPORT_STATUSES, WISH_STATUSES } from "../../_wishes";

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function adminError(request: Request, env: any) {
  const configuredKey = envValue(env, "ADMIN_ACCESS_KEY");
  if (!configuredKey) return fail("管理员访问尚未配置", 503);
  const suppliedKey = request.headers.get("X-Admin-Key")?.trim() || "";
  return suppliedKey === configuredKey ? null : fail("管理员访问密钥不正确", 401);
}

function readPage(value: string | null, fallback: number, maximum: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(1, parsed)) : fallback;
}

function toAdminItem(row: any) {
  return {
    reportId: row.report_id,
    reportStatus: REPORT_STATUSES.includes(row.report_status) ? row.report_status : "received",
    reportReason: row.reason,
    reportDetail: row.detail ?? null,
    reportedAt: row.reported_at,
    reportUpdatedAt: row.report_updated_at ?? row.reported_at,
    wishId: row.wish_id,
    userId: row.user_id,
    nickname: row.nickname_masked,
    category: row.category,
    content: row.content,
    color: row.color,
    noteStatus: WISH_STATUSES.includes(row.note_status) ? row.note_status : "visible",
    likeCount: Number(row.like_count || 0),
    createdAt: row.created_at,
  };
}

function countReportStatuses(rows: any[]) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const status = REPORT_STATUSES.includes(row.status) ? row.status : "received";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, { received: 0, reviewing: 0, resolved: 0 });
}

export async function onRequestGet(context: any) {
  const accessError = adminError(context.request, context.env);
  if (accessError) return accessError;
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  const url = new URL(context.request.url);
  const reportStatus = readText(url.searchParams.get("reportStatus"));
  const noteStatus = readText(url.searchParams.get("noteStatus"));
  const keyword = readText(url.searchParams.get("keyword")).slice(0, 80);
  const page = readPage(url.searchParams.get("page"), 1, 100000);
  const pageSize = readPage(url.searchParams.get("pageSize"), 20, 50);
  const db = context.env?.DB;

  if (db) {
    const where: string[] = [];
    const bindings: unknown[] = [];
    if (REPORT_STATUSES.includes(reportStatus as any)) { where.push("r.status = ?"); bindings.push(reportStatus); }
    if (WISH_STATUSES.includes(noteStatus as any)) { where.push("n.status = ?"); bindings.push(noteStatus); }
    if (keyword) {
      const like = `%${keyword}%`;
      where.push("(n.nickname_raw LIKE ? OR n.content LIKE ? OR r.detail LIKE ?)");
      bindings.push(like, like, like);
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const select = `SELECT r.id AS report_id, r.status AS report_status, r.reason, r.detail, r.created_at AS reported_at, r.updated_at AS report_updated_at,
      n.id AS wish_id, n.user_id, n.nickname_masked, n.category, n.content, n.color, n.status AS note_status, n.like_count, n.created_at
      FROM wish_reports r JOIN wish_notes n ON n.id = r.wish_id ${whereClause}
      ORDER BY CASE WHEN r.status = 'received' THEN 0 WHEN r.status = 'reviewing' THEN 1 ELSE 2 END, r.created_at DESC
      LIMIT ? OFFSET ?`;
    const [list, total, statuses] = await Promise.all([
      db.prepare(select).bind(...bindings, pageSize, (page - 1) * pageSize).all(),
      db.prepare(`SELECT COUNT(*) AS total FROM wish_reports r JOIN wish_notes n ON n.id = r.wish_id ${whereClause}`).bind(...bindings).first(),
      db.prepare("SELECT status, COUNT(*) AS total FROM wish_reports GROUP BY status").all(),
    ]);
    const counts = countReportStatuses((statuses.results || []).map((row: any) => ({ status: row.status })));
    for (const statusRow of statuses.results || []) counts[(statusRow as any).status] = Number((statusRow as any).total || 0);
    return ok({ items: (list.results || []).map(toAdminItem), total: Number((total as any)?.total || 0), page, pageSize, counts });
  }

  const mock = mockDb();
  const normalizedKeyword = keyword.toLocaleLowerCase();
  const all = mock.wishReports.map((report) => {
    const note = mock.wishes.find((wish) => wish.id === report.wish_id);
    return note ? { ...report, report_id: report.id, report_status: report.status, reported_at: report.created_at, report_updated_at: report.updated_at, wish_id: note.id, user_id: note.user_id, nickname_masked: note.nickname_masked, category: note.category, content: note.content, color: note.color, note_status: note.status, like_count: note.like_count, created_at: note.created_at } : null;
  }).filter(Boolean) as any[];
  const filtered = all.filter((item) => !reportStatus || item.report_status === reportStatus)
    .filter((item) => !noteStatus || item.note_status === noteStatus)
    .filter((item) => !normalizedKeyword || [item.nickname_masked, item.content, item.detail].filter(Boolean).join(" ").toLocaleLowerCase().includes(normalizedKeyword))
    .sort((left, right) => Date.parse(right.reported_at) - Date.parse(left.reported_at));
  return ok({ items: filtered.slice((page - 1) * pageSize, page * pageSize).map(toAdminItem), total: filtered.length, page, pageSize, counts: countReportStatuses(mock.wishReports) });
}

export async function onRequestPost(context: any) {
  const accessError = adminError(context.request, context.env);
  if (accessError) return accessError;
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;
  const body = await readBody(context.request);
  const action = readText(body?.action);
  const now = new Date().toISOString();
  const db = context.env?.DB;

  if (action === "setNoteStatus") {
    const wishId = readText(body?.wishId);
    const status = readText(body?.status);
    if (!wishId || !["visible", "hidden"].includes(status)) return fail("便利签状态不正确");
    if (db) {
      const result = await db.prepare("UPDATE wish_notes SET status = ?, updated_at = ? WHERE id = ? AND status != 'deleted'").bind(status, now, wishId).run();
      if (!Number(result.meta?.changes || 0)) return fail("便利签不存在或已删除", 404);
    } else {
      const item = mockDb().wishes.find((wish) => wish.id === wishId && wish.status !== "deleted");
      if (!item) return fail("便利签不存在或已删除", 404);
      item.status = status;
      item.updated_at = now;
    }
    return ok({ wishId, status });
  }

  if (action === "setReportStatus") {
    const reportId = readText(body?.reportId);
    const status = readText(body?.status);
    if (!reportId || !REPORT_STATUSES.includes(status as any)) return fail("举报处理状态不正确");
    if (db) {
      const result = await db.prepare("UPDATE wish_reports SET status = ?, updated_at = ? WHERE id = ?").bind(status, now, reportId).run();
      if (!Number(result.meta?.changes || 0)) return fail("举报记录不存在", 404);
    } else {
      const item = mockDb().wishReports.find((report) => report.id === reportId);
      if (!item) return fail("举报记录不存在", 404);
      item.status = status;
      item.updated_at = now;
    }
    return ok({ reportId, status });
  }

  return fail("不支持的管理操作");
}

export async function onRequestOptions() { return handleOptions(); }
