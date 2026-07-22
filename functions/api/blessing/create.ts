import { ensureMockUser, ensureUserExists, handleOptions, ok, fail, readBody, genId, mockDb, maskName, requireFields, requireEnum, requireLength, requireDatabaseOrMock, getSiteTrial } from "../../_shared";
import { buildBlessingFullResult } from "../../_business";

const VALID_LAMPS = ["清心灯","智慧灯","长寿灯","平安灯","姻缘灯","财福灯"];
const VALID_DURATIONS = ["month","100days","year","forever"];
const VALID_RELATIONS = ["父亲","母亲","爱人","孩子","孙辈","朋友","自己"];
const PRICES: Record<string, number> = { month: 3.9, "100days": 5.9, year: 9.9, forever: 19.9 };

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const { userId, name, relation, lampType, duration, wish, donorName } = body || {};

  const missing = requireFields(body || {}, ["userId","name","relation","lampType","duration"]);
  if (missing) return fail(`${missing} 不能为空`);

  let err: string | null;
  if ((err = requireEnum(relation, VALID_RELATIONS, "关系"))) return fail(err);
  if ((err = requireEnum(lampType, VALID_LAMPS, "灯型"))) return fail(err);
  if ((err = requireEnum(duration, VALID_DURATIONS, "供奉时长"))) return fail(err);
  if ((err = requireLength(name, 20, "姓名"))) return fail(err);
  if (wish && (err = requireLength(wish, 80, "心愿"))) return fail(err);
  if (donorName && (err = requireLength(donorName, 10, "称呼"))) return fail(err);

  const amount = PRICES[duration] || 3.9;
  const recordId = genId("rec");
  const orderId = genId("ord");
  const lampId = genId("lamp");
  const now = new Date().toISOString();

  const maskedName = maskName(name);
  const maskedDonor = maskName(donorName || "善信");

  const preview = { lampType, duration, maskedName, maskedDonor };
  const fullResult = buildBlessingFullResult({ name, relation, lampType, duration, wish, donorName, maskedName, maskedDonor });

  const db = context.env?.DB;
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  if (db) {
    await ensureUserExists(db, userId);
    const trial = getSiteTrial(context.env);
    const isTrial = trial.active;
    const chargedAmount = isTrial ? 0 : amount;
    await db.prepare("INSERT INTO service_records (id, user_id, type, status, paid, preview_data, full_data, request_data, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .bind(recordId, userId, "blessing_lamp", isTrial ? "completed" : "pending", isTrial ? 1 : 0, JSON.stringify(preview), JSON.stringify(fullResult), JSON.stringify(body), now, now).run();
    await db.prepare("INSERT INTO blessing_lamps (id, record_id, user_id, name_raw, name_masked, donor_name_raw, donor_name_masked, relation, lamp_type, duration, wish, amount, paid, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(lampId, recordId, userId, name, maskedName, donorName || null, maskedDonor, relation, lampType, duration, wish || null, chargedAmount, isTrial ? 1 : 0, now).run();
    if (!isTrial) {
      await db.prepare("INSERT INTO orders (id, user_id, record_id, type, amount, status, created_at) VALUES (?,?,?,?,?,?,?)")
        .bind(orderId, userId, recordId, "blessing_lamp", amount, "pending", now).run();
    }
    return ok({ recordId, orderId: isTrial ? null : orderId, needsPayment: !isTrial, amount: chargedAmount, preview, trial });
  }

  ensureMockUser(userId);
  const trial = getSiteTrial(context.env);
  const isTrial = trial.active;
  const chargedAmount = isTrial ? 0 : amount;
  mockDb().records.push({ id: recordId, user_id: userId, type: "blessing_lamp", status: isTrial ? "completed" : "pending", paid: isTrial ? 1 : 0, preview_data: JSON.stringify(preview), full_data: JSON.stringify(fullResult), request_data: JSON.stringify(body), created_at: now });
  mockDb().lamps.push({ id: lampId, record_id: recordId, user_id: userId, name_raw: name, name_masked: maskedName, donor_name_raw: donorName || null, donor_name_masked: maskedDonor, relation, lamp_type: lampType, duration, wish: wish || null, amount: chargedAmount, paid: isTrial ? 1 : 0, created_at: now });
  if (!isTrial) mockDb().orders.push({ id: orderId, user_id: userId, record_id: recordId, type: "blessing_lamp", amount, status: "pending", created_at: now, paid_at: null });
  return ok({ recordId, orderId: isTrial ? null : orderId, needsPayment: !isTrial, amount: chargedAmount, preview, trial });
}

export async function onRequestOptions() { return handleOptions(); }
