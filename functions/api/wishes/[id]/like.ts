import { ensureMockUser, ensureUserExists, fail, genId, handleOptions, mockDb, ok, readBody, requireDatabaseOrMock } from "../../../_shared";

function wishIdFrom(context: any) {
  const parts = new URL(context.request.url).pathname.split("/").filter(Boolean);
  return parts.at(-2) || "";
}

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  const wishId = wishIdFrom(context);
  if (!userId || !wishId) return fail("缺少便利签或账号信息");

  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;
  const db = context.env?.DB;
  const now = new Date().toISOString();
  if (db) {
    const wish = await db.prepare("SELECT id, status FROM wish_notes WHERE id = ?").bind(wishId).first();
    if (!wish || (wish as any).status !== "visible") return fail("这张便利签暂时无法点赞", 404);
    await ensureUserExists(db, userId);
    const inserted = await db.prepare("INSERT OR IGNORE INTO wish_likes (id, wish_id, user_id, created_at) VALUES (?, ?, ?, ?)")
      .bind(genId("wish_like"), wishId, userId, now).run();
    let liked = Number(inserted.meta?.changes || 0) > 0;
    if (liked) {
      await db.prepare("UPDATE wish_notes SET like_count = like_count + 1, updated_at = ? WHERE id = ?").bind(now, wishId).run();
    } else {
      const removed = await db.prepare("DELETE FROM wish_likes WHERE wish_id = ? AND user_id = ?").bind(wishId, userId).run();
      liked = false;
      if (Number(removed.meta?.changes || 0)) {
        await db.prepare("UPDATE wish_notes SET like_count = CASE WHEN like_count > 0 THEN like_count - 1 ELSE 0 END, updated_at = ? WHERE id = ?").bind(now, wishId).run();
      }
    }
    const result = await db.prepare("SELECT like_count FROM wish_notes WHERE id = ?").bind(wishId).first();
    return ok({ wishId, liked, likeCount: Number((result as any)?.like_count || 0) });
  }

  ensureMockUser(userId);
  const mock = mockDb();
  const wish = mock.wishes.find((item) => item.id === wishId && item.status === "visible");
  if (!wish) return fail("这张便利签暂时无法点赞", 404);
  const existingIndex = mock.wishLikes.findIndex((like) => like.wish_id === wishId && like.user_id === userId);
  const liked = existingIndex === -1;
  if (liked) {
    mock.wishLikes.push({ id: genId("wish_like"), wish_id: wishId, user_id: userId, created_at: now });
    wish.like_count += 1;
  } else {
    mock.wishLikes.splice(existingIndex, 1);
    wish.like_count = Math.max(0, wish.like_count - 1);
  }
  wish.updated_at = now;
  return ok({ wishId, liked, likeCount: wish.like_count });
}

export async function onRequestOptions() { return handleOptions(); }
