"use client";

import { useState } from "react";
import Link from "next/link";
import { fortuneBazi, payOrderAndGetRecord } from "@/lib/api";
import { AccountButton, InstallAppButton, MusicButton } from "@/lib/pwa";

type Master = "huiming" | "mingxin" | "xuanzhen";
type Gender = "男" | "女";
type DatePickerKind = "year" | "month" | "day";

const YEAR_MIN = 1900;

const MASTERS = [
  { id: "huiming" as const, emoji: "🧘", name: "慧照长老", title: "古寺住持", style: "庄重持重，引经据典", desc: "通读《渊海子平》《滴天髓》，言语稳重克制。适合希望深度解读、看古籍出处的施主。" },
  { id: "mingxin" as const, emoji: "🙏", name: "明净师父", title: "尼众法师", style: "慈悲温柔，劝人向善", desc: "语调温和，慈悲为怀。适合家庭、感情、亲人祈福场景。" },
  { id: "xuanzhen" as const, emoji: "☯️", name: "玄清道长", title: "山中道人", style: "直爽通透，说大白话", desc: "山中道人，不爱绕弯子。把命理讲成大白话，适合急性子。" },
];

const HOURS = [
  "子时 (23:00-01:00)", "丑时 (01:00-03:00)", "寅时 (03:00-05:00)", "卯时 (05:00-07:00)",
  "辰时 (07:00-09:00)", "巳时 (09:00-11:00)", "午时 (11:00-13:00)", "未时 (13:00-15:00)",
  "申时 (15:00-17:00)", "酉时 (17:00-19:00)", "戌时 (19:00-21:00)", "亥时 (21:00-23:00)",
];

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getTodayParts() {
  const today = new Date();
  return {
    year: Math.max(YEAR_MIN, today.getFullYear()),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default function BaziPage() {
  const today = getTodayParts();
  const yearMax = today.year;
  const [menuOpen, setMenuOpen] = useState(false);
  const [master, setMaster] = useState<Master>("huiming");
  const [year, setYear] = useState(() => today.year);
  const [month, setMonth] = useState(() => today.month);
  const [day, setDay] = useState(() => today.day);
  const [picker, setPicker] = useState<DatePickerKind | null>(null);
  const [hour, setHour] = useState("未时 (13:00-15:00)");
  const [gender, setGender] = useState<Gender>("男");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [pendingOrder, setPendingOrder] = useState<{ orderId: string; amount: number } | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [fullResult, setFullResult] = useState<any>(null);
  const maxDay = daysInMonth(year, month);

  const changeYear = (nextYear: number) => {
    setYear(nextYear);
    setDay((current) => Math.min(current, daysInMonth(nextYear, month)));
  };

  const changeMonth = (nextMonth: number) => {
    setMonth(nextMonth);
    setDay((current) => Math.min(current, daysInMonth(year, nextMonth)));
  };

  const selectDatePart = (kind: DatePickerKind, value: number) => {
    if (kind === "year") changeYear(value);
    if (kind === "month") changeMonth(value);
    if (kind === "day") setDay(value);
    setPicker(null);
  };

  const handleBazi = async () => {
    setLoading(true);
    setResult("");
    setPendingOrder(null);
    setFullResult(null);
    try {
      const res = await fortuneBazi({ master, year, month, day, hour, gender });
      if (res.success) {
        const pre = res.data?.preview;
        if (res.data?.fullResult) setFullResult(res.data.fullResult);
        setResult(`排盘完成 · ${pre?.bazi || ""} · 日主${pre?.dayMaster || ""}\n${pre?.summary || ""}${res.data?.needsPayment ? `\n\n支付 ¥${res.data?.amount} 可解锁完整解读` : ""}`);
        if (res.data?.orderId) setPendingOrder({ orderId: res.data.orderId, amount: res.data.amount });
      } else {
        setResult(res.message || "排盘失败");
      }
    } catch {
      setResult("服务暂时不可用，请稍后重试");
    }
    setLoading(false);
  };

  const handleUnlock = async () => {
    if (!pendingOrder) return;
    setUnlocking(true);
    try {
      const res = await payOrderAndGetRecord(pendingOrder.orderId);
      if (res.success && res.data?.fullResult) {
        setFullResult(res.data.fullResult);
        setPendingOrder(null);
      } else {
        setResult(res.message || "解锁失败，请稍后重试");
      }
    } catch {
      setResult("服务暂时不可用，请稍后重试");
    }
    setUnlocking(false);
  };

  return (
    <div className="min-h-screen bg-xuan flex flex-col">
      <SiteHeader current="bazi" menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      {menuOpen && <MobileMenu current="bazi" />}

      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-24 pt-20">
        <div className="space-y-section">
          {/* Title */}
          <section className="text-center space-y-4">
            <div className="relative flex justify-center mb-2">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="22" fill="none" stroke="#d6b16c" strokeWidth="0.8" opacity="0.3"/>
                <circle cx="24" cy="24" r="18" fill="none" stroke="#d6b16c" strokeWidth="0.5" opacity="0.15"/>
                <text x="24" y="34" textAnchor="middle" fill="#d6b16c" fontSize="28" fontFamily="serif">卦</text>
              </svg>
            </div>
            <h1 className="font-display text-[40px] tracking-[0.1em] text-gold">八字精批</h1>
            <p className="text-paper-dark/70 text-base max-w-md mx-auto leading-relaxed">
              输入生辰，真排盘、看格局、看大运、看建议，先把命盘根基看清，再往后看流年节奏。
            </p>
          </section>

          {/* Master Selection */}
          <MasterSelector master={master} setMaster={setMaster} />

          {/* Date Steppers */}
          <div className="grid gap-3 md:grid-cols-3">
            <Stepper label="出生年" value={year} onChange={changeYear} onOpen={() => setPicker("year")} min={YEAR_MIN} max={yearMax} suffix="年" />
            <Stepper label="出生月" value={month} onChange={changeMonth} onOpen={() => setPicker("month")} min={1} max={12} suffix="月" />
            <Stepper label="出生日" value={day} onChange={setDay} onOpen={() => setPicker("day")} min={1} max={maxDay} suffix="日" />
          </div>

          {/* Hour & Gender */}
          <div className="rounded-lg border border-gold/20 bg-xuan-card/95 p-card-pad shadow-paper space-y-4">
            <label className="block space-y-2">
              <span className="text-sm text-paper-dark/70">出生时辰</span>
              <select value={hour} onChange={e => setHour(e.target.value)}
                className="h-12 w-full rounded-md border border-gold/20 bg-xuan-surface px-3 text-lg text-paper-dark focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30 transition-colors appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23d6b16c' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: "right 0.75rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.25rem", paddingRight: "2.5rem" }}>
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </label>

            <div className="space-y-2">
              <p className="text-sm text-paper-dark/70">性别</p>
              <div className="grid grid-cols-2 gap-3">
                {(["男","女"] as Gender[]).map(g => (
                  <button key={g} onClick={() => setGender(g)}
                    className={`rounded-lg border py-3 text-center font-medium transition-all text-lg ${
                      gender === g ? "border-gold/60 bg-gold/10 text-gold shadow-gold" : "border-gold/20 bg-xuan-surface/40 text-paper-dark/70 hover:border-gold/40"
                    }`}>{g}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-2">
            <p className="text-xs text-paper-dark/40 text-center leading-relaxed">
              点击"开始真排盘"即表示您已阅读并同意
              <Link href="/terms" className="text-gold/70 hover:text-gold underline underline-offset-2">《用户协议》</Link>
              <Link href="/privacy" className="text-gold/70 hover:text-gold underline underline-offset-2">《隐私说明》</Link>与
              <Link href="/ai" className="text-gold/70 hover:text-gold underline underline-offset-2">《AI 生成说明》</Link>
              ，并同意我们按说明处理您主动提交的生辰信息。
            </p>
            <p className="text-xs text-paper-dark/30 text-center">仅作传统文化参考，请结合现实情况判断；未满18周岁请勿使用本服务。</p>
          </div>

          {/* Submit */}
          <div className="text-center">
            <button onClick={handleBazi} disabled={loading}
              className="inline-flex items-center justify-center rounded-lg bg-vermillion px-12 py-4 text-xl text-white font-medium tracking-wider shadow-lg shadow-vermillion/20 hover:bg-vermillion-light active:bg-vermillion-dark transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? "正在排演命盘..." : "开始真排盘"}
            </button>
            {loading && <p className="mt-3 text-sm text-paper-dark/55" role="status" aria-live="polite">正在排演命盘信息，请稍候。</p>}
            {result && <p className="mt-3 text-sm text-emerald-300/80 whitespace-pre-line animate-fadeIn">{result}</p>}
            {pendingOrder && (
              <button onClick={handleUnlock} disabled={unlocking}
                className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-6 py-3 text-gold hover:bg-gold/15 disabled:opacity-60">
                {unlocking ? "正在整理完整解读..." : `立即支付 ¥${pendingOrder.amount} · 解锁完整解读`}
              </button>
            )}
            {fullResult && <BaziFullResult data={fullResult} />}
            <p className="mt-3 text-xs text-paper-dark/35">仅作传统文化参考，请结合现实情况判断</p>
          </div>
        </div>
      </main>

      <DatePartPicker
        picker={picker}
        year={year}
        month={month}
        day={day}
        maxDay={maxDay}
        yearMax={yearMax}
        onClose={() => setPicker(null)}
        onSelect={selectDatePart}
      />

      <SiteFooter />
    </div>
  );
}

function BaziFullResult({ data }: { data: any }) {
  const items = [
    ["格局根基", data.pattern],
    ["性情倾向", data.character],
    ["事业方向", data.career],
    ["财运提醒", data.wealth],
    ["亲缘感情", data.relationships],
    ["身心作息", data.health],
    ["师父建议", data.advice],
    ["古籍参考", data.classics],
  ].filter(([, value]) => value);

  return (
    <div className="mt-5 rounded-xl border border-gold/20 bg-xuan-card/90 p-5 text-left shadow-paper space-y-3">
      <div>
        <p className="font-display text-xl text-gold">完整八字精批</p>
        <p className="mt-1 text-sm text-paper-dark/55">{data.masterName} · {data.masterStyle}</p>
      </div>
      <div className="grid gap-3">
        {items.map(([label, value]) => (
          <section key={label} className="rounded-lg border border-gold/10 bg-xuan-surface/35 p-3">
            <p className="text-sm text-gold/80">{label}</p>
            <p className="mt-1 text-sm leading-relaxed text-paper-dark/70">{value}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

/* ===== Reusable Components ===== */

function Stepper({ label, value, onChange, onOpen, min, max, suffix }: { label: string; value: number; onChange: (v: number) => void; onOpen: () => void; min: number; max: number; suffix: string }) {
  return (
    <div className="rounded-lg border border-gold/20 bg-xuan-card/95 p-4 shadow-paper space-y-3">
      <p className="text-sm text-paper-dark/70">{label}</p>
      <div className="flex items-center gap-3">
        <button onClick={() => onChange(Math.max(min, value - 1))}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gold/30 text-gold/70 hover:bg-gold/10 transition-colors text-xl font-light">−</button>
        <button onClick={onOpen} className="flex min-h-[86px] flex-1 flex-col items-center justify-center rounded-lg border border-gold/20 bg-xuan-surface/40 px-2 py-3 hover:border-gold/40 transition-colors cursor-pointer">
          <span className="font-display text-2xl text-gold">{value}</span>
          <span className="text-sm text-paper-dark/50">{suffix}</span>
          <span className="text-xs text-paper-dark/30 mt-0.5">点击选择</span>
        </button>
        <button onClick={() => onChange(Math.min(max, value + 1))}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gold/30 text-gold/70 hover:bg-gold/10 transition-colors text-xl font-light">+</button>
      </div>
    </div>
  );
}

function DatePartPicker({
  picker,
  year,
  month,
  day,
  maxDay,
  yearMax,
  onClose,
  onSelect,
}: {
  picker: DatePickerKind | null;
  year: number;
  month: number;
  day: number;
  maxDay: number;
  yearMax: number;
  onClose: () => void;
  onSelect: (kind: DatePickerKind, value: number) => void;
}) {
  if (!picker) return null;

  const config = {
    year: {
      title: "选择出生年",
      suffix: "年",
      value: year,
      options: range(YEAR_MIN, yearMax).reverse(),
      columns: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5",
    },
    month: {
      title: "选择出生月",
      suffix: "月",
      value: month,
      options: range(1, 12),
      columns: "grid-cols-3 sm:grid-cols-4",
    },
    day: {
      title: "选择出生日",
      suffix: "日",
      value: day,
      options: range(1, maxDay),
      columns: "grid-cols-4 sm:grid-cols-6",
    },
  }[picker];

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 px-4 py-6 backdrop-blur-sm md:items-center">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="关闭选择面板" />
      <section className="relative w-full max-w-lg rounded-xl border border-gold/25 bg-xuan-card p-5 shadow-paper">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl text-gold">{config.title}</h2>
          <button
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full border border-gold/25 text-gold/75 hover:bg-gold/10"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        <div className={`grid ${config.columns} max-h-[52vh] gap-2 overflow-y-auto pr-1`}>
          {config.options.map((option) => {
            const selected = option === config.value;
            return (
              <button
                key={option}
                onClick={() => onSelect(picker, option)}
                className={`rounded-lg border px-3 py-3 text-center transition-all ${
                  selected
                    ? "border-gold/70 bg-gold/15 text-gold shadow-gold"
                    : "border-gold/15 bg-xuan-surface/40 text-paper-dark/75 hover:border-gold/40 hover:text-gold"
                }`}
              >
                <span className="font-display text-lg">{option}</span>
                <span className="ml-1 text-xs opacity-70">{config.suffix}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MasterSelector({ master, setMaster }: { master: Master; setMaster: (m: Master) => void }) {
  return (
    <section className="space-y-4">
      <p className="text-center text-base text-paper-dark/80">请选一位师父为您开示</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {MASTERS.map(m => {
          const selected = master === m.id;
          return (
            <button key={m.id} onClick={() => setMaster(m.id)}
              className={`group rounded-xl border p-4 text-left transition-all duration-200 ${
                selected ? "border-gold/60 bg-gold/10 shadow-gold" : "border-gold/20 bg-xuan-surface/40 hover:border-gold/40 hover:bg-xuan-surface/70"
              }`}>
              <span className="text-2xl">{m.emoji}</span>
              <p className="font-display text-lg text-gold/90 mt-2">{m.name}</p>
              <p className="text-xs text-paper-dark/50">{m.title}</p>
              <p className="text-sm text-paper-dark/70 mt-2">{m.style}</p>
              <p className="text-xs text-paper-dark/50 mt-1 leading-relaxed">{m.desc}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SiteHeader({ current, menuOpen, setMenuOpen }: { current: string; menuOpen: boolean; setMenuOpen: (v: boolean) => void }) {
  const nav = [
    { href: "/qifu", label: "为家人祈福" }, { href: "/almanac", label: "今日黄历" }, { href: "/lottery", label: "求灵签" },
    { href: "/bazi", label: "八字精批" }, { href: "/dream", label: "周公解梦" }, { href: "/palmistry", label: "手相/面相" },
    { href: "/naming", label: "宝宝起名" }, { href: "/divination", label: "六爻占卜" }, { href: "/meditation", label: "静心禅坐" },
  ];
  return (
    <header className="fixed top-0 inset-x-0 z-50 pt-[9px]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 h-[54px]">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src="/favicon.svg" alt="善缘阁" className="size-8" />
          <span className="font-display text-lg tracking-[0.15em] text-gold hidden sm:inline">善缘阁</span>
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm text-paper-dark/75">
          {nav.map(n => (
            <Link key={n.href} href={n.href} className={n.href === `/${current}` ? "text-gold" : "hover:text-gold transition-colors"}>{n.label}</Link>
          ))}
        </nav>
        <HeaderActions menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />
    </header>
  );
}

function HeaderActions({ menuOpen, setMenuOpen }: { menuOpen: boolean; setMenuOpen: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <MusicButton />
      <AccountButton />
      <InstallAppButton />
      <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden flex size-8 items-center justify-center rounded-full border border-gold/30 text-gold/70 hover:bg-gold/10 hover:text-gold transition-colors">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {menuOpen ? (<><path d="M18 6L6 18"/><path d="M6 6l12 12"/></>) : (<><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></>)}
        </svg>
      </button>
    </div>
  );
}

function MobileMenu({ current }: { current: string }) {
  const nav = [
    { href: "/qifu", label: "为家人祈福" }, { href: "/almanac", label: "今日黄历" }, { href: "/lottery", label: "求灵签" },
    { href: "/bazi", label: "八字精批" }, { href: "/dream", label: "周公解梦" }, { href: "/palmistry", label: "手相/面相" },
    { href: "/naming", label: "宝宝起名" }, { href: "/divination", label: "六爻占卜" }, { href: "/meditation", label: "静心禅坐" },
  ];
  return (
    <div className="fixed inset-x-0 top-[63px] z-40 bg-xuan/95 backdrop-blur-md border-b border-gold/10 md:hidden animate-fadeInDown">
      <nav className="flex flex-col p-4 space-y-1">
        {nav.map(n => (
          <Link key={n.href} href={n.href} className={`py-3 px-4 rounded-lg ${n.href === `/${current}` ? "text-gold bg-gold/5" : "text-paper-dark/80 hover:bg-gold/5 hover:text-gold"}`}>{n.label}</Link>
        ))}
      </nav>
    </div>
  );
}

function SiteFooter() {
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
