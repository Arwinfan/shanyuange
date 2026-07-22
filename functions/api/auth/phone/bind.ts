import {
  ensureMockUser,
  ensureUserExists,
  fail,
  genId,
  handleOptions,
  isValidChinaMobile,
  maskPhone,
  mockDb,
  normalizePhone,
  ok,
  readBody,
  requireDatabaseOrMock,
} from "../../../_shared";

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const phone = normalizePhone(body.phone);

  if (!userId) return fail("userId 不能为空");
  if (!isValidChinaMobile(phone)) return fail("请输入正确的手机号");

  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  const now = new Date().toISOString();
  const db = context.env?.DB;

  if (db) {
    await ensureUserExists(db, userId);

    const phoneOwner = await db.prepare("SELECT user_id FROM user_accounts WHERE phone = ? LIMIT 1").bind(phone).first();
    if (phoneOwner && (phoneOwner as any).user_id !== userId) {
      return fail("该手机号已绑定其他账号");
    }
    if (phoneOwner && (phoneOwner as any).user_id === userId) {
      await db.prepare("UPDATE user_accounts SET updated_at = ? WHERE phone = ?").bind(now, phone).run();
      return ok({ phoneMasked: maskPhone(phone), boundAt: now });
    }

    const currentAccount = await db.prepare("SELECT id FROM user_accounts WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").bind(userId).first();
    if (currentAccount) {
      await db.prepare("UPDATE user_accounts SET phone = ?, updated_at = ? WHERE id = ?")
        .bind(phone, now, (currentAccount as any).id)
        .run();
    } else {
      await db.prepare("INSERT INTO user_accounts (id, user_id, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
        .bind(genId("acct"), userId, phone, now, now)
        .run();
    }

    return ok({ phoneMasked: maskPhone(phone), boundAt: now });
  }

  ensureMockUser(userId);
  const mock = mockDb();
  const phoneOwner = mock.accounts.find((item) => item.phone === phone);
  if (phoneOwner && phoneOwner.user_id !== userId) {
    return fail("该手机号已绑定其他账号");
  }
  if (phoneOwner && phoneOwner.user_id === userId) {
    phoneOwner.updated_at = now;
    return ok({ phoneMasked: maskPhone(phone), boundAt: now });
  }

  const currentAccount = mock.accounts.find((item) => item.user_id === userId);
  if (currentAccount) {
    currentAccount.phone = phone;
    currentAccount.updated_at = now;
  } else {
    mock.accounts.push({ id: genId("acct"), user_id: userId, phone, created_at: now, updated_at: now });
  }

  return ok({ phoneMasked: maskPhone(phone), boundAt: now });
}

export async function onRequestOptions() {
  return handleOptions();
}
