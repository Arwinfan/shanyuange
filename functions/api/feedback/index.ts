import {
  ensureMockUser,
  ensureUserExists,
  fail,
  genId,
  handleOptions,
  mockDb,
  ok,
  readBody,
  requireDatabaseOrMock,
  requireLength,
} from "../../_shared";

const CATEGORIES = ["suggestion", "issue", "content", "service", "other"] as const;
const STATUSES = ["received", "reviewing", "resolved"] as const;

function toFeedbackItem(row: any) {
  return {
    feedbackId: row.id,
    category: row.category,
    pagePath: row.page_path ?? null,
    content: row.content,
    contact: row.contact ?? null,
    status: STATUSES.includes(row.status) ? row.status : "received",
    createdAt: row.created_at,
  };
}

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const userId = readText(body?.userId);
  const category = readText(body?.category);
  const pagePath = readText(body?.pagePath);
  const content = readText(body?.content);
  const contact = readText(body?.contact);

  if (!userId) return fail("请先完成账号初始化后再提交反馈");
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) return fail("请选择反馈类型");
  if (content.length < 5) return fail("请至少填写 5 个字，让我们更好地理解问题");
  if (requireLength(content, 1000, "反馈内容")) return fail("反馈内容不能超过 1000 个字");
  if (requireLength(pagePath, 120, "相关页面")) return fail("相关页面信息过长");
  if (requireLength(contact, 120, "联系方式")) return fail("联系方式不能超过 120 个字");

  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  const id = genId("feedback");
  const now = new Date().toISOString();
  const item = {
    id,
    user_id: userId,
    category,
    page_path: pagePath || null,
    content,
    contact: contact || null,
    status: "received",
    created_at: now,
    updated_at: now,
  };

  const db = context.env?.DB;
  if (db) {
    await ensureUserExists(db, userId);
    await db.prepare(
      "INSERT INTO feedback (id, user_id, category, page_path, content, contact, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
    ).bind(id, userId, category, pagePath || null, content, contact || null, "received", now, now).run();
  } else {
    ensureMockUser(userId);
    mockDb().feedback.push(item);
  }

  return ok(toFeedbackItem(item));
}

export async function onRequestGet(context: any) {
  const url = new URL(context.request.url);
  const userId = readText(url.searchParams.get("userId"));
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(30, Math.max(1, Number.parseInt(url.searchParams.get("pageSize") || "10", 10) || 10));

  if (!userId) return fail("用户信息不能为空");
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  const db = context.env?.DB;
  if (db) {
    const result = await db.prepare(
      "SELECT id, category, page_path, content, contact, status, created_at FROM feedback WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
    ).bind(userId, pageSize, (page - 1) * pageSize).all();
    const count = await db.prepare("SELECT COUNT(*) AS total FROM feedback WHERE user_id = ?").bind(userId).first();
    return ok({ items: (result.results || []).map(toFeedbackItem), total: Number((count as any)?.total || 0), page, pageSize });
  }

  const items = mockDb().feedback
    .filter((item) => item.user_id === userId)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return ok({
    items: items.slice((page - 1) * pageSize, page * pageSize).map(toFeedbackItem),
    total: items.length,
    page,
    pageSize,
  });
}

export async function onRequestOptions() {
  return handleOptions();
}