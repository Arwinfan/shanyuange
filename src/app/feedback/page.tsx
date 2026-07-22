"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getFeedback, submitFeedback, type FeedbackCategory, type FeedbackItem } from "@/lib/api";

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string; hint: string }[] = [
  { value: "suggestion", label: "功能建议", hint: "希望增加或优化的内容" },
  { value: "issue", label: "问题报告", hint: "页面异常、无法操作或显示问题" },
  { value: "content", label: "内容纠错", hint: "发现文案、数据或结果有误" },
  { value: "service", label: "服务咨询", hint: "账号、记录或订单相关问题" },
  { value: "other", label: "其他", hint: "不属于以上分类的想法" },
];

const PAGE_OPTIONS = [
  ["", "未指定页面"],
  ["/", "首页"],
  ["/almanac", "今日通胜"],
  ["/qifu", "祈愿供灯"],
  ["/temple", "一炷清香"],
  ["/lottery", "灵签解读"],
  ["/bazi", "八字精批"],
  ["/divination", "六爻占卜"],
  ["/dream", "梦境参详"],
  ["/palmistry", "手相面相"],
  ["/naming", "宝宝起名"],
  ["/meditation", "静心禅坐"],
  ["/my", "我的记录"],
] as const;

const CATEGORY_LABELS: Record<FeedbackCategory, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((item) => [item.value, item.label]),
) as Record<FeedbackCategory, string>;

const STATUS_LABELS: Record<FeedbackItem["status"], string> = {
  received: "已收到",
  reviewing: "处理中",
  resolved: "已处理",
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export default function FeedbackPage() {
  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const [pagePath, setPagePath] = useState("");
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const currentHint = useMemo(
    () => CATEGORY_OPTIONS.find((item) => item.value === category)?.hint || "",
    [category],
  );

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const result = await getFeedback();
      if (result.success) setItems(result.data?.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback().catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    if (content.trim().length < 5) {
      setMessage("请至少填写 5 个字，让我们知道具体情况。");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitFeedback({ category, pagePath, content, contact });
      if (!result.success || !result.data) {
        setMessage(result.message || "提交失败，请稍后再试。");
        return;
      }

      setItems((current) => [result.data as FeedbackItem, ...current]);
      setContent("");
      setContact("");
      setPagePath("");
      setCategory("suggestion");
      setMessage("反馈已收到，感谢你的认真说明。");
    } catch {
      setMessage("提交失败，请稍后再试。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-xuan text-paper">
      <header className="sticky top-0 z-30 border-b border-gold/10 bg-xuan/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="font-display text-xl tracking-[0.14em] text-gold">善缘阁</Link>
          <Link href="/my" className="text-sm text-paper-dark/70 transition-colors hover:text-gold">我的记录</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <section className="max-w-2xl space-y-2">
          <p className="text-xs tracking-[0.18em] text-gold/60">与我们说说</p>
          <h1 className="font-display text-3xl text-gold">意见反馈</h1>
          <p className="text-sm leading-relaxed text-paper-dark/60">每一条反馈都会帮助善缘阁变得更清楚、更好用。请勿填写身份证号、银行卡号、账号凭证或其他敏感信息。</p>
        </section>

        <section className="rounded-xl border border-gold/20 bg-xuan-card/70 p-4 sm:p-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <fieldset className="space-y-3">
              <legend className="text-sm text-paper-dark/75">反馈类型</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {CATEGORY_OPTIONS.map((item) => {
                  const selected = item.value === category;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setCategory(item.value)}
                      className={`rounded-lg border px-3 py-3 text-left transition-colors ${selected ? "border-gold/65 bg-gold/10" : "border-gold/15 bg-xuan-surface/45 hover:border-gold/35"}`}
                    >
                      <span className="block text-sm text-gold/90">{item.label}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-paper-dark/45">{item.hint}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="block space-y-2">
              <span className="text-sm text-paper-dark/75">相关页面 <em className="not-italic text-paper-dark/40">可选</em></span>
              <select
                value={pagePath}
                onChange={(event) => setPagePath(event.target.value)}
                className="h-11 w-full rounded-md border border-gold/20 bg-xuan-surface px-3 text-sm text-paper-dark outline-none transition-colors focus:border-gold"
              >
                {PAGE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="flex items-center justify-between gap-3 text-sm text-paper-dark/75">
                <span>详细说明</span>
                <span className="text-xs text-paper-dark/40">{content.length}/1000</span>
              </span>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value.slice(0, 1000))}
                minLength={5}
                maxLength={1000}
                required
                placeholder={`${currentHint}。请尽量描述出现的情况、操作步骤或你的期待。`}
                className="min-h-40 w-full resize-y rounded-md border border-gold/20 bg-xuan-surface px-3 py-3 text-sm leading-relaxed text-paper-dark outline-none transition-colors placeholder:text-paper-dark/35 focus:border-gold"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-paper-dark/75">联系方式 <em className="not-italic text-paper-dark/40">可选</em></span>
              <input
                value={contact}
                onChange={(event) => setContact(event.target.value.slice(0, 120))}
                maxLength={120}
                placeholder="如需回复，可留下邮箱或其他不敏感联系方式"
                className="h-11 w-full rounded-md border border-gold/20 bg-xuan-surface px-3 text-sm text-paper-dark outline-none transition-colors placeholder:text-paper-dark/35 focus:border-gold"
              />
            </label>

            {message ? <p className="rounded-md border border-gold/15 bg-gold/5 px-3 py-2 text-sm text-paper-dark/70">{message}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 min-w-36 items-center justify-center rounded-md bg-vermillion px-5 text-sm text-white transition-colors hover:bg-vermillion-light disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "提交中..." : "提交反馈"}
            </button>
          </form>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl text-gold">我的反馈</h2>
              <p className="mt-1 text-xs text-paper-dark/45">仅显示当前随机账号提交的内容。</p>
            </div>
            <button type="button" onClick={() => loadFeedback()} className="text-sm text-paper-dark/60 transition-colors hover:text-gold">刷新</button>
          </div>

          {loading ? (
            <p className="text-sm text-paper-dark/50">加载中...</p>
          ) : items.length ? (
            <div className="grid gap-3">
              {items.map((item) => (
                <article key={item.feedbackId} className="rounded-xl border border-gold/15 bg-xuan-card/65 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-gold/90">{CATEGORY_LABELS[item.category]}</p>
                      <p className="mt-1 text-xs text-paper-dark/40">{formatTime(item.createdAt)}{item.pagePath ? ` · ${PAGE_OPTIONS.find(([value]) => value === item.pagePath)?.[1] || item.pagePath}` : ""}</p>
                    </div>
                    <span className="rounded-full border border-gold/20 bg-gold/5 px-2.5 py-1 text-xs text-paper-dark/65">{STATUS_LABELS[item.status]}</span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-paper-dark/70">{item.content}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-gold/15 bg-xuan-card/45 p-4 text-sm text-paper-dark/55">暂时还没有提交过反馈。</p>
          )}
        </section>
      </main>
    </div>
  );
}