import { ensureMockUser, ensureUserExists, handleOptions, ok, fail, readBody, genId, mockDb, requireFields, requireDatabaseOrMock, getSiteTrial } from "../../_shared";
import { buildPalmistryReading } from "../../_business";

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const { userId, master, mode, hand, imageBase64 } = body || {};

  const missing = requireFields(body || {}, ["userId", "master", "mode"]);
  if (missing) return fail(`${missing} 不能为空`);
  if (!["huiming","mingxin","xuanzhen"].includes(master)) return fail("请选择师父");
  if (!["hand","face"].includes(mode)) return fail("请选择手相或面相");
  if (mode === "hand" && !hand) return fail("请选择左手或右手");
  if (mode === "hand" && !["left", "right"].includes(hand)) return fail("hand 必须是 left/right 之一");
  if (!imageBase64) return fail("请上传一张清晰照片");
  if (String(imageBase64).length > 7_000_000) return fail("图片不能超过 5MB");

  const recordId = genId("rec");
  const orderId = genId("ord");
  const now = new Date().toISOString();
  const imageKey = `palmistry/${recordId}.txt`;
  const storedRequestData = { ...body, imageBase64: "[data]", imageKey, recordId };
  const mockRequestData = { ...body, imageKey, recordId };
  const { preview, fullResult } = buildPalmistryReading({ master, mode, hand, imageBase64, recordId });

  const db = context.env?.DB;
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  if (db) {
    await ensureUserExists(db, userId);
    const trial = getSiteTrial(context.env);
    const isTrial = trial.active;
    if (context.env?.R2?.put) {
      await context.env.R2.put(imageKey, imageBase64, { httpMetadata: { contentType: "text/plain; charset=utf-8" } });
    }
    await db.prepare("INSERT INTO service_records (id, user_id, type, status, paid, preview_data, full_data, request_data, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .bind(recordId, userId, "fortune_palmistry", isTrial ? "completed" : "pending", isTrial ? 1 : 0, JSON.stringify(preview), JSON.stringify(fullResult), JSON.stringify(storedRequestData), now, now).run();
    if (!isTrial) {
      await db.prepare("INSERT INTO orders (id, user_id, record_id, type, amount, status, created_at) VALUES (?,?,?,?,?,?,?)")
        .bind(orderId, userId, recordId, "fortune_palmistry", 29.9, "pending", now).run();
    }
    return ok({ recordId, orderId: isTrial ? null : orderId, needsPayment: !isTrial, amount: isTrial ? 0 : 29.9, preview, fullResult: isTrial ? fullResult : undefined, trial });
  }

  ensureMockUser(userId);
  const trial = getSiteTrial(context.env);
  const isTrial = trial.active;
  mockDb().records.push({ id: recordId, user_id: userId, type: "fortune_palmistry", status: isTrial ? "completed" : "pending", paid: isTrial ? 1 : 0, preview_data: JSON.stringify(preview), full_data: JSON.stringify(fullResult), request_data: JSON.stringify(mockRequestData), created_at: now });
  if (!isTrial) mockDb().orders.push({ id: orderId, user_id: userId, record_id: recordId, type: "fortune_palmistry", amount: 29.9, status: "pending", created_at: now, paid_at: null });
  return ok({ recordId, orderId: isTrial ? null : orderId, needsPayment: !isTrial, amount: isTrial ? 0 : 29.9, preview, fullResult: isTrial ? fullResult : undefined, trial });
}

export async function onRequestOptions() { return handleOptions(); }
