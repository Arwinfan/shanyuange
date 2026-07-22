import { handleOptions, ok, fail, mockDb, requireDatabaseOrMock } from "../../_shared";

function orderPayload(order: any) {
  return {
    orderId: order.id,
    recordId: order.record_id,
    type: order.type,
    amount: Number(order.amount || 0),
    status: order.status,
    createdAt: order.created_at,
    paidAt: order.paid_at,
  };
}

export async function onRequestGet(context: any) {
  const url = new URL(context.request.url);
  const userId = url.searchParams.get("userId");
  const orderId = url.pathname.split("/").pop();

  if (!userId) return fail("userId 不能为空");
  if (!orderId) return fail("orderId 不能为空");

  const db = context.env?.DB;
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  if (db) {
    const order = await db.prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?").bind(orderId, userId).first();
    if (!order) return fail("订单不存在", 404);
    return ok(orderPayload(order));
  }

  const order = mockDb().orders.find((item) => item.id === orderId && item.user_id === userId);
  if (!order) return fail("订单不存在", 404);
  return ok(orderPayload(order));
}

export async function onRequestOptions() { return handleOptions(); }
