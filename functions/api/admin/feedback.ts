import {
  envValue,
  fail,
  handleOptions,
  mockDb,
  ok,
  readBody,
  requireDatabaseOrMock,
} from "../../_shared";

const CATEGORIES = ["suggestion", "issue", "content", "service", "other"] as const;
const STATUSES = ["received", "reviewing", "resolved"] as const;

type FeedbackStatus = (typeof STATUSES)[number];

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toFeedbackItem(row: any) {
  return {
    feedbackId: row.id,
    userId: row.user_id,
    category: CATEGORIES.includes(row.category) ? row.category : "other",
    pagePath: row.page_path ?? null,
    content: row.content,
    contact: row.contact ?? null,
    status: STATUSES.includes(row.status) ? row.status : "received",
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function adminError(request: Request, env: any) {
  const configuredKey = envValue(env, "ADMIN_ACCESS_KEY");
  if (!configuredKey) return fail("管理员访问尚未配置", 503);

  const suppliedKey = request.headers.get("X-Admin-Key")?.trim() || "";
  if (!suppliedKey || suppliedKey !== configuredKey) {
    return fail("管理员访问密钥不正确", 401);
  }
  return null;
}

function readPage(value: string | null, fallback: number, maximum: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(1, parsed)) : fallback;
}

function buildFilters(url: URL) {
  const status = readText(url.searchParams.get("status"));
  const category = readText(url.searchParams.get("category"));
  const keyword = readText(url.searchParams.get("keyword")).slice(0, 80);
  return {
    status: STATUSES.includes(status as FeedbackStatus) ? status as FeedbackStatus : "",
    category: CATEGORIES.includes(category as (typeof CATEGORIES)[number]) ? category : "",
    keyword,
  };
}

function countStatuses(rows: any[]) {
  return rows.reduce<Record<FeedbackStatus, number>>((counts, row) => {
    const status = STATUSES.includes(row.status) ? row.status as FeedbackStatus : "received";
    counts[status] += 1;
    return counts;
  }, { received: 0, reviewing: 0, resolved: 0 });
}

export async function onRequestGet(context: any) {
  const accessError = adminError(context.request, context.env);
  if (accessError) return accessError;

  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  const url = new URL(context.request.url);
  const { status, category, keyword } = buildFilters(url);
  const page = readPage(url.searchParams.get("page"), 1, 100000);
  const pageSize = readPage(url.searchParams.get("pageSize"), 20, 50);
  const db = context.env?.DB;

  if (db) {
    const where: string[] = [];
    const bindings: unknown[] = [];
    if (status) {
      where.push("status = ?");
      bindings.push(status);
    }
    if (category) {
      where.push("category = ?");
      bindings.push(category);
    }
    if (keyword) {
      const like = `%${keyword}%`;
      where.push("(content LIKE ? OR contact LIKE ? OR page_path LIKE ?)");
      bindings.push(like, like, like);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const selectSql = `SELECT id, user_id, category, page_path, content, contact, status, created_at, updated_at FROM feedback ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const list = await db.prepare(selectSql).bind(...bindings, pageSize, (page - 1) * pageSize).all();
    const count = await db.prepare(`SELECT COUNT(*) AS total FROM feedback ${whereClause}`).bind(...bindings).first();
    const statusRows = await db.prepare("SELECT status, COUNT(*) AS total FROM feedback GROUP BY status").all();
    const counts = countStatuses((statusRows.results || []).map((row: any) => ({ status: row.status, statusCount: row.total })));
    for (const row of statusRows.results || []) {
      const rowStatus = STATUSES.includes((row as any).status) ? (row as any).status as FeedbackStatus : null;
      if (rowStatus) counts[rowStatus] = Number((row as any).total || 0);
    }

    return ok({
      items: (list.results || []).map(toFeedbackItem),
      total: Number((count as any)?.total || 0),
      page,
      pageSize,
      counts,
    });
  }

  const allRows = mockDb().feedback.slice();
  const normalizedKeyword = keyword.toLocaleLowerCase();
  const filtered = allRows
    .filter((item) => !status || item.status === status)
    .filter((item) => !category || item.category === category)
    .filter((item) => {
      if (!normalizedKeyword) return true;
      return [item.content, item.contact, item.page_path]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalizedKeyword);
    })
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  return ok({
    items: filtered.slice((page - 1) * pageSize, page * pageSize).map(toFeedbackItem),
    total: filtered.length,
    page,
    pageSize,
    counts: countStatuses(allRows),
  });
}

export async function onRequestPost(context: any) {
  const accessError = adminError(context.request, context.env);
  if (accessError) return accessError;

  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  const body = await readBody(context.request);
  const feedbackId = readText(body?.feedbackId);
  const status = readText(body?.status);
  if (!feedbackId) return fail("缺少反馈编号");
  if (!STATUSES.includes(status as FeedbackStatus)) return fail("处理状态不正确");

  const now = new Date().toISOString();
  const db = context.env?.DB;
  if (db) {
    const updated = await db.prepare("UPDATE feedback SET status = ?, updated_at = ? WHERE id = ?").bind(status, now, feedbackId).run();
    if (!Number(updated.meta?.changes || 0)) return fail("反馈记录不存在", 404);

    const row = await db.prepare("SELECT id, user_id, category, page_path, content, contact, status, created_at, updated_at FROM feedback WHERE id = ?").bind(feedbackId).first();
    return ok(toFeedbackItem(row));
  }

  const item = mockDb().feedback.find((row) => row.id === feedbackId);
  if (!item) return fail("反馈记录不存在", 404);
  item.status = status;
  item.updated_at = now;
  return ok(toFeedbackItem(item));
}

export async function onRequestOptions() {
  return handleOptions();
}