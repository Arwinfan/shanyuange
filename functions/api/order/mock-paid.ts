import { FREE_LIMITS, addMockUsageEvent, addUsageEvent, genId, handleOptions, ok, fail, readBody, mockDb, requireDatabaseOrMock, requireMockPayment } from "../../_shared";
import { buildFullResultFromRecord } from "../../_business";
import { enhanceBaziReading, enhanceLotReading, enhanceNamingReading, enhancePalmistryReading } from "../../_llm";

function safeJson(text: string | null | undefined) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

async function readStoredImage(env: any, requestData: any) {
  const inlineImage = requestData?.imageBase64;
  if (inlineImage === "[deleted]") return "";
  if (typeof inlineImage === "string" && inlineImage && inlineImage !== "[data]") return inlineImage;

  const imageKey = requestData?.imageKey;
  if (imageKey && env?.R2?.get) {
    try {
      const object = await env.R2.get(imageKey);
      if (object?.text) return await object.text();
    } catch {
      return "";
    }
  }

  return "";
}

async function enhancePaidFullResult(env: any, type: string, requestData: any, baseFull: any) {
  if (type === "fortune_naming") return enhanceNamingReading(env, requestData, baseFull);
  if (type === "fortune_bazi") return enhanceBaziReading(env, requestData, baseFull);
  if (type === "fortune_draw") return enhanceLotReading(env, requestData, baseFull);
  // 六爻已在起卦时生成完整本地解读，解锁时不再阻塞等待外部模型。
  if (type === "fortune_divination") return baseFull;
  if (type === "fortune_palmistry") {
    const imageBase64 = await readStoredImage(env, requestData);
    return enhancePalmistryReading(env, requestData, imageBase64, baseFull);
  }
  return baseFull;
}

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const { orderId, userId } = body || {};

  if (!userId) return fail("userId 不能为空");
  if (!orderId) return fail("orderId 不能为空");

  const now = new Date().toISOString();
  const db = context.env?.DB;
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;
  const paymentModeError = requireMockPayment(context.env);
  if (paymentModeError) return paymentModeError;

  if (db) {
    const order = await db.prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?").bind(orderId, userId).first();
    if (!order) return fail("订单不存在", 404);
    if ((order as any).status === "paid") return ok({ orderId, status: "paid", recordId: (order as any).record_id });

    const record = await db.prepare("SELECT * FROM service_records WHERE id = ? AND user_id = ?").bind((order as any).record_id, userId).first();
    if (!record) return fail("记录不存在", 404);

    const preview = safeJson((record as any).preview_data) || {};
    const requestData = safeJson((record as any).request_data) || {};
    const baseFull = safeJson((record as any).full_data) || buildFullResultFromRecord((record as any).type, requestData, preview);
    const finalFull = await enhancePaidFullResult(context.env, (record as any).type, requestData, baseFull);
    const fallbackFull = JSON.stringify(finalFull);

    await db.prepare("UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ?").bind(now, orderId).run();
    await db.prepare("UPDATE service_records SET paid = 1, status = 'completed', full_data = ?, updated_at = ? WHERE id = ?").bind(fallbackFull, now, (order as any).record_id).run();

    if ((record as any).type === "temple_incense") {
      const endsAt = new Date(Date.parse(now) + 30 * 60 * 1000).toISOString();
      await db.prepare("UPDATE incense_offerings SET status = 'burning', started_at = ?, ends_at = ?, updated_at = ? WHERE record_id = ? AND status = 'pending_payment'")
        .bind(now, endsAt, now, (order as any).record_id).run();
    }

    // 如果是祈福灯，更新 blessing_lamps 表
    await db.prepare("UPDATE blessing_lamps SET paid = 1 WHERE record_id = ?").bind((order as any).record_id).run();
    if (FREE_LIMITS[(record as any).type]) {
      await addUsageEvent(db, { id: genId("use"), userId, type: (record as any).type, recordId: (order as any).record_id, free: false, createdAt: now });
    }

    return ok({ orderId, status: "paid", recordId: (order as any).record_id });
  }

  const order = mockDb().orders.find(o => o.id === orderId && o.user_id === userId);
  if (!order) return fail("订单不存在", 404);
  if (order.status === "paid") return ok({ orderId, status: "paid", recordId: order.record_id });

  order.status = "paid";
  order.paid_at = now;

  const record = mockDb().records.find(r => r.id === order.record_id);
  if (record) {
    const preview = safeJson(record.preview_data) || {};
    const requestData = safeJson(record.request_data) || {};
    const baseFull = safeJson(record.full_data) || buildFullResultFromRecord(record.type, requestData, preview);
    const finalFull = await enhancePaidFullResult(context.env, record.type, requestData, baseFull);
    record.paid = 1;
    record.status = "completed";
    record.full_data = JSON.stringify(finalFull);
    if (record.type === "temple_incense") {
      const incense = mockDb().incenses.find((item) => item.record_id === order.record_id && item.status === "pending_payment");
      if (incense) {
        incense.status = "burning";
        incense.started_at = now;
        incense.ends_at = new Date(Date.parse(now) + 30 * 60 * 1000).toISOString();
        incense.updated_at = now;
      }
    }
    if (FREE_LIMITS[record.type]) {
      addMockUsageEvent({ id: genId("use"), userId, type: record.type, recordId: order.record_id, free: false, createdAt: now });
    }
  }

  const lamp = mockDb().lamps.find(l => l.record_id === order.record_id);
  if (lamp) lamp.paid = 1;

  return ok({ orderId, status: "paid", recordId: order.record_id });
}

export async function onRequestOptions() { return handleOptions(); }
