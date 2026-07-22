"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getIncenseStatus,
  offerIncense,
  payOrder,
  type IncenseOffering,
  type TrialInfo,
} from "@/lib/api";

type IncenseStatus = {
  burningMinutes: number;
  hasFreeOffering: boolean;
  total: number;
  active: IncenseOffering[];
  history: IncenseOffering[];
  trial?: TrialInfo;
};

function formatCountdown(endsAt: string | null, now: number) {
  if (!endsAt) return "30:00";
  const seconds = Math.min(30 * 60, Math.max(0, Math.ceil((Date.parse(endsAt) - now) / 1000)));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatDate(value: string | null) {
  if (!value) return "待点燃";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function incenseRemainingRatio(endsAt: string | null, now: number) {
  if (!endsAt) return 0;
  return Math.max(0.12, Math.min(1, (Date.parse(endsAt) - now) / (30 * 60 * 1000)));
}

function IncenseMark({ offerings, now }: { offerings: IncenseOffering[]; now: number }) {
  const positions = offerings.length === 1
    ? ["center"]
    : offerings.length === 2
      ? ["left", "right"]
      : ["left", "center", "right"];

  return (
    <div className={`temple-incense-mark ${offerings.length ? "is-burning" : ""}`} role="img" aria-label={offerings.length ? `香炉中正在燃烧 ${offerings.length} 炷香` : "香炉中暂无香"}>
      <img className="temple-incense-censer temple-incense-censer-base" src="/images/temple-incense-censer-level-v1.png" alt="" />
      {offerings.map((offering, index) => (
        <span
          className={`temple-incense-stick temple-incense-stick-${positions[index]}`}
          key={offering.incenseId}
          style={{ height: `${1.15 + 5.65 * incenseRemainingRatio(offering.endsAt, now)}rem` }}
        >
          <i className="temple-incense-ember" />
          <i className="temple-incense-smoke temple-incense-smoke-one" />
          <i className="temple-incense-smoke temple-incense-smoke-two" />
        </span>
      ))}
      <img className="temple-incense-censer temple-incense-censer-front" src="/images/temple-incense-censer-level-v1.png" alt="" />
    </div>
  );
}

export default function TempleClient() {
  const [status, setStatus] = useState<IncenseStatus | null>(null);
  const [dedication, setDedication] = useState("");
  const [wish, setWish] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const loadStatus = useCallback(async () => {
    const result = await getIncenseStatus();
    if (result.success && result.data) {
      setStatus(result.data);
    } else {
      setNotice("香火记录暂未载入，请稍后刷新页面。");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const active = status?.active || [];
  const activeCountdowns = useMemo(
    () => active.map((item) => ({ id: item.incenseId, dedication: item.dedication, value: formatCountdown(item.endsAt, now) })),
    [active, now],
  );

  useEffect(() => {
    if (active.some((item) => item.endsAt && Date.parse(item.endsAt) <= now)) {
      void loadStatus();
    }
  }, [active, loadStatus, now]);

  async function completeOrder(orderId: string) {
    setSubmitting(true);
    const paid = await payOrder(orderId);
    setSubmitting(false);
    if (!paid.success) {
      setNotice(paid.message || "暂时无法完成本次供香，请稍后重试。");
      return;
    }
    setPendingOrderId(null);
    setDedication("");
    setWish("");
    setNotice("香已点燃，将在 30 分钟内静静燃烧。");
    await loadStatus();
  }

  async function createOffering(confirmedPaid = false) {
    if ((status?.active.length || 0) >= 3) {
      setNotice("香炉中已有三炷清香，请待其中一炷燃尽后再供香。");
      return;
    }
    if (status?.hasFreeOffering && !confirmedPaid && !status?.trial?.active) {
      setConfirmOpen(true);
      return;
    }

    setSubmitting(true);
    setNotice("");
    const result = await offerIncense({ dedication, wish });
    setSubmitting(false);

    if (!result.success || !result.data) {
      setNotice(result.message || "暂时无法点燃此香，请稍后重试。");
      return;
    }

    if (result.data.needsPayment && result.data.orderId) {
      if (!confirmedPaid) {
        setPendingOrderId(result.data.orderId);
        setConfirmOpen(true);
        return;
      }
      await completeOrder(result.data.orderId);
      return;
    }

    setDedication("");
    setWish("");
    setNotice("第一炷香已点燃，将在 30 分钟内静静燃烧。");
    await loadStatus();
  }

  async function handlePaidConfirm() {
    setConfirmOpen(false);
    if (pendingOrderId) {
      await completeOrder(pendingOrderId);
      return;
    }
    await createOffering(true);
  }

  const hasUsedFree = Boolean(status?.hasFreeOffering);
  const trialActive = Boolean(status?.trial?.active);
  const incenseFull = active.length >= 3;
  const primaryLabel = incenseFull ? "香炉已满，静候香尽" : trialActive ? "15 天免费试运营 · 敬上一炷清香" : hasUsedFree ? "供奉一炷清香 · ¥2.99" : "免费点燃第一炷";

  return (
    <main className="temple-page">
      <section className="temple-hero" aria-labelledby="temple-title">
        <div className="temple-hero-copy">
          <p className="temple-eyebrow"><span /> 一炷清香</p>
          <h1 id="temple-title">以一炷香，安放心中所念</h1>
          <p className="temple-hero-lede">一念起，香火相续。为自己、家人或心中所念之人敬上一炷清香，让心意有一处安放。</p>
          <div className="temple-hero-notes" aria-label="供香说明">
            <span>{trialActive ? "15 天免费试运营" : "首炷免费"}</span>
            <i />
            <span>{trialActive ? `剩余 ${status?.trial?.daysRemaining || 0} 天` : "后续每炷 ¥2.99"}</span>
            <i />
            <span>每炷燃烧 30 分钟</span>
          </div>
        </div>
        <figure className="temple-hero-art">
          <img src="/images/temple-incense-altar-v1.png" alt="夜色中插着清香的铜香炉" />
          <figcaption>香起于一念，心归于当下</figcaption>
        </figure>
      </section>

      <section className="temple-offering-zone" aria-labelledby="offering-title">
        <div className="temple-zone-heading">
          <div>
            <p className="temple-eyebrow"><span /> 供香台</p>
            <h2 id="offering-title">敬上一炷清香</h2>
          </div>
          <p>点燃后将持续 30 分钟，离开页面后也会按实际时间延续。</p>
        </div>

        <div className="temple-ritual-panel">
          <div className="temple-form-column">
            <label>
              <span>为谁敬香 <em>可选</em></span>
              <input value={dedication} onChange={(event) => setDedication(event.target.value)} maxLength={20} placeholder="如：家人、自己、心中所念" />
            </label>
            <label>
              <span>写下一句心愿 <em>可选，最多 80 字</em></span>
              <textarea value={wish} onChange={(event) => setWish(event.target.value)} maxLength={80} placeholder="愿所念之人平安顺遂，愿此心安定明朗。" rows={4} />
            </label>
            <button type="button" onClick={() => void createOffering()} disabled={loading || submitting || incenseFull} className="temple-offer-button">
              <span>{submitting ? "正在整理香火…" : primaryLabel}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M14 7l5 5-5 5" /></svg>
            </button>
            {notice && <p className="temple-notice" role="status">{notice}</p>}
          </div>

          <aside className={`temple-burning-card ${active.length ? "is-active" : ""}`} aria-live="polite">
            <div className="temple-burning-card-head">
              <span>{active.length ? `燃烧中 · ${active.length}/3 炷` : "香火未起"}</span>
              <strong>{active.length ? activeCountdowns[0]?.value : "30:00"}</strong>
            </div>
            <IncenseMark offerings={active} now={now} />
            {active.length ? (
              <div className="temple-active-copy">
                <strong>{active.length === 3 ? "香炉已满，静候香尽" : `为${active[0]?.dedication || "自己"}敬香`}</strong>
                <div className="temple-active-timers">
                  {activeCountdowns.map((item, index) => <span key={item.id}>第 {index + 1} 炷 · {item.value}</span>)}
                </div>
              </div>
            ) : (
              <div className="temple-active-copy">
                <strong>静候一念香起</strong>
                <span>{trialActive ? "试运营期间免费，点燃后开始 30 分钟计时" : "首炷免费，点燃后开始 30 分钟计时"}</span>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="temple-ledger" aria-labelledby="ledger-title">
        <div className="temple-zone-heading temple-ledger-heading">
          <div>
            <p className="temple-eyebrow"><span /> 香火记</p>
            <h2 id="ledger-title">留下的每一份心意</h2>
          </div>
          <span className="temple-ledger-total">累计敬香 {status?.total || 0} 炷</span>
        </div>
        {loading ? (
          <div className="temple-empty-ledger">正在整理香火记录…</div>
        ) : status?.history?.length ? (
          <div className="temple-history-list">
            {status.history.map((item) => (
              <article className="temple-history-row" key={item.incenseId}>
                <div className={`temple-history-dot ${item.status === "burning" ? "is-burning" : ""}`} aria-hidden="true" />
                <div>
                  <h3>为{item.dedication || "自己"}敬香</h3>
                  <p>{item.wish || "愿心中所念，安稳明朗。"}</p>
                </div>
                <div className="temple-history-meta">
                  <span>{item.amount === 0 ? "试运营免费" : item.isFree ? "首炷免费" : "¥2.99"}</span>
                  <time>{formatDate(item.startedAt || item.createdAt)}</time>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="temple-empty-ledger">第一炷香尚未点燃，愿此刻的心意有一处安放。</div>
        )}
      </section>

      {confirmOpen && (
        <div className="temple-dialog-backdrop" role="presentation" onMouseDown={() => !submitting && setConfirmOpen(false)}>
          <section className="temple-payment-dialog" role="dialog" aria-modal="true" aria-labelledby="payment-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="temple-dialog-close" onClick={() => setConfirmOpen(false)} aria-label="关闭确认窗口">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            <p className="temple-eyebrow"><span /> 继续供香</p>
            <h2 id="payment-title">确认敬上一炷清香</h2>
            <p>每炷将从点燃时起燃烧 30 分钟。此炷供香金额为 <strong>¥2.99</strong>。</p>
            <div className="temple-dialog-actions">
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={submitting} className="temple-secondary-button">暂不供香</button>
              <button type="button" onClick={() => void handlePaidConfirm()} disabled={submitting} className="temple-confirm-button">{submitting ? "正在点燃…" : "确认供香 ¥2.99"}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
