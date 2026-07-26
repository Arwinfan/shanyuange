import { createUserSession, genId, handleOptions, mockDb, ok, requireDatabaseOrMock } from "../../_shared";

export async function onRequestPost(context: any) {
  const userId = genId("anon");
  const now = new Date().toISOString();
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  const db = context.env?.DB;
  if (db) {
    await db.prepare("INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)")
      .bind(userId, now, now).run();
  } else {
    mockDb().users.push({ id: userId, created_at: now });
  }

  const session = await createUserSession(context.env, userId);
  return ok({ userId, sessionToken: session.token, expiresAt: session.expiresAt });
}

export async function onRequestOptions() { return handleOptions(); }