import { handleOptions, ok, mockDb, requireDatabaseOrMock } from "../../_shared";

export async function onRequestGet(context: any) {
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "40");
  const userId = url.searchParams.get("userId") || "";

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
        CASE WHEN user_id = ? THEN 1 ELSE 0 END as isMine,
        CASE WHEN user_id = ? THEN name_raw ELSE NULL END as nameRaw,
        CASE WHEN user_id = ? THEN donor_name_raw ELSE NULL END as donorNameRaw
      FROM blessing_lamps
      WHERE paid = 1
      ORDER BY CASE WHEN user_id = ? THEN 0 ELSE 1 END, created_at DESC
      LIMIT ? OFFSET ?`
    ).bind(userId, userId, userId, userId, pageSize, (page - 1) * pageSize).all();
    lamps = result.results;

    const countResult = await db.prepare("SELECT COUNT(*) as total FROM blessing_lamps WHERE paid = 1").first();
    const todayResult = await db.prepare(
      "SELECT COUNT(*) as todayNew FROM blessing_lamps WHERE paid = 1 AND date(created_at) = date('now')"
    ).first();

    const myResult = userId
      ? await db.prepare("SELECT COUNT(*) as myTotal FROM blessing_lamps WHERE paid = 1 AND user_id = ?").bind(userId).first()
      : null;

    return ok({
      items: lamps,
      total: (countResult as any)?.total || 0,
      todayNew: (todayResult as any)?.todayNew || 0,
      myTotal: (myResult as any)?.myTotal || 0,
    });
  }

  // Mock
  const allLamps = mockDb().lamps
    .filter(l => l.paid === 1)
    .sort((a, b) => {
      const mineDelta = Number(b.user_id === userId) - Number(a.user_id === userId);
      if (mineDelta) return mineDelta;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  const paged = allLamps.slice((page - 1) * pageSize, page * pageSize);
  const today = new Date().toISOString().slice(0, 10);
  const items = paged.map(l => ({
    lampId: l.id,
    recordId: l.record_id,
    maskedDonor: l.donor_name_masked,
    maskedName: l.name_masked,
    lampType: l.lamp_type,
    relation: l.relation,
    duration: l.duration,
    wish: l.wish,
    amount: l.amount,
    createdAt: l.created_at,
    isMine: l.user_id === userId,
    nameRaw: l.user_id === userId ? l.name_raw : null,
    donorNameRaw: l.user_id === userId ? l.donor_name_raw : null,
  }));

  return ok({
    items,
    total: allLamps.length,
    todayNew: allLamps.filter(l => l.created_at.slice(0, 10) === today).length,
    myTotal: userId ? allLamps.filter(l => l.user_id === userId).length : 0,
  });
}

export async function onRequestOptions() { return handleOptions(); }
