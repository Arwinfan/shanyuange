"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fortuneDraw, getQuotaToday, payOrderAndGetRecord } from "@/lib/api";
import { AccountButton, InstallAppButton, MusicButton } from "@/lib/pwa";

type Master = "huiming" | "mingxin" | "xuanzhen";

const MASTERS: { id: Master; emoji: string; name: string; title: string; style: string; desc: string }[] = [
  {
    id: "huiming",
    emoji: "🧘",
    name: "慧照长老",
    title: "古寺住持",
    style: "庄重持重，引经据典",
    desc: "通读《渊海子平》《滴天髓》，言语稳重克制。适合希望深度解读、看古籍出处的施主。",
  },
  {
    id: "mingxin",
    emoji: "🙏",
    name: "明净师父",
    title: "尼众法师",
    style: "慈悲温柔，劝人向善",
    desc: "语调温和，慈悲为怀。适合家庭、感情、亲人祈福场景。",
  },
  {
    id: "xuanzhen",
    emoji: "☯️",
    name: "玄清道长",
    title: "山中道人",
    style: "直爽通透，说大白话",
    desc: "山中道人，不爱绕弯子。把命理讲成大白话，适合急性子。",
  },
];

export default function LotteryPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [master, setMaster] = useState<Master>("huiming");
  const [question, setQuestion] = useState("");
  const [drawing, setDrawing] = useState(false);
  const [quotaText, setQuotaText] = useState("1/1");
  const [trialActive, setTrialActive] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [pendingOrder, setPendingOrder] = useState<{ orderId: string; amount: number } | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const refreshQuota = async () => {
    const res = await getQuotaToday("fortune_draw");
    const quota = res.data?.items?.[0];
    if (quota) setQuotaText(`${quota.remaining}/${quota.total}`);
    if (res.data?.trial) setTrialActive(res.data.trial.active);
  };

  useEffect(() => {
    refreshQuota().catch(() => {});
  }, []);

  const handleDraw = async () => {
    setDrawing(true);
    setResult(null);
    setPendingOrder(null);
    try {
      const res = await fortuneDraw(master, question || undefined);
      if (res.success) {
        setResult(res.data?.fullResult || res.data?.preview);
        if (res.data?.orderId) setPendingOrder({ orderId: res.data.orderId, amount: res.data.amount });
        if (res.data?.quota) setQuotaText(`${res.data.quota.remaining}/${res.data.quota.total}`);
        if (res.data?.trial) setTrialActive(res.data.trial.active);
      } else {
        setResult({ error: res.message || "抽签失败" });
      }
    } catch {
      setResult({ error: "服务暂时不可用，请稍后重试" });
    }
    setDrawing(false);
  };

  const handleUnlock = async () => {
    if (!pendingOrder) return;
    setUnlocking(true);
    try {
      const res = await payOrderAndGetRecord(pendingOrder.orderId);
      if (res.success && res.data?.fullResult) {
        setResult(res.data.fullResult);
        setPendingOrder(null);
      } else {
        setResult({ error: res.message || "解锁失败，请稍后重试" });
      }
    } catch {
      setResult({ error: "服务暂时不可用，请稍后重试" });
    }
    setUnlocking(false);
  };

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
            <Link href="/almanac" className="hover:text-gold transition-colors">今日黄历</Link>
            <Link href="/lottery" className="text-gold transition-colors">求灵签</Link>
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
      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-24 pt-20">
        <div className="space-y-section">
          {/* ===== Title Section ===== */}
          <section className="text-center space-y-4">
            {/* Decorative divider */}
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent max-w-16" />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d6b16c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 6 9 6 9z"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 18 9 18 9z"/>
                <path d="M4 22h16"/><path d="M10 14.66V22"/><path d="M14 14.66V22"/>
                <path d="M12 14.66a2.5 2.5 0 0 1-2.5-2.5V9h5v3.16a2.5 2.5 0 0 1-2.5 2.5Z"/>
              </svg>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent max-w-16" />
            </div>

            <h1 className="font-display text-[40px] tracking-[0.1em] text-gold">
              关帝灵签
            </h1>
            <p className="text-paper-dark/70 text-base">
              心诚则灵 · 默念所求 · 抽一支签
            </p>

            {/* Free count badge */}
            <div className="inline-flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 border border-emerald-500/30 bg-emerald-900/20 text-emerald-300">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l1.5 4.5h4.8l-3.9 2.8 1.5 4.7-3.9-2.8-3.9 2.8 1.5-4.7-3.9-2.8h4.8z"/>
                </svg>
                {trialActive ? <>15 天免费试运营 <span className="font-semibold text-white">进行中</span></> : <>今日免费 <span className="font-semibold text-white">{quotaText}</span></>}
              </span>
            </div>
          </section>

          {/* ===== Master Selection ===== */}
          <section className="space-y-4">
            <p className="text-center text-base text-paper-dark/80">
              请选一位师父为您开示
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {MASTERS.map((m) => {
                const isSelected = master === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMaster(m.id)}
                    className={`group rounded-xl border p-4 text-left transition-all duration-200 ${
                      isSelected
                        ? "border-gold/60 bg-gold/10 shadow-gold"
                        : "border-gold/20 bg-xuan-surface/40 hover:border-gold/40 hover:bg-xuan-surface/70"
                    }`}
                  >
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

          {/* ===== Question Input Card ===== */}
          <section className="rounded-lg border border-gold/20 bg-xuan-card/95 p-card-pad shadow-paper space-y-4">
            <p className="text-base text-paper-dark/80 text-center">
              写下您要问的事，心诚则灵
            </p>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="例如：家人身体能否安康？"
              rows={4}
              className="w-full rounded-md border border-gold/20 bg-xuan-surface px-4 py-3 text-base text-paper-dark placeholder:text-paper-dark/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30 transition-colors resize-none"
            />
          </section>

          {/* ===== Draw Button ===== */}
          <div className="flex justify-center">
            <button
              onClick={handleDraw}
              disabled={drawing}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-vermillion px-9 py-3 text-xl text-white font-medium tracking-wider shadow-lg shadow-vermillion/20 hover:bg-vermillion-light active:bg-vermillion-dark transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {drawing ? (
                <>
                  <svg className="animate-spin size-5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/>
                  </svg>
                  正在参详签文...
                </>
              ) : (
                "默念所求 · 求一支签"
              )}
            </button>
          </div>

            {drawing && <p className="mt-3 text-center text-sm text-paper-dark/55" role="status" aria-live="polite">正在整理签文与典籍参考，请稍候。</p>}
          {(result || pendingOrder) && (
            <ResultCard result={result} pendingOrder={pendingOrder} unlocking={unlocking} onUnlock={handleUnlock} />
          )}
        </div>
      </main>

      {/* ===== Footer ===== */}
      <Footer />
    </div>
  );
}

function ResultCard({ result, pendingOrder, unlocking, onUnlock }: { result: any; pendingOrder: { orderId: string; amount: number } | null; unlocking: boolean; onUnlock: () => void }) {
  if (result?.error) {
    return <p className="rounded-lg border border-vermillion/30 bg-vermillion/10 p-4 text-sm text-vermillion-light">{result.error}</p>;
  }

  return (
    <section className="rounded-xl border border-gold/20 bg-xuan-card/95 p-5 shadow-paper space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-xl text-gold">第 {result?.lotNumber || "?"} 签 · {result?.level || ""}</p>
        <span className="text-xs text-paper-dark/45">{result?.masterName}</span>
      </div>
      <p className="text-sm text-paper-dark/70">{result?.shortVerse}</p>
      {result?.verse && <p className="text-base leading-relaxed text-gold/80">{result.verse}</p>}
      {result?.interpretation && <p className="text-sm leading-relaxed text-paper-dark/70">{result.interpretation}</p>}
      {result?.advice && <p className="text-sm leading-relaxed text-paper-dark/60">建议：{result.advice}</p>}
      {result?.culturalNote && <p className="text-xs leading-relaxed text-paper-dark/40">{result.culturalNote}</p>}
      {pendingOrder && (
        <button onClick={onUnlock} disabled={unlocking}
          className="rounded-lg border border-gold/40 bg-gold/10 px-5 py-2.5 text-sm text-gold hover:bg-gold/15 disabled:opacity-60">
          {unlocking ? "正在整理完整签解..." : `立即支付 ¥${pendingOrder.amount} · 查看完整签解`}
        </button>
      )}
    </section>
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
      <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden flex size-8 items-center justify-center rounded-full border border-gold/30 text-gold/70 hover:bg-gold/10 hover:text-gold transition-colors">
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
        <Link href="/almanac" className="py-3 px-4 rounded-lg text-paper-dark/80 hover:bg-gold/5 hover:text-gold">今日黄历</Link>
        <Link href="/lottery" className="py-3 px-4 rounded-lg text-gold bg-gold/5">求灵签</Link>
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
