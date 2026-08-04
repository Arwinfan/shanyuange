import {
  ensureMockUser,
  ensureUserExists,
  fail,
  genId,
  handleOptions,
  maskName,
  mockDb,
  ok,
  readBody,
  requireDatabaseOrMock,
} from "../../_shared";
import {
  findBlockedWishTerm,
  monthStartInChina,
  pickWishColor,
  readWishText,
  toWishItem,
  WISH_CATEGORIES,
  WISH_COLORS,
  WISH_LIMITS,
} from "../../_wishes";

function readPage(value: string | null, fallback: number, maximum: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(1, parsed)) : fallback;
}

function readSort(value: string | null) {
  return value === "popular" ? "popular" : "latest";
}

function remainingForCount(count: number) {
  return Math.max(0, WISH_LIMITS.monthly - count);
}

export async function onRequestGet(context: any) {
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  const url = new URL(context.request.url);
  const userId = readWishText(url.searchParams.get("userId"));
  const page = readPage(url.searchParams.get("page"), 1, 100000);
  const pageSize = readPage(url.searchParams.get("pageSize"), 18, 36);
  const sort = readSort(url.searchParams.get("sort"));
  const monthStart = monthStartInChina();
  const db = context.env?.DB;

  if (db) {
    const orderBy = sort === "popular"
      ? "period_like_count DESC, n.created_at DESC, n.id DESC"
      : "n.created_at DESC, n.id DESC";
    const list = await db.prepare(
      `SELECT n.id, n.nickname_masked, n.category, n.content, n.color, n.like_count, n.created_at,
        CASE WHEN n.user_id = ? THEN 1 ELSE 0 END AS is_mine,
        CASE WHEN EXISTS (SELECT 1 FROM wish_likes mine_like WHERE mine_like.wish_id = n.id AND mine_like.user_id = ?) THEN 1 ELSE 0 END AS is_liked,
        (SELECT COUNT(*) FROM wish_likes period_like WHERE period_like.wish_id = n.id AND period_like.created_at >= ?) AS period_like_count
       FROM wish_notes n
       WHERE n.status = 'visible'
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
    ).bind(userId, userId, monthStart, pageSize, (page - 1) * pageSize).all();
    const [totalRow, mineRow] = await Promise.all([
      db.prepare("SELECT COUNT(*) AS total FROM wish_notes WHERE status = 'visible'").first(),
      userId
        ? db.prepare("SELECT COUNT(*) AS total FROM wish_notes WHERE user_id = ? AND created_at >= ?").bind(userId, monthStart).first()
        : Promise.resolve(null),
    ]);
    return ok({
      items: (list.results || []).map(toWishItem),
      total: Number((totalRow as any)?.total || 0),
      page,
      pageSize,
      sort,
      monthlyLimit: WISH_LIMITS.monthly,
      monthlyUsed: Number((mineRow as any)?.total || 0),
      monthlyRemaining: remainingForCount(Number((mineRow as any)?.total || 0)),
    });
  }

  const mock = mockDb();
  const notes = mock.wishes
    .filter((wish) => wish.status === "visible")
    .map((wish) => {
      const periodLikeCount = mock.wishLikes.filter((like) => like.wish_id === wish.id && like.created_at >= monthStart).length;
      return {
        ...wish,
        is_mine: wish.user_id === userId ? 1 : 0,
        is_liked: mock.wishLikes.some((like) => like.wish_id === wish.id && like.user_id === userId) ? 1 : 0,
        period_like_count: periodLikeCount,
      };
    })
    .sort((left, right) => {
      if (sort === "popular" && right.period_like_count !== left.period_like_count) return right.period_like_count - left.period_like_count;
      const timeDelta = Date.parse(right.created_at) - Date.parse(left.created_at);
      return timeDelta || right.id.localeCompare(left.id);
    });
  const monthlyUsed = userId ? mock.wishes.filter((wish) => wish.user_id === userId && wish.created_at >= monthStart).length : 0;
  return ok({
    items: notes.slice((page - 1) * pageSize, page * pageSize).map(toWishItem),
    total: notes.length,
    page,
    pageSize,
    sort,
    monthlyLimit: WISH_LIMITS.monthly,
    monthlyUsed,
    monthlyRemaining: remainingForCount(monthlyUsed),
  });
}

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const userId = readWishText(body?.userId);
  const nickname = readWishText(body?.nickname);
  const category = readWishText(body?.category);
  const content = readWishText(body?.content);
  const requestedColor = readWishText(body?.color);
  if (!userId) return fail("请先完成账号初始化后再发布心愿");
  if (!nickname) return fail("请填写昵称");
  if (nickname.length > WISH_LIMITS.nickname) return fail(`昵称不能超过 ${WISH_LIMITS.nickname} 个字`);
  if (!WISH_CATEGORIES.includes(category as any)) return fail("请选择心愿分类");
  if (requestedColor && !WISH_COLORS.includes(requestedColor as any)) return fail("请选择有效的便利签纸色");
  if (content.length < 3) return fail("心愿至少填写 3 个字");
  if (content.length > WISH_LIMITS.content) return fail(`心愿不能超过 ${WISH_LIMITS.content} 个字`);
  const blockedTerm = findBlockedWishTerm(`${nickname}\n${content}`);
  if (blockedTerm) return fail("内容包含不适合公开展示的词语，请调整后再试");

  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;
  const now = new Date().toISOString();
  const monthStart = monthStartInChina();
  const wishId = genId("wish");
  const color = requestedColor || pickWishColor(`${wishId}:${userId}`);
  const nicknameMasked = maskName(nickname);
  const db = context.env?.DB;

  if (db) {
    await ensureUserExists(db, userId);
    const current = await db.prepare("SELECT COUNT(*) AS total FROM wish_notes WHERE user_id = ? AND created_at >= ?").bind(userId, monthStart).first();
    if (Number((current as any)?.total || 0) >= WISH_LIMITS.monthly) return fail("本月已发布 3 张便利签，下月再来写下新的心愿吧");
    await db.prepare(
      "INSERT INTO wish_notes (id, user_id, nickname_raw, nickname_masked, category, content, color, status, like_count, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(wishId, userId, nickname, nicknameMasked, category, content, color, "visible", 0, now, now, null).run();
    return ok({
      item: toWishItem({ id: wishId, nickname_masked: nicknameMasked, category, content, color, like_count: 0, created_at: now, is_mine: 1, is_liked: 0, period_like_count: 0 }),
      monthlyLimit: WISH_LIMITS.monthly,
      monthlyUsed: Number((current as any)?.total || 0) + 1,
      monthlyRemaining: remainingForCount(Number((current as any)?.total || 0) + 1),
    });
  }

  ensureMockUser(userId);
  const mock = mockDb();
  const monthlyUsed = mock.wishes.filter((wish) => wish.user_id === userId && wish.created_at >= monthStart).length;
  if (monthlyUsed >= WISH_LIMITS.monthly) return fail("本月已发布 3 张便利签，下月再来写下新的心愿吧");
  const row = { id: wishId, user_id: userId, nickname_raw: nickname, nickname_masked: nicknameMasked, category, content, color: WISH_COLORS.includes(color as any) ? color : "amber", status: "visible", like_count: 0, created_at: now, updated_at: now, deleted_at: null };
  mock.wishes.push(row as any);
  return ok({
    item: toWishItem({ ...row, is_mine: 1, is_liked: 0, period_like_count: 0 }),
    monthlyLimit: WISH_LIMITS.monthly,
    monthlyUsed: monthlyUsed + 1,
    monthlyRemaining: remainingForCount(monthlyUsed + 1),
  });
}

export async function onRequestOptions() { return handleOptions(); }
