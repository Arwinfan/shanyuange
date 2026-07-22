"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAlmanacToday, type AlmanacData } from "@/lib/api";
import { AccountButton, InstallAppButton, MusicButton } from "@/lib/pwa";

// --- Data: Chinese Almanac for 2026-06-29 ---

const DATE_INFO = {
  solar: "2026年6月29日",
  weekday: "星期一",
  lunar: "农历二〇二六年五月十五",
  ganzhi: "丙午年 甲午月 甲戌日 (山头火)",
  zodiac: "马年",
  rating: "上上",
  ratingText: "诸事大吉，宜把握良机",
};

const YI = ["嫁娶", "纳采", "祭祀", "祈福", "出行", "立券", "移徙", "入宅"];
const JI = ["开光", "作灶", "盖屋", "架马", "开仓"];

const SHENSHA = [
  { label: "吉神宜趋", value: "三合、临日、时阴、天仓、不将、普护", variant: "gold" as const },
  { label: "凶神宜避", value: "死气、天刑", variant: "vermillion" as const },
  { label: "冲煞", value: "(戊辰)龙", variant: "gold" as const },
  { label: "胎神方位", value: "占门栖 外西南", variant: "gold" as const },
  { label: "28 宿", value: "心 · 凶", variant: "gold" as const },
  { label: "12 建除", value: "定", variant: "gold" as const },
];

const HOURS = [
  { shi: "时", name: "甲子", chong: "(戊午)马" },
  { shi: "时", name: "乙丑", chong: "(己未)羊" },
  { shi: "时", name: "丙寅", chong: "(庚申)猴" },
  { shi: "时", name: "丁卯", chong: "(辛酉)鸡" },
  { shi: "时", name: "戊辰", chong: "(壬戌)狗" },
  { shi: "时", name: "己巳", chong: "(癸亥)猪" },
  { shi: "时", name: "庚午", chong: "(甲子)鼠" },
  { shi: "时", name: "辛未", chong: "(乙丑)牛" },
  { shi: "时", name: "壬申", chong: "(丙寅)虎" },
  { shi: "时", name: "癸酉", chong: "(丁卯)兔" },
  { shi: "时", name: "甲戌", chong: "(戊辰)龙" },
  { shi: "时", name: "乙亥", chong: "(己巳)蛇" },
  { shi: "时", name: "丙子", chong: "(庚午)马" },
];

const WEEK_DAYS: { day: string; lunar: string; rating: string }[] = [
  { day: "周一", lunar: "十五", rating: "上上" },
  { day: "周二", lunar: "十六", rating: "上上" },
  { day: "周三", lunar: "十七", rating: "下下" },
  { day: "周四", lunar: "十八", rating: "上上" },
  { day: "周五", lunar: "十九", rating: "上上" },
  { day: "周六", lunar: "二十", rating: "下下" },
  { day: "周日", lunar: "廿一", rating: "上上" },
];

const FALLBACK_ALMANAC: AlmanacData = {
  dateInfo: DATE_INFO,
  yi: YI,
  ji: JI,
  shensha: SHENSHA,
  hours: HOURS,
  weekDays: WEEK_DAYS.map((day) => ({ ...day, date: "" })),
};

function shiftYmd(dateText: string | undefined, days: number) {
  const base = dateText ? new Date(`${dateText}T12:00:00+08:00`) : new Date();
  base.setDate(base.getDate() + days);
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(base);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month").padStart(2, "0")}-${get("day").padStart(2, "0")}`;
}

export default function AlmanacPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [almanac, setAlmanac] = useState<AlmanacData>(FALLBACK_ALMANAC);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getAlmanacToday(selectedDate).then((res) => {
      if (alive && res.success && res.data) setAlmanac(res.data);
    }).catch(() => {}).finally(() => {
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  }, [selectedDate]);

  const { dateInfo } = almanac;
  const currentDate = dateInfo.date || selectedDate;

  return (
    <div className="min-h-screen bg-xuan flex flex-col">
      {/* ===== Header ===== */}
      <header className="fixed top-0 inset-x-0 z-50 pt-[9px]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 h-[54px]">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <BodhiIcon />
            <span className="font-display text-lg tracking-[0.15em] text-gold hidden sm:inline">善缘阁</span>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-sm text-paper-dark/75">
            <Link href="/qifu" className="hover:text-gold transition-colors">为家人祈福</Link>
            <Link href="/almanac" className="text-gold transition-colors">今日黄历</Link>
            <Link href="/lottery" className="hover:text-gold transition-colors">求灵签</Link>
            <Link href="/bazi" className="hover:text-gold transition-colors">八字精批</Link>
            <Link href="/dream" className="hover:text-gold transition-colors">周公解梦</Link>
            <Link href="/palmistry" className="hover:text-gold transition-colors">手相/面相</Link>
            <Link href="/naming" className="hover:text-gold transition-colors">宝宝起名</Link>
            <Link href="/divination" className="hover:text-gold transition-colors">六爻占卜</Link>
            <Link href="/meditation" className="hover:text-gold transition-colors">静心禅坐</Link>
          </nav>
          <HeaderActions menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />
      </header>

      {menuOpen && <MobileMenu />}

      {/* ===== Main Content ===== */}
      <main className="relative z-10 mx-auto w-full max-w-[1008px] px-[18px] pb-[108px] pt-20">
        <div className="space-y-6">
          {/* ===== Date Navigation + Rating Card ===== */}
          <div className="rounded-lg border border-gold/40 bg-xuan-card p-card-pad shadow-paper text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              {/* Prev day */}
              <button
                aria-label="前一天"
                disabled={loading}
                onClick={() => setSelectedDate(shiftYmd(currentDate, -1))}
                className="rounded-full border border-gold/30 p-2 text-gold hover:bg-gold/10 transition-colors disabled:opacity-50"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
              </button>

              {/* Center: date + metadata */}
              <div className="flex-1 space-y-1">
                {/* Day rating badge */}
                <p className="flex items-center justify-center gap-2 text-sm tracking-widest text-gold/85">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                  黄历 · <span className="font-display text-lg text-amber-400">{dateInfo.rating}</span>
                </p>

                {/* Main date */}
                <h1 className="font-display text-[40px] tracking-[0.05em] text-gold leading-tight">
                  {dateInfo.solar}
                </h1>
                <p className="text-sm text-paper-dark/60">
                  {dateInfo.weekday} · {dateInfo.lunar}
                </p>
                <p className="text-sm text-paper-dark/50">
                  干支：{dateInfo.ganzhi} · {dateInfo.zodiac}
                </p>
              </div>

              {/* Next day */}
              <button
                aria-label="后一天"
                disabled={loading}
                onClick={() => setSelectedDate(shiftYmd(currentDate, 1))}
                className="rounded-full border border-gold/30 p-2 text-gold hover:bg-gold/10 transition-colors disabled:opacity-50"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>
            </div>

            {/* Rating verdict */}
            <p className="text-base text-paper-dark/70">{dateInfo.ratingText}</p>
          </div>

          {/* ===== 宜 (Yi) Card ===== */}
          <div className="rounded-lg border border-gold/20 bg-xuan-card/95 p-card-pad shadow-paper space-y-4">
            <h2 className="font-display text-xl text-gold flex items-center gap-2">
              <span className="text-emerald-400">宜</span>
              <span className="text-sm text-paper-dark/50 font-body">今日适合</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {almanac.yi.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-emerald-500/40 bg-emerald-900/20 px-3 py-1 text-base text-emerald-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* ===== 忌 (Ji) Card ===== */}
          <div className="rounded-lg border border-gold/20 bg-xuan-card/95 p-card-pad shadow-paper space-y-4">
            <h2 className="font-display text-xl text-gold flex items-center gap-2">
              <span className="text-vermillion">忌</span>
              <span className="text-sm text-paper-dark/50 font-body">今日避开</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {almanac.ji.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-vermillion/40 bg-vermillion/15 px-3 py-1 text-base text-vermillion-light"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* ===== 神煞 · 冲煞 Card ===== */}
          <div className="rounded-lg border border-gold/20 bg-xuan-card/95 p-card-pad shadow-paper space-y-3">
            <h2 className="font-display text-xl text-gold">神煞 · 冲煞</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {almanac.shensha.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-gold/15 bg-xuan-surface/40 p-3"
                >
                  <p className={`text-sm ${item.variant === "vermillion" ? "text-vermillion/85" : "text-gold/85"}`}>
                    {item.label}
                  </p>
                  <p className="mt-1 text-base text-paper-dark/85">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ===== 时辰吉凶 Card ===== */}
          <div className="rounded-lg border border-gold/20 bg-xuan-card/95 p-card-pad shadow-paper space-y-3">
            <h2 className="font-display text-xl text-gold">时辰吉凶</h2>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
              {almanac.hours.map((hour, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-gold/15 bg-xuan-surface/40 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-base text-gold">{hour.shi}</span>
                  </div>
                  <p className="text-xs text-paper-dark/65">{hour.name}</p>
                  <p className="mt-1 text-xs text-paper-dark/55">{hour.chong}</p>
                  {hour.yi?.length ? (
                    <p className="mt-2 text-xs leading-relaxed text-emerald-300/80">
                      宜 {hour.yi.slice(0, 3).join("、")}
                    </p>
                  ) : null}
                  {hour.ji?.length ? (
                    <p className="mt-1 text-xs leading-relaxed text-vermillion-light/80">
                      忌 {hour.ji.slice(0, 3).join("、")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* ===== 未来七日 Card ===== */}
          <div className="rounded-lg border border-gold/20 bg-xuan-card/95 p-card-pad shadow-paper space-y-4">
            <h2 className="font-display text-xl text-gold">未来七日</h2>
            <div className="grid grid-cols-4 gap-2 md:grid-cols-7">
              {almanac.weekDays.map((d, i) => {
                const isToday = d.date === currentDate || (!currentDate && i === 0);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(d.date)}
                    className={`rounded-lg border-2 p-2 text-center transition-colors ${
                      isToday
                        ? "border-gold bg-gold/15"
                        : "border-gold/20 bg-xuan-surface/40 hover:border-gold/50"
                    }`}
                  >
                    <p className="text-xs text-paper-dark/65">{d.day}</p>
                    <p className="font-display text-sm text-gold/85 mt-0.5">{d.lunar}</p>
                    <p className={`text-xs mt-0.5 ${d.rating === "上上" ? "text-emerald-400" : "text-vermillion/80"}`}>
                      {d.rating}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {almanac.source && (
            <div className="rounded-lg border border-gold/15 bg-xuan-card/70 p-4 text-sm leading-relaxed text-paper-dark/55">
              <p className="text-gold/80">数据来源：{almanac.source.name}</p>
              {almanac.source.description ? <p className="mt-1">{almanac.source.description}</p> : null}
            </div>
          )}
        </div>
      </main>

      {/* ===== Footer ===== */}
      <Footer />

    </div>
  );
}

/* ===== Shared Components ===== */

function BodhiIcon() {
  return (
    <img src="/favicon.svg" alt="善缘阁" className="size-8" />
  );
}

function HeaderActions({ menuOpen, setMenuOpen }: { menuOpen: boolean; setMenuOpen: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <MusicButton />
      <AccountButton />
      <InstallAppButton />
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="md:hidden flex size-8 items-center justify-center rounded-full border border-gold/30 text-gold/70 hover:bg-gold/10 hover:text-gold transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {menuOpen ? (<><path d="M18 6L6 18"/><path d="M6 6l12 12"/></>) : (<><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></>)}
        </svg>
      </button>
    </div>
  );
}

function MobileMenu() {
  return (
    <div className="fixed inset-x-0 top-[63px] z-40 bg-xuan/95 backdrop-blur-md border-b border-gold/10 md:hidden animate-fadeInDown">
      <nav className="flex flex-col p-4 space-y-1">
        <Link href="/qifu" className="py-3 px-4 rounded-lg text-paper-dark/80 hover:bg-gold/5 hover:text-gold">为家人祈福</Link>
        <Link href="/almanac" className="py-3 px-4 rounded-lg text-gold bg-gold/5">今日黄历</Link>
        <Link href="/lottery" className="py-3 px-4 rounded-lg text-paper-dark/80 hover:bg-gold/5 hover:text-gold">求灵签</Link>
        <Link href="/bazi" className="py-3 px-4 rounded-lg text-paper-dark/80 hover:bg-gold/5 hover:text-gold">八字精批</Link>
        <Link href="/dream" className="py-3 px-4 rounded-lg text-paper-dark/80 hover:bg-gold/5 hover:text-gold">周公解梦</Link>
        <Link href="/palmistry" className="py-3 px-4 rounded-lg text-paper-dark/80 hover:bg-gold/5 hover:text-gold">手相/面相</Link>
        <Link href="/naming" className="py-3 px-4 rounded-lg text-paper-dark/80 hover:bg-gold/5 hover:text-gold">宝宝起名</Link>
        <Link href="/divination" className="py-3 px-4 rounded-lg text-paper-dark/80 hover:bg-gold/5 hover:text-gold">六爻占卜</Link>
        <Link href="/meditation" className="py-3 px-4 rounded-lg text-paper-dark/80 hover:bg-gold/5 hover:text-gold">静心禅坐</Link>
      </nav>
    </div>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 pt-[45px] pb-12 px-4 text-center text-sm text-paper-dark/55">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-2">
          <p>善念起于心，福缘自然生。一念清净，万物皆宁。</p>
          <p>结善缘，修善念。心安之处，处处生光。</p>
          <p>命自我立，福自我求。诸恶莫作，众善奉行。</p>
        </div>
        <div className="flex justify-center gap-6 text-paper-dark/45">
          <Link href="/terms" className="hover:text-gold/70 transition-colors">用户协议</Link>
          <Link href="/privacy" className="hover:text-gold/70 transition-colors">隐私说明</Link>
          <Link href="/ai" className="hover:text-gold/70 transition-colors">AI 生成说明</Link>
        </div>
        <div className="space-y-1 text-xs text-paper-dark/35">
          <p>本站内容仅作传统文化参考，不替代医疗、法律、投资等专业意见；部分说明由 AI 辅助生成。</p>
          <p>继续使用本站或发起服务，即表示您已阅读《用户协议》《隐私说明》《AI 生成说明》；未满18周岁请勿使用本服务。</p>
        </div>
        <p className="text-paper-dark/30 text-xs pt-4">善缘阁 · 一念慈悲，一灯长明</p>
      </div>
    </footer>
  );
}
