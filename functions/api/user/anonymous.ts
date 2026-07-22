import { handleOptions, ok, readBody, genId, mockDb, requireDatabaseOrMock } from "../../_shared";

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const userId = genId("anon");
  const now = new Date().toISOString();

  // 检查 D1
  const db = context.env?.DB;
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  if (db) {
    await db.prepare("INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)")
      .bind(userId, now, now).run();
  } else {
    mockDb().users.push({ id: userId, created_at: now });
  }

  return ok({ userId });
}

export async function onRequestOptions() { return handleOptions(); }
