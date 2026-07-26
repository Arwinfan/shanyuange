"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

type ContentNoticeKind = "analysis" | "ritual";

type ContentNoticeModalProps = {
  open: boolean;
  feature: string;
  kind?: ContentNoticeKind;
  onClose: () => void;
  onConfirm: () => void;
};

export function ContentNoticeModal({
  open,
  feature,
  kind = "analysis",
  onClose,
  onConfirm,
}: ContentNoticeModalProps) {
  const [accepted, setAccepted] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const isAnalysis = kind === "analysis";

  useEffect(() => {
    if (!open) setAccepted(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="w-full max-w-lg animate-fadeIn rounded-xl border border-gold/30 bg-xuan-card p-5 shadow-2xl shadow-black/50 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.18em] text-gold/70">内容说明</p>
            <h2 id={titleId} className="mt-1 font-display text-2xl text-gold">开始{feature}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gold/25 text-lg text-paper-dark/60 transition-colors hover:border-gold/60 hover:text-gold"
            aria-label="关闭内容说明"
          >
            ×
          </button>
        </div>

        <div id={descriptionId} className="mt-5 space-y-3 text-sm leading-6 text-paper-dark/75">
          {isAnalysis ? (
            <>
              <p>本内容用于传统文化阅读与自我整理参考，不构成医疗、法律、金融、心理诊断或人生决策建议。请勿据此作出重大决定。</p>
              <p>部分文字会由人工智能模型结合传统文化素材辅助生成，可能存在不完整、不准确或不适合您个人情况之处，请结合现实情况自行判断。</p>
            </>
          ) : (
            <p>本功能用于个人心愿记录与静心仪式表达，不提供宗教服务、祈福效果、消灾改运或结果承诺。</p>
          )}
          <p className="text-xs text-paper-dark/45">
            继续前请阅读 <Link href="/terms" className="text-gold underline underline-offset-2">《用户协议》</Link>、<Link href="/privacy" className="text-gold underline underline-offset-2">《隐私说明》</Link>{isAnalysis ? <> 与 <Link href="/ai" className="text-gold underline underline-offset-2">《AI 生成说明》</Link></> : null}。
          </p>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-gold/15 bg-xuan-surface/60 p-3 text-sm leading-5 text-paper-dark/75">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[#b7443e]"
          />
          <span>我已阅读并理解上述内容说明，同意继续。</span>
        </label>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gold/25 px-4 py-2 text-sm text-paper-dark/70 transition-colors hover:bg-gold/10 hover:text-gold"
          >
            暂不继续
          </button>
          <button
            type="button"
            disabled={!accepted}
            onClick={onConfirm}
            className="rounded-md bg-vermillion px-4 py-2 text-sm text-white shadow-lg shadow-vermillion/20 transition-colors hover:bg-vermillion-light disabled:cursor-not-allowed disabled:opacity-45"
          >
            确认并继续
          </button>
        </div>
      </section>
    </div>
  );
}