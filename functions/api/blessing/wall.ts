import { handleOptions, ok, mockDb, requireDatabaseOrMock } from "../../_shared";

const FREE_SEVEN_DAY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function getNextFreeAt(createdAt?: string | null) {
  if (!createdAt) return null;
  const nextAt = new Date(Date.parse(createdAt) + FREE_SEVEN_DAY_COOLDOWN_MS);
  return Number.isNaN(nextAt.getTime()) || nextAt.getTime() <= Date.now() ? null : nextAt.toISOString();
}

export async function onRequestGet(context: any) {
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "40");
  const userId = url.searchParams.get("userId") || "";
  const now = new Date();
  const nowIso = now.toISOString();

  let lamps: any[];
  const db = context.env?.DB;
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  if (db) {
    const result = await db.prepare(
      `SELECT
        id as lampId,
        record_id as recordId,
        name_masked as maskedName,
        donor_name_masked as maskedDonor,
        lamp_type as lampType,
        relation,
        duration,
        wish,
        amount,
        created_at as createdAt,
        expires_at as expiresAt,
        CASE WHEN user_id = ? THEN 1 ELSE 0 END as isMine,
        CASE WHEN user_id = ? THEN name_raw ELSE NULL END as nameRaw,
        CASE WHEN user_id = ? THEN donor_name_raw ELSE NULL END as donorNameRaw
      FROM blessing_lamps
      WHERE paid = 1 AND expires_at > ?
      ORDER BY CASE WHEN user_id = ? THEN 0 ELSE 1 END, created_at DESC
      LIMIT ? OFFSET ?`
    ).bind(userId, userId, userId, nowIso, userId, pageSize, (page - 1) * pageSize).all();
    lamps = result.results;

    const countResult = await db.prepare("SELECT COUNT(*) as total FROM blessing_lamps WHERE paid = 1 AND expires_at > ?").bind(nowIso).first();
    const todayResult = await db.prepare(
      "SELECT COUNT(*) as todayNew FROM blessing_lamps WHERE paid = 1 AND expires_at > ? AND date(created_at) = date('now')"
    ).bind(nowIso).first();

    const myResult = userId
      ? await db.prepare("SELECT COUNT(*) as myTotal FROM blessing_lamps WHERE paid = 1 AND expires_at > ? AND user_id = ?").bind(nowIso, userId).first()
      : null;
    const latestFreeLamp: { created_at: string } | null = userId
      ? await db.prepare("SELECT created_at FROM blessing_lamps WHERE user_id = ? AND duration = '7days' ORDER BY created_at DESC LIMIT 1").bind(userId).first()
      : null;

    return ok({
      items: lamps,
      total: (countResult as any)?.total || 0,
      todayNew: (todayResult as any)?.todayNew || 0,
      myTotal: (myResult as any)?.myTotal || 0,
      sevenDayFreeNextAt: getNextFreeAt(latestFreeLamp?.created_at),
    });
  }

  const allLamps = mockDb().lamps
    .filter((lamp) => lamp.paid === 1 && Date.parse(lamp.expires_at) > now.getTime())
    .sort((a, b) => {
      const mineDelta = Number(b.user_id === userId) - Number(a.user_id === userId);
      if (mineDelta) return mineDelta;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  const paged = allLamps.slice((page - 1) * pageSize, page * pageSize);
  const today = now.toISOString().slice(0, 10);
  const latestFreeLamp = userId
    ? mockDb().lamps.filter((lamp) => lamp.user_id === userId && lamp.duration === "7days").sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0]
    : null;
  const items = paged.map((lamp) => ({
    lampId: lamp.id,
    recordId: lamp.record_id,
    maskedDonor: lamp.donor_name_masked,
    maskedName: lamp.name_masked,
    lampType: lamp.lamp_type,
    relation: lamp.relation,
    duration: lamp.duration,
    wish: lamp.wish,
    amount: lamp.amount,
    createdAt: lamp.created_at,
    expiresAt: lamp.expires_at,
    isMine: lamp.user_id === userId,
    nameRaw: lamp.user_id === userId ? lamp.name_raw : null,
    donorNameRaw: lamp.user_id === userId ? lamp.donor_name_raw : null,
  }));

  return ok({
    items,
    total: allLamps.length,
    todayNew: allLamps.filter((lamp) => lamp.created_at.slice(0, 10) === today).length,
    myTotal: userId ? allLamps.filter((lamp) => lamp.user_id === userId).length : 0,
    sevenDayFreeNextAt: getNextFreeAt(latestFreeLamp?.created_at),
  });
}

export async function onRequestOptions() { return handleOptions(); }