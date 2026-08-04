import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
const artifactDir = path.resolve("test-artifacts", "smoke");
const forbiddenTexts = [
  "模拟支付",
  "网络错误",
  "AI不可用",
  "AI增强未完成",
  "接口异常",
  "接口返回异常",
  "接口请求失败",
  "功能开发中",
  "Internal Server Error",
  "stack trace",
  "undefined",
  "NaN",
];

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const require = createRequire(import.meta.url);
    const cached = path.join(os.tmpdir(), "putiyuan-playwright-check", "node_modules", "playwright");
    try {
      return require(cached);
    } catch {
      throw new Error("未找到 Playwright。请先执行 npm i -D playwright，或设置本地 Playwright 缓存。");
    }
  }
}

async function assertNoForbidden(page, label) {
  const text = await page.locator("body").innerText();
  const hit = forbiddenTexts.find((word) => text.includes(word));
  if (hit) throw new Error(`${label} 出现禁用文案: ${hit}`);
}

async function screenshot(page, name) {
  await fs.mkdir(artifactDir, { recursive: true });
  await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true });
}

async function openAndCheck(page, route, name) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await assertNoForbidden(page, route);
  await screenshot(page, name);
}
async function acceptContentNotice(page) {
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 10000 });
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "确认并继续" }).click();
}

async function assertWishScatterWall(page, label) {
  const notes = page.locator("[data-wish-id]");
  await notes.first().waitFor({ state: "visible", timeout: 30000 });
  const noteCount = await notes.count();
  if (noteCount < 2) throw new Error(`${label} 心愿墙缺少可验证的便利签`);

  const before = await notes.evaluateAll((elements) => elements.map((element) => ({
    id: element.getAttribute("data-wish-id"),
    left: element.getAttribute("data-scatter-left"),
    top: element.getAttribute("data-scatter-top"),
    rect: element.getBoundingClientRect().toJSON(),
    zIndex: Number(getComputedStyle(element).zIndex),
  })));
  if (new Set(before.map((item) => `${item.left}:${item.top}`)).size < 2) throw new Error(`${label} 便利签未产生随机散落位置`);
  const hasOverlap = before.some((item, index) => before.slice(index + 1).some((other) => item.rect.left < other.rect.right && item.rect.right > other.rect.left && item.rect.top < other.rect.bottom && item.rect.bottom > other.rect.top));
  if (!hasOverlap) throw new Error(`${label} 便利签未产生叠加效果`);

  const firstNote = notes.first();
  const defaultPosition = `${await firstNote.getAttribute("data-scatter-left")}:${await firstNote.getAttribute("data-scatter-top")}`;
  const noteId = await firstNote.getAttribute("data-wish-id");
  const noteBox = await firstNote.boundingBox();
  if (!noteBox || !noteId) throw new Error(`${label} 无法定位可拖拽的便利签`);
  await page.mouse.move(noteBox.x + noteBox.width / 2, noteBox.y + noteBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(noteBox.x + noteBox.width / 2 + 48, noteBox.y + noteBox.height / 2 + 54, { steps: 5 });
  await page.mouse.up();
  const draggedPosition = `${await firstNote.getAttribute("data-scatter-left")}:${await firstNote.getAttribute("data-scatter-top")}`;
  if (draggedPosition === defaultPosition) throw new Error(`${label} 拖拽后便利签位置未变化`);
  await page.reload({ waitUntil: "domcontentloaded" });
  const resetNote = page.locator(`[data-wish-id="${noteId}"]`);
  await resetNote.waitFor({ state: "visible", timeout: 30000 });
  const resetPosition = `${await resetNote.getAttribute("data-scatter-left")}:${await resetNote.getAttribute("data-scatter-top")}`;
  if (resetPosition !== defaultPosition) throw new Error(`${label} 刷新后便利签未恢复默认位置`);

  await resetNote.getByRole("button").last().focus();
  await page.waitForTimeout(50);
  if (Number(await resetNote.evaluate((element) => getComputedStyle(element).zIndex)) < 50) throw new Error(`${label} 聚焦便利签未提升至最上层`);
  return defaultPosition;
}

async function runDesktopFlows(page) {
  await openAndCheck(page, "/", "desktop-home");
  await openAndCheck(page, "/almanac", "desktop-almanac");
  await openAndCheck(page, "/meditation", "desktop-meditation");

  await openAndCheck(page, "/dream", "desktop-dream");
  await page.getByPlaceholder(/梦见/).fill("梦见清水");
  await page.getByRole("button", { name: "解梦", exact: true }).click();
  await page.getByText("梦境解析").waitFor({ timeout: 90000 });
  await assertNoForbidden(page, "/dream result");

  await openAndCheck(page, "/lottery", "desktop-lottery");
  await page.locator("textarea").fill("家人身体能否安康");
  await page.getByRole("button", { name: /抽签|求一支签/ }).first().click();
  await acceptContentNotice(page);
  await page.getByText(/第\s*\d+\s*签/).first().waitFor({ timeout: 90000 });
  await assertNoForbidden(page, "/lottery result");

  await openAndCheck(page, "/divination", "desktop-divination");
  await page.locator("textarea").fill("这次出行是否顺利");
  await page.getByRole("button", { name: /抽签|加抽/ }).first().click();
  await acceptContentNotice(page);
  await page.getByText("卦象解读").waitFor({ timeout: 90000 });
  await assertNoForbidden(page, "/divination result");

  await openAndCheck(page, "/bazi", "desktop-bazi");
  await page.getByRole("button", { name: "开始真排盘" }).click();
  await page.getByText("排盘完成").waitFor({ timeout: 30000 });
  await assertNoForbidden(page, "/bazi result");

  await openAndCheck(page, "/naming", "desktop-naming");
  await page.locator("input").nth(0).fill("李");
  await page.getByRole("button", { name: "开始专业起名" }).click();
  await page.getByText("备选名").waitFor({ timeout: 30000 });
  await assertNoForbidden(page, "/naming result");

  await openAndCheck(page, "/qifu", "desktop-qifu");
  await page.getByPlaceholder("请输入家人姓名").fill("张安");
  await page.getByPlaceholder("请输入您的称呼").fill("善信");
  await page.getByRole("button", { name: "点亮此灯" }).click();
  await acceptContentNotice(page);
  await page.getByText(/心愿已提交|已点亮/).first().waitFor({ timeout: 30000 });
  await assertNoForbidden(page, "/qifu result");

  await openAndCheck(page, "/wishes", "desktop-wishes");
  await page.getByRole("button", { name: "写一张心愿" }).click();
  await page.getByRole("button", { name: "天青色便签纸" }).click();
  await page.getByPlaceholder("如：念安").fill("念安");
  await page.getByPlaceholder("写下你此刻最想实现的愿望…").fill("愿家人平安顺遂，日日心安");
  await page.getByRole("button", { name: "贴上心愿墙" }).click();
  await page.getByText("便利签已贴上心愿墙").waitFor({ timeout: 30000 });
  await page.getByText("愿家人平安顺遂，日日心安").first().waitFor({ timeout: 10000 });
  const publishedWish = page.locator("[data-wish-id]").filter({ hasText: "愿家人平安顺遂，日日心安" }).first();
  if (!((await publishedWish.getAttribute("style")) || "").includes("background-color: rgb(168, 205, 216)")) throw new Error("选择的便签纸色未生效");
  const wishPosition = await assertWishScatterWall(page, "桌面端");
  await page.reload({ waitUntil: "domcontentloaded" });
  const reloadedPosition = await assertWishScatterWall(page, "桌面端刷新后");
  if (wishPosition !== reloadedPosition) throw new Error("便利签刷新后未保持固定随机位置");
  await assertNoForbidden(page, "/wishes result");

  await openAndCheck(page, "/temple", "desktop-temple");
  const incenseButton = page.locator(".temple-offer-button");
  if (await incenseButton.count() !== 1) throw new Error("一炷清香入口未找到");
  await incenseButton.click();
  await acceptContentNotice(page);
  await page.locator(".temple-burning-card.is-active").waitFor({ state: "visible", timeout: 30000 });
  if (await page.locator(".temple-incense-stick").count() !== 1) throw new Error("首炷点燃后香炉未显示一炷香");
  await assertNoForbidden(page, "/temple result");
}

async function run() {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  desktop.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await runDesktopFlows(desktop);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await openAndCheck(mobile, "/", "mobile-home");
  await openAndCheck(mobile, "/qifu", "mobile-qifu");
  await openAndCheck(mobile, "/wishes", "mobile-wishes");
  await assertWishScatterWall(mobile, "移动端");
  await openAndCheck(mobile, "/meditation", "mobile-meditation");
  await openAndCheck(mobile, "/temple", "mobile-temple");

  await browser.close();

  if (consoleErrors.length) {
    throw new Error(`页面存在 console error: ${consoleErrors.slice(0, 5).join(" | ")}`);
  }

  console.log(`Smoke passed. Screenshots: ${artifactDir}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
