import { ensureMockUser, ensureUserExists, fail, genId, handleOptions, mockDb, ok, readBody, requireDatabaseOrMock } from "../../../_shared";
import { REPORT_REASONS, WISH_LIMITS } from "../../../_wishes";

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function wishIdFrom(context: any) {
  const parts = new URL(context.request.url).pathname.split("/").filter(Boolean);
  return parts.at(-2) || "";
}

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const userId = readText(body?.userId);
  const reason = readText(body?.reason);
  const detail = readText(body?.detail);
  const wishId = wishIdFrom(context);
  if (!userId || !wishId) return fail("缺少便利签或账号信息");
  if (!REPORT_REASONS.includes(reason as any)) return fail("请选择举报原因");
  if (detail.length > WISH_LIMITS.reportDetail) return fail(`补充说明不能超过 ${WISH_LIMITS.reportDetail} 个字`);

  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;
  const now = new Date().toISOString();
  const db = context.env?.DB;
  if (db) {
    const wish = await db.prepare("SELECT user_id, status FROM wish_notes WHERE id = ?").bind(wishId).first();
    if (!wish || (wish as any).status !== "visible") return fail("这张便利签暂时无法举报", 404);
    if ((wish as any).user_id === userId) return fail("不能举报自己的便利签");
    await ensureUserExists(db, userId);
    const inserted = await db.prepare(
      "INSERT OR IGNORE INTO wish_reports (id, wish_id, reporter_id, reason, detail, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(genId("wish_report"), wishId, userId, reason, detail || null, "received", now, now).run();
    if (!Number(inserted.meta?.changes || 0)) return fail("你已经举报过这张便利签");
    return ok({ wishId, reported: true, status: "received" });
  }

  ensureMockUser(userId);
  const mock = mockDb();
  const wish = mock.wishes.find((item) => item.id === wishId && item.status === "visible");
  if (!wish) return fail("这张便利签暂时无法举报", 404);
  if (wish.user_id === userId) return fail("不能举报自己的便利签");
  if (mock.wishReports.some((report) => report.wish_id === wishId && report.reporter_id === userId)) return fail("你已经举报过这张便利签");
  mock.wishReports.push({ id: genId("wish_report"), wish_id: wishId, reporter_id: userId, reason, detail: detail || null, status: "received", created_at: now, updated_at: now });
  return ok({ wishId, reported: true, status: "received" });
}

export async function onRequestOptions() { return handleOptions(); }
