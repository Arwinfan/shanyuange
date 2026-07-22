"use client";

import { useState } from "react";
import Link from "next/link";
import { deletePalmistryImage, fortunePalmistry, payOrderAndGetRecord } from "@/lib/api";
import { AccountButton, InstallAppButton, MusicButton } from "@/lib/pwa";

type Master = "huiming" | "mingxin" | "xuanzhen";
type Mode = "hand" | "face";
type Hand = "left" | "right";

const MASTERS = [
  { id: "huiming" as const, emoji: "🧘", name: "慧照长老", title: "古寺住持", style: "庄重持重，引经据典", desc: "通读《渊海子平》《滴天髓》，言语稳重克制。适合希望深度解读、看古籍出处的施主。" },
  { id: "mingxin" as const, emoji: "🙏", name: "明净师父", title: "尼众法师", style: "慈悲温柔，劝人向善", desc: "语调温和，慈悲为怀。适合家庭、感情、亲人祈福场景。" },
  { id: "xuanzhen" as const, emoji: "☯️", name: "玄清道长", title: "山中道人", style: "直爽通透，说大白话", desc: "山中道人，不爱绕弯子。把命理讲成大白话，适合急性子。" },
];

export default function PalmistryPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [master, setMaster] = useState<Master>("huiming");
  const [mode, setMode] = useState<Mode>("hand");
  const [hand, setHand] = useState<Hand>("left");
  const [imageBase64, setImageBase64] = useState("");
  const [imageName, setImageName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingOrder, setPendingOrder] = useState<{ orderId: string; amount: number } | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [fullResult, setFullResult] = useState<any>(null);
  const [currentRecordId, setCurrentRecordId] = useState("");
  const [imageDeleted, setImageDeleted] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("请上传 jpg/png 等图片文件");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("图片不能超过 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(String(reader.result || ""));
      setImageName(file.name);
      setMessage("");
      setFullResult(null);
      setPendingOrder(null);
      setCurrentRecordId("");
      setImageDeleted(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setMessage("");
    setFullResult(null);
    setPendingOrder(null);
    setCurrentRecordId("");
    setImageDeleted(false);
    try {
      const res = await fortunePalmistry({ master, mode, hand: mode === "hand" ? hand : undefined, imageBase64 });
      if (res.success && res.data) {
        setCurrentRecordId(res.data.recordId);
        setMessage(`${res.data.preview.summary}${res.data.needsPayment ? `\\n\\n支付 ¥${res.data.amount} 可解锁完整解读` : "\n\n15 天免费试运营中，完整解读已解锁"}`);
        if (res.data.fullResult) setFullResult(res.data.fullResult);
        if (res.data.orderId) setPendingOrder({ orderId: res.data.orderId, amount: res.data.amount });
      } else {
        setMessage(res.message || "创建解读失败");
      }
    } catch {
      setMessage("服务暂时不可用，请稍后重试");
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
        setMessage(res.message || "解锁失败，请稍后重试");
      }
    } catch {
      setMessage("服务暂时不可用，请稍后重试");
    }
    setUnlocking(false);
  };

  const handleDeleteImage = async () => {
    if (!currentRecordId) return;
    setDeletingImage(true);
    try {
      const res = await deletePalmistryImage(currentRecordId);
      if (res.success) {
        setImageDeleted(true);
        setImageBase64("");
        setImageName("");
        setMessage("原图已清除，已保留本次解读记录。");
      } else {
        setMessage(res.message || "原图暂未清除，请稍后重试");
      }
    } catch {
      setMessage("服务暂时不可用，请稍后重试");
    }
    setDeletingImage(false);
  };

  return (
    <div className="min-h-screen bg-xuan flex flex-col">
      <SiteHeader current="palmistry" menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      {menuOpen && <MobileMenu current="palmistry" />}

      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-24 pt-20">
        <div className="space-y-section">
          {/* Title */}
          <section className="text-center space-y-4">
            <div className="text-4xl mb-2">🖐️</div>
            <h1 className="font-display text-[40px] tracking-[0.1em] text-gold">手相 / 面相</h1>
            <div className="space-y-2 text-paper-dark/60 text-sm leading-relaxed max-w-lg mx-auto">
              <p>上传清晰掌心照，我们会先看掌色、掌丘与主线走势，再围绕图上可见特征逐段分析，并结合相学古籍做印证。</p>
              <p>不是只看一条线，而是把性情、感情、事业、财运与阶段起伏放在一张手里统看，图上看不到的地方不会硬编。</p>
            </div>
          </section>

          {/* Mode */}
          <section className="space-y-3">
            <p className="text-center text-sm text-paper-dark/60">先选这次想先深看的方向</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { id: "hand" as const, title: "手相", desc: "不是只看一条线，而是把性情、感情、事业、财运与阶段起伏放在一张手里统看，图上看不到的地方不会硬编。" },
                { id: "face" as const, title: "面相", desc: "把额头、眉眼、鼻口、下庭这些看得见的特征，落到人际气场、处事分寸、事业节奏与当下状态上来讲，只围绕图上能确认的地方下判断。" },
              ]).map(m => (
                <button key={m.id} onClick={() => setMode(m.id)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    mode === m.id ? "border-gold/60 bg-gold/10 shadow-gold" : "border-gold/20 bg-xuan-surface/40 hover:border-gold/40"
                  }`}>
                  <p className="font-display text-lg text-gold/90">{m.title}</p>
                  <p className="text-sm text-paper-dark/50 mt-2 leading-relaxed">{m.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Master */}
          <section className="space-y-4">
            <p className="text-center text-base text-paper-dark/80">请选一位师父为您开示</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {MASTERS.map(m => {
                const selected = master === m.id;
                return (
                  <button key={m.id} onClick={() => setMaster(m.id)}
                    className={`group rounded-xl border p-4 text-left transition-all ${
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

          {/* Hand Selection */}
          {mode === "hand" && (
          <section className="space-y-4">
            <p className="text-center text-sm text-paper-dark/60">看哪只手</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: "left" as const, label: "左手（先天）" },
                { id: "right" as const, label: "右手（后天）" },
              ]).map(h => (
                <button key={h.id} onClick={() => setHand(h.id)}
                  className={`rounded-lg border py-3 text-center font-medium transition-all ${
                    hand === h.id ? "border-gold/60 bg-gold/10 text-gold shadow-gold" : "border-gold/20 bg-xuan-surface/40 text-paper-dark/70 hover:border-gold/40"
                  }`}>{h.label}</button>
              ))}
            </div>
            <p className="text-xs text-paper-dark/45 text-center">传统认为：男左女右；左手主先天本性，右手主后天发展。</p>
          </section>
          )}

          {/* Photo Requirements */}
          <section className="space-y-3">
            <p className="text-sm text-paper-dark/70 text-center">拍摄要求</p>
            <ul className="rounded-lg border border-gold/20 bg-xuan-card/95 p-card-pad shadow-paper space-y-2 text-sm text-paper-dark/60">
              <li>· 自然光下，掌心张开正对镜头</li>
              <li>· 五指自然伸展，不要过分用力</li>
              <li>· 主要线条（生命线、智慧线、感情线）清晰可见</li>
              <li>· 图片小于 5MB，jpg/png 格式</li>
            </ul>
          </section>

          {/* Photo Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="rounded-xl border border-gold/20 bg-xuan-surface/40 p-6 text-center hover:border-gold/40 hover:bg-xuan-surface/70 transition-colors cursor-pointer">
              <p className="font-display text-lg text-gold/90">拍摄手相</p>
              <p className="text-sm text-paper-dark/50 mt-1">现在打开摄像头</p>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
            </label>
            <label className="rounded-xl border border-gold/20 bg-xuan-surface/40 p-6 text-center hover:border-gold/40 hover:bg-xuan-surface/70 transition-colors cursor-pointer">
              <p className="font-display text-lg text-gold/90">从相册选</p>
              <p className="text-sm text-paper-dark/50 mt-1">已有照片直接传</p>
              <input type="file" accept="image/*" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
            </label>
          </div>
          {imageName && (
            <p className="rounded-lg border border-emerald-500/20 bg-emerald-900/10 p-3 text-center text-sm text-emerald-300">
              已选择：{imageName}
            </p>
          )}

          {/* Legal */}
          <div className="space-y-2">
            <p className="text-xs text-paper-dark/40 text-center leading-relaxed">
              点击"开始专业解读"即表示您已阅读并同意
              <Link href="/terms" className="text-gold/70 hover:text-gold underline underline-offset-2">《用户协议》</Link>
              <Link href="/privacy" className="text-gold/70 hover:text-gold underline underline-offset-2">《隐私说明》</Link>与
              <Link href="/ai" className="text-gold/70 hover:text-gold underline underline-offset-2">《AI 生成说明》</Link>
              ，并同意我们按说明处理您主动提交的掌纹照片。
            </p>
            <p className="text-xs text-paper-dark/35 text-center">照片仅用于本次手相分析与结果展示。</p>
            <p className="text-xs text-paper-dark/30 text-center">仅作传统文化参考，请结合现实情况判断；未满18周岁请勿使用本服务，请勿提交他人的照片、生辰或其他信息。</p>
          </div>

          {/* Submit */}
          <div className="text-center">
            <button disabled={loading || !imageBase64} onClick={handleSubmit}
              className="inline-flex items-center justify-center rounded-lg bg-vermillion px-12 py-4 text-xl text-white font-medium tracking-wider shadow-lg shadow-vermillion/20 hover:bg-vermillion-light active:bg-vermillion-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "正在参详特征..." : "开始专业解读"}
            </button>
            {loading && <p className="mt-3 text-sm text-paper-dark/55" role="status" aria-live="polite">正在整理本次解读，请稍候。</p>}
            <p className="mt-2 text-xs text-paper-dark/40">图片仅用于本次解读，不会用于其他用途。</p>
            {message && <p className="mt-3 text-sm text-emerald-300/80 whitespace-pre-line animate-fadeIn">{message}</p>}
            {currentRecordId && !imageDeleted && (
              <button onClick={handleDeleteImage} disabled={deletingImage}
                className="mt-3 rounded-lg border border-gold/25 bg-xuan-surface/30 px-4 py-2 text-xs text-paper-dark/65 hover:border-gold/40 hover:text-gold disabled:opacity-60">
                {deletingImage ? "清除中..." : "清除本次上传原图"}
              </button>
            )}
            {pendingOrder && (
              <button onClick={handleUnlock} disabled={unlocking}
                className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-6 py-3 text-gold hover:bg-gold/15 disabled:opacity-60">
                {unlocking ? "正在整理完整解读..." : `立即支付 ¥${pendingOrder.amount} · 解锁完整解读`}
              </button>
            )}
            {fullResult && <PalmistryFullResult data={fullResult} />}
          </div>

          {/* Hand Lines Reference */}
          <div className="rounded-lg border border-gold/15 bg-xuan-surface/30 p-4 text-center">
            <button className="text-sm text-paper-dark/50 flex items-center justify-center gap-2 w-full">
              <span>🖐️</span> 手相深看会重点对照这些主线（点击展开参考）
            </button>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function PalmistryFullResult({ data }: { data: any }) {
  return (
    <div className="mt-5 rounded-xl border border-gold/20 bg-xuan-card/90 p-5 text-left shadow-paper space-y-4">
      <div>
        <p className="font-display text-xl text-gold">{data.mode === "face" ? "完整面相解读" : "完整手相解读"}</p>
        <p className="mt-1 text-sm text-paper-dark/55">{data.masterName} · {data.masterStyle}</p>
      </div>
      <p className="text-sm leading-relaxed text-paper-dark/70">{data.overview}</p>
      {Array.isArray(data.visibleFeatures) && data.visibleFeatures.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.visibleFeatures.map((item: string) => (
            <span key={item} className="rounded-full border border-gold/15 bg-gold/5 px-3 py-1 text-xs text-paper-dark/65">
              {item}
            </span>
          ))}
        </div>
      )}
      <div className="grid gap-3">
        {(data.sections || []).map((item: any) => (
          <section key={item.title} className="rounded-lg border border-gold/10 bg-xuan-surface/35 p-3">
            <p className="text-sm text-gold/80">{item.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-paper-dark/70">{item.text}</p>
          </section>
        ))}
      </div>
      {data.advice && (
        <section className="rounded-lg border border-gold/10 bg-gold/5 p-3">
          <p className="text-sm text-gold/80">师父建议</p>
          <p className="mt-1 text-sm leading-relaxed text-paper-dark/70">{data.advice}</p>
        </section>
      )}
      <p className="text-xs text-paper-dark/45">{data.privacyNote}</p>
    </div>
  );
}

function SiteHeader({ current, menuOpen, setMenuOpen }: { current: string; menuOpen: boolean; setMenuOpen: (v: boolean) => void }) {
  const nav = [{ href: "/qifu", label: "为家人祈福" },{ href: "/almanac", label: "今日黄历" },{ href: "/lottery", label: "求灵签" },{ href: "/bazi", label: "八字精批" },{ href: "/dream", label: "周公解梦" },{ href: "/palmistry", label: "手相/面相" },{ href: "/naming", label: "宝宝起名" },{ href: "/divination", label: "六爻占卜" },{ href: "/meditation", label: "静心禅坐" }];
  return (<header className="fixed top-0 inset-x-0 z-50 pt-[9px]"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 h-[54px]"><Link href="/" className="flex items-center gap-2 shrink-0"><img src="/favicon.svg" alt="善缘阁" className="size-8" /><span className="font-display text-lg tracking-[0.15em] text-gold hidden sm:inline">善缘阁</span></Link><nav className="hidden md:flex items-center gap-5 text-sm text-paper-dark/75">{nav.map(n=><Link key={n.href} href={n.href} className={n.href===`/${current}`?"text-gold":"hover:text-gold transition-colors"}>{n.label}</Link>)}</nav><div className="flex items-center gap-2"><MusicButton /><AccountButton /><InstallAppButton /><button onClick={()=>setMenuOpen(!menuOpen)} className="md:hidden flex size-8 items-center justify-center rounded-full border border-gold/30 text-gold/70 hover:bg-gold/10 hover:text-gold transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">{menuOpen?(<><path d="M18 6L6 18"/><path d="M6 6l12 12"/></>):(<><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></>)}</svg></button></div></div><div className="h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent"/></header>);
}
function MobileMenu({ current }: { current: string }) {
  const nav = [{ href: "/qifu", label: "为家人祈福" },{ href: "/almanac", label: "今日黄历" },{ href: "/lottery", label: "求灵签" },{ href: "/bazi", label: "八字精批" },{ href: "/dream", label: "周公解梦" },{ href: "/palmistry", label: "手相/面相" },{ href: "/naming", label: "宝宝起名" },{ href: "/divination", label: "六爻占卜" },{ href: "/meditation", label: "静心禅坐" }];
  return (<div className="fixed inset-x-0 top-[63px] z-40 bg-xuan/95 backdrop-blur-md border-b border-gold/10 md:hidden animate-fadeInDown"><nav className="flex flex-col p-4 space-y-1">{nav.map(n=><Link key={n.href} href={n.href} className={`py-3 px-4 rounded-lg ${n.href===`/${current}`?"text-gold bg-gold/5":"text-paper-dark/80 hover:bg-gold/5 hover:text-gold"}`}>{n.label}</Link>)}</nav></div>);
}
function SiteFooter() {
  return (<footer className="relative z-10 pt-[45px] pb-12 px-4 text-center text-sm text-paper-dark/55"><div className="mx-auto max-w-2xl space-y-6"><div className="space-y-2"><p>善念起于心，福缘自然生。一念清净，万物皆宁。</p><p>结善缘，修善念。心安之处，处处生光。</p><p>命自我立，福自我求。诸恶莫作，众善奉行。</p></div><div className="flex justify-center gap-6 text-paper-dark/45"><Link href="/terms" className="hover:text-gold/70 transition-colors">用户协议</Link><Link href="/privacy" className="hover:text-gold/70 transition-colors">隐私说明</Link><Link href="/ai" className="hover:text-gold/70 transition-colors">AI 生成说明</Link></div><div className="space-y-1 text-xs text-paper-dark/35"><p>本站内容仅作传统文化参考，不替代医疗、法律、投资等专业意见；部分说明由 AI 辅助生成。</p><p>继续使用本站或发起服务，即表示您已阅读《用户协议》《隐私说明》《AI 生成说明》；未满18周岁请勿使用本服务。</p></div><p className="text-paper-dark/30 text-xs pt-4">善缘阁 · 一念慈悲，一灯长明</p></div></footer>);
}
