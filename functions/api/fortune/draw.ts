import {
  FREE_LIMITS,
  addMockUsageEvent,
  addUsageEvent,
  ensureMockUser,
  ensureUserExists,
  getFreeUsageCount,
  getMockFreeUsageCount,
  handleOptions,
  ok,
  fail,
  readBody,
  genId,
  mockDb,
  usageDate,
  getSiteTrial, requireDatabaseOrMock,
} from "../../_shared";
import { buildLotReading, isValidMaster } from "../../_business";
import { enhanceLotReading } from "../../_llm";

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const { userId, master, question } = body || {};

  if (!userId) return fail("userId 不能为空");
  if (!master || !isValidMaster(master)) return fail("请选择一位师父");
  if (question && question.length > 200) return fail("问题不能超过 200 字");

  const recordId = genId("rec");
  const orderId = genId("ord");
  const type = "fortune_draw";
  const quota = FREE_LIMITS[type];
  const built = buildLotReading(master, question);
  const preview = built.preview;

  const now = new Date().toISOString();
  const db = context.env?.DB;
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  if (db) {
    await ensureUserExists(db, userId);
    const trial = getSiteTrial(context.env);
    const used = await getFreeUsageCount(db, userId, type);
    const isFree = trial.active || used < quota.total;
    const status = isFree ? "completed" : "pending";
    const paid = isFree ? 1 : 0;
    const fullResult = isFree ? await enhanceLotReading(context.env, body, built.fullResult) : built.fullResult;

    await db.prepare("INSERT INTO service_records (id, user_id, type, status, paid, preview_data, full_data, request_data, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .bind(recordId, userId, type, status, paid, JSON.stringify(preview), JSON.stringify(fullResult), JSON.stringify({ ...body, billing: { free: isFree, trial: trial.active } }), now, now).run();

    if (isFree) {
      if (!trial.active) await addUsageEvent(db, { id: genId("use"), userId, type, recordId, free: true, createdAt: now });
      return ok({ recordId, orderId: null, needsPayment: false, amount: 0, preview, fullResult, quota: { used: used + 1, total: quota.total, remaining: Math.max(0, quota.total - used - 1), date: usageDate() }, trial });
    }

    await db.prepare("INSERT INTO orders (id, user_id, record_id, type, amount, status, created_at) VALUES (?,?,?,?,?,?,?)")
      .bind(orderId, userId, recordId, type, quota.paidAmount, "pending", now).run();
    return ok({ recordId, orderId, needsPayment: true, amount: quota.paidAmount, preview, quota: { used, total: quota.total, remaining: 0, date: usageDate() }, trial });
  } else {
    ensureMockUser(userId);
    const trial = getSiteTrial(context.env);
    const used = getMockFreeUsageCount(userId, type);
    const isFree = trial.active || used < quota.total;
    const fullResult = isFree ? await enhanceLotReading(context.env, body, built.fullResult) : built.fullResult;
    mockDb().records.push({ id: recordId, user_id: userId, type, status: isFree ? "completed" : "pending", paid: isFree ? 1 : 0, preview_data: JSON.stringify(preview), full_data: JSON.stringify(fullResult), request_data: JSON.stringify({ ...body, billing: { free: isFree, trial: trial.active } }), created_at: now });
    if (isFree) {
      if (!trial.active) addMockUsageEvent({ id: genId("use"), userId, type, recordId, free: true, createdAt: now });
      return ok({ recordId, orderId: null, needsPayment: false, amount: 0, preview, fullResult, quota: { used: used + 1, total: quota.total, remaining: Math.max(0, quota.total - used - 1), date: usageDate() }, trial });
    }
    mockDb().orders.push({ id: orderId, user_id: userId, record_id: recordId, type, amount: quota.paidAmount, status: "pending", created_at: now, paid_at: null });
    return ok({ recordId, orderId, needsPayment: true, amount: quota.paidAmount, preview, quota: { used, total: quota.total, remaining: 0, date: usageDate() }, trial });
  }
}

export async function onRequestOptions() { return handleOptions(); }
