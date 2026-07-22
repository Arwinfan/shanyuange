import { handleOptions, ok, fail, readBody, genId, mockDb, requireDatabaseOrMock } from "../../_shared";

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const { userId, recordId, amount, type } = body || {};

  if (!userId) return fail("userId 不能为空");
  if (!recordId) return fail("recordId 不能为空");
  if (!amount && amount !== 0) return fail("amount 不能为空");

  const orderId = genId("ord");
  const now = new Date().toISOString();

  const db = context.env?.DB;
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  if (db) {
    const record = await db.prepare("SELECT id, type FROM service_records WHERE id = ? AND user_id = ?").bind(recordId, userId).first();
    if (!record) return fail("记录不存在", 404);
    await db.prepare("INSERT INTO orders (id, user_id, record_id, type, amount, status, created_at) VALUES (?,?,?,?,?,?,?)")
      .bind(orderId, userId, recordId, type || (record as any).type || "", Number(amount), "pending", now).run();
  } else {
    const record = mockDb().records.find(r => r.id === recordId && r.user_id === userId);
    if (!record) return fail("记录不存在", 404);
    mockDb().orders.push({ id: orderId, user_id: userId, record_id: recordId, type: type || record.type || "", amount: Number(amount), status: "pending", created_at: now, paid_at: null });
  }

  return ok({ orderId, amount: Number(amount), status: "pending" });
}

export async function onRequestOptions() { return handleOptions(); }
