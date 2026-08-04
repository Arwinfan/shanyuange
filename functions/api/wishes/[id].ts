import { fail, handleOptions, mockDb, ok, readBody, requireDatabaseOrMock } from "../../_shared";

function wishIdFrom(context: any) {
  return new URL(context.request.url).pathname.split("/").filter(Boolean).pop() || "";
}

export async function onRequestDelete(context: any) {
  const body = await readBody(context.request);
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  const wishId = wishIdFrom(context);
  if (!userId || !wishId) return fail("缺少便利签或账号信息");

  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;
  const now = new Date().toISOString();
  const db = context.env?.DB;
  if (db) {
    const updated = await db.prepare(
      "UPDATE wish_notes SET status = 'deleted', deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND status != 'deleted'",
    ).bind(now, now, wishId, userId).run();
    if (!Number(updated.meta?.changes || 0)) return fail("便利签不存在或无权删除", 404);
    return ok({ wishId, status: "deleted", deletedAt: now });
  }

  const item = mockDb().wishes.find((wish) => wish.id === wishId && wish.user_id === userId && wish.status !== "deleted");
  if (!item) return fail("便利签不存在或无权删除", 404);
  item.status = "deleted";
  item.deleted_at = now;
  item.updated_at = now;
  return ok({ wishId, status: "deleted", deletedAt: now });
}

export async function onRequestOptions() { return handleOptions(); }
