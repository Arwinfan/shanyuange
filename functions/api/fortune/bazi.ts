import { ensureMockUser, ensureUserExists, handleOptions, ok, fail, readBody, genId, mockDb, requireFields, requireEnum, requireDatabaseOrMock, getSiteTrial } from "../../_shared";
import { buildBaziReading, isValidDateParts } from "../../_business";

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const { userId, master, year, month, day, hour, gender } = body || {};

  const missing = requireFields(body || {}, ["userId", "master", "year", "month", "day", "hour", "gender"]);
  if (missing) return fail(`${missing} 不能为空`);

  const masterErr = requireEnum(master, ["huiming", "mingxin", "xuanzhen"], "master");
  if (masterErr) return fail(masterErr);
  if (!isValidDateParts(Number(year), Number(month), Number(day))) return fail("出生日期无效");
  if (!["男", "女"].includes(gender)) return fail("gender 必须是 男/女 之一");

  const recordId = genId("rec");
  const orderId = genId("ord");
  const normalized = { ...body, year: Number(year), month: Number(month), day: Number(day) };
  const { preview, fullResult } = buildBaziReading(normalized);

  const now = new Date().toISOString();
  const db = context.env?.DB;
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  if (db) {
    await ensureUserExists(db, userId);
    const trial = getSiteTrial(context.env);
    const isTrial = trial.active;
    await db.prepare("INSERT INTO service_records (id, user_id, type, status, paid, preview_data, full_data, request_data, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .bind(recordId, userId, "fortune_bazi", isTrial ? "completed" : "pending", isTrial ? 1 : 0, JSON.stringify(preview), JSON.stringify(fullResult), JSON.stringify(normalized), now, now).run();
    if (!isTrial) {
      await db.prepare("INSERT INTO orders (id, user_id, record_id, type, amount, status, created_at) VALUES (?,?,?,?,?,?,?)")
        .bind(orderId, userId, recordId, "fortune_bazi", 19.9, "pending", now).run();
    }
    return ok({ recordId, orderId: isTrial ? null : orderId, needsPayment: !isTrial, amount: isTrial ? 0 : 19.9, preview, fullResult: isTrial ? fullResult : undefined, trial });
  }

  ensureMockUser(userId);
  const trial = getSiteTrial(context.env);
  const isTrial = trial.active;
  mockDb().records.push({ id: recordId, user_id: userId, type: "fortune_bazi", status: isTrial ? "completed" : "pending", paid: isTrial ? 1 : 0, preview_data: JSON.stringify(preview), full_data: JSON.stringify(fullResult), request_data: JSON.stringify(normalized), created_at: now });
  if (!isTrial) mockDb().orders.push({ id: orderId, user_id: userId, record_id: recordId, type: "fortune_bazi", amount: 19.9, status: "pending", created_at: now, paid_at: null });
  return ok({ recordId, orderId: isTrial ? null : orderId, needsPayment: !isTrial, amount: isTrial ? 0 : 19.9, preview, fullResult: isTrial ? fullResult : undefined, trial });
}

export async function onRequestOptions() { return handleOptions(); }
