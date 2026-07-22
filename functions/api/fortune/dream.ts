import { ensureMockUser, ensureUserExists, handleOptions, ok, fail, readBody, genId, mockDb, requireDatabaseOrMock } from "../../_shared";
import { buildDreamReading } from "../../_business";
import { enhanceDreamReading } from "../../_llm";

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const { userId, query } = body || {};

  if (!userId) return fail("userId 不能为空");
  if (!query || query.trim().length === 0) return fail("请输入梦境内容");
  if (query.length > 100) return fail("梦境描述不能超过 100 字");

  const recordId = genId("rec");
  const now = new Date().toISOString();
  const { preview, fullResult } = await enhanceDreamReading(context.env, query, buildDreamReading(query));
  const db = context.env?.DB;
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  if (db) {
    await ensureUserExists(db, userId);
    await db.prepare("INSERT INTO service_records (id, user_id, type, status, paid, preview_data, full_data, request_data, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .bind(recordId, userId, "fortune_dream", "completed", 1, JSON.stringify(preview), JSON.stringify(fullResult), JSON.stringify(body), now, now).run();
  } else {
    ensureMockUser(userId);
    mockDb().records.push({ id: recordId, user_id: userId, type: "fortune_dream", status: "completed", paid: 1, preview_data: JSON.stringify(preview), full_data: JSON.stringify(fullResult), request_data: JSON.stringify(body), created_at: now });
  }

  return ok({ recordId, query, result: preview, fullResult });
}

export async function onRequestOptions() { return handleOptions(); }
