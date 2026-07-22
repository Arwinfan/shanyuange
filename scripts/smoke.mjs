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
  await page.getByText(/第\s*\d+\s*签/).first().waitFor({ timeout: 90000 });
  await assertNoForbidden(page, "/lottery result");

  await openAndCheck(page, "/divination", "desktop-divination");
  await page.locator("textarea").fill("这次出行是否顺利");
  await page.getByRole("button", { name: /抽签|加抽/ }).first().click();
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
  await page.getByText(/心愿已提交|已点亮/).first().waitFor({ timeout: 30000 });
  await assertNoForbidden(page, "/qifu result");

  await openAndCheck(page, "/temple", "desktop-temple");
  const incenseButton = page.locator(".temple-offer-button");
  if (await incenseButton.count() !== 1) throw new Error("一炷清香入口未找到");
  await incenseButton.click();
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
