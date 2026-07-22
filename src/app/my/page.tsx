"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import QRCode from "qrcode";
import {
  bindPhone,
  getAccountCredentialUrl,
  getAccountName,
  getRecords,
  getUserMe,
  importAccountCredential,
  recoverRecord,
} from "@/lib/api";

type RecordItem = {
  recordId: string;
  title: string;
  summary: string;
  type: string;
  paid: boolean;
  status: string;
  createdAt: string;
  fullResult?: any;
  protected?: boolean;
  message?: string;
};

export default function MyPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [stats, setStats] = useState<{ records: number; paidRecords: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoverId, setRecoverId] = useState("");
  const [recovered, setRecovered] = useState<RecordItem | null>(null);
  const [message, setMessage] = useState("");
  const [accountName, setAccountName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneMasked, setPhoneMasked] = useState("");
  const [bindingPhone, setBindingPhone] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");
  const [credentialUrl, setCredentialUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [credentialInput, setCredentialInput] = useState("");
  const [importingCredential, setImportingCredential] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleGenerateCredential = async () => {
    setAccountMessage("");
    setQrLoading(true);
    try {
      const url = await getAccountCredentialUrl();
      const dataUrl = await QRCode.toDataURL(url, {
        width: 220,
        margin: 1,
        color: {
          dark: "#172019",
          light: "#f1ead9",
        },
      });
      setCredentialUrl(url);
      setQrDataUrl(dataUrl);
      setAccountMessage("账号凭证已生成，请下载二维码或复制链接后妥善保存。");
    } catch {
      setAccountMessage("账号凭证生成失败，请稍后重试");
    } finally {
      setQrLoading(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [recordRes, meRes] = await Promise.all([getRecords(1, 30), getUserMe()]);
      if (recordRes.success) setRecords(recordRes.data?.items || []);
      if (meRes.success) {
        setStats(meRes.data?.stats || null);
        setAccountName(getAccountName());
        setPhoneMasked(meRes.data?.account?.phoneMasked || "");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("credential")) {
        const result = importAccountCredential(window.location.href);
        setAccountMessage(result.success ? "账号凭证已导入，本设备已切换到该账号。" : result.message || "账号凭证无法识别");
        window.history.replaceState(null, "", "/my");
      }
    } catch {
      // 浏览器地址异常时不影响正常加载。
    }
    load().catch(() => setLoading(false));
  }, []);

  const applyAccountCredential = async (input: string) => {
    setImportingCredential(true);
    setAccountMessage("");
    try {
      const result = importAccountCredential(input);
      if (!result.success) {
        setAccountMessage(result.message || "账号凭证无法识别");
        return;
      }

      setCredentialInput("");
      setCredentialUrl("");
      setQrDataUrl("");
      setAccountName(getAccountName());
      setAccountMessage("账号凭证已导入，本设备已切换到该账号。");
      await load();
    } finally {
      setImportingCredential(false);
    }
  };

  const decodeQrFile = (file: File) => new Promise<string>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("canvas_unavailable");

        context.drawImage(image, 0, 0);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const qr = jsQR(imageData.data, imageData.width, imageData.height);
        if (!qr?.data) throw new Error("qr_not_found");

        resolve(qr.data);
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image_load_failed"));
    };

    image.src = objectUrl;
  });

  const handleRecover = async () => {
    setMessage("");
    setRecovered(null);
    try {
      const res = await recoverRecord(recoverId.trim());
      if (res.success && res.data) {
        setRecovered(res.data);
        return;
      }
      setMessage(res.message || "未找到记录");
    } catch {
      setMessage("服务暂时不可用，请稍后重试");
    }
  };

  const handleImportCredentialText = async () => {
    const value = credentialInput.trim();
    if (!value) {
      setAccountMessage("请粘贴账号凭证链接或凭证内容");
      return;
    }
    await applyAccountCredential(value);
  };

  const handleImportCredentialImage = async (file?: File) => {
    if (!file) return;
    setAccountMessage("");
    setImportingCredential(true);
    try {
      const value = await decodeQrFile(file);
      await applyAccountCredential(value);
    } catch {
      setAccountMessage("未能识别二维码，请确认上传的是账号凭证二维码。");
    } finally {
      setImportingCredential(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleBindPhone = async () => {
    const normalized = phone.replace(/\D/g, "");
    setAccountMessage("");
    if (!/^1[3-9]\d{9}$/.test(normalized)) {
      setAccountMessage("请输入正确的手机号");
      return;
    }

    setBindingPhone(true);
    try {
      const res = await bindPhone(normalized);
      if (res.success && res.data?.phoneMasked) {
        setPhoneMasked(res.data.phoneMasked);
        setPhone("");
        setAccountMessage("手机号已绑定，可作为账号备注信息使用。");
        return;
      }
      setAccountMessage(res.message || "手机号绑定失败，请稍后重试");
    } catch {
      setAccountMessage("服务暂时不可用，请稍后重试");
    } finally {
      setBindingPhone(false);
    }
  };

  const handleCopyCredential = async () => {
    if (!credentialUrl) return;
    try {
      await navigator.clipboard.writeText(credentialUrl);
      setAccountMessage("账号凭证链接已复制，请妥善保存。");
    } catch {
      setAccountMessage("复制失败，请下载二维码保存。");
    }
  };

  const handleDownloadCredential = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `${accountName || "善缘阁"}-账号凭证.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setAccountMessage("账号凭证二维码已生成，请保存到安全位置。");
  };

  return (
    <div className="min-h-screen bg-xuan text-paper">
      <header className="sticky top-0 z-30 border-b border-gold/10 bg-xuan/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="font-display text-xl tracking-[0.14em] text-gold">善缘阁</Link>
          <Link href="/" className="text-sm text-paper-dark/70 hover:text-gold">返回首页</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        <section className="space-y-2">
          <h1 className="font-display text-3xl text-gold">我的记录</h1>
          <p className="text-sm text-paper-dark/60">当前随机账号下的服务记录会保存在这里。</p>
          {stats && (
            <p className="text-sm text-paper-dark/45">共 {stats.records} 条记录，已解锁 {stats.paidRecords} 条。</p>
          )}
        </section>

        <section className="rounded-xl border border-gold/20 bg-xuan-card/70 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm text-paper-dark/70">随机账号</p>
              <p className="mt-1 text-xs text-paper-dark/45">账号由系统自动生成，可绑定手机号备注，也可保存二维码凭证。</p>
            </div>
            <span className="rounded-full border border-emerald-500/25 bg-emerald-900/10 px-3 py-1 text-xs text-emerald-300">
              已启用
            </span>
          </div>

          <div className="rounded-lg border border-gold/15 bg-xuan-surface/55 p-4">
            <p className="text-xs text-paper-dark/45">当前账号</p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <p className="font-display text-3xl tracking-[0.12em] text-gold">{accountName || "生成中"}</p>
              <p className="pb-1 text-xs text-paper-dark/45">本设备自动保存</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
            <div className="rounded-lg border border-gold/15 bg-xuan-surface/45 p-4 space-y-3">
              <div>
                <p className="text-sm text-paper-dark/70">绑定手机号</p>
                <p className="mt-1 text-xs text-paper-dark/45">无需短信验证，仅用于账号备注和人工核对。</p>
              </div>
              {phoneMasked && (
                <p className="inline-flex rounded-full border border-gold/20 bg-gold/5 px-3 py-1 text-xs text-gold">
                  已绑定 {phoneMasked}
                </p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 11))}
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="输入手机号"
                  className="h-11 flex-1 rounded-md border border-gold/20 bg-xuan-surface px-3 text-sm text-paper-dark placeholder:text-paper-dark/35 focus:border-gold focus:outline-none"
                />
                <button
                  onClick={handleBindPhone}
                  disabled={bindingPhone}
                  className="rounded-md bg-vermillion px-5 py-2 text-sm text-white hover:bg-vermillion-light disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bindingPhone ? "保存中" : phoneMasked ? "更新绑定" : "绑定手机号"}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-gold/15 bg-xuan-surface/45 p-4 text-center">
              <p className="text-sm text-paper-dark/70">账号凭证二维码</p>
              <p className="mt-1 text-xs text-paper-dark/45">点击生成后才会显示，请保存到安全位置。</p>
              <div className="mx-auto mt-3 flex size-44 items-center justify-center rounded-lg border border-gold/15 bg-[#f1ead9] p-2">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="账号凭证二维码" className="size-full rounded-md" />
                ) : (
                  <span className="text-xs text-xuan">{qrLoading ? "生成中" : "未生成"}</span>
                )}
              </div>
              <button
                onClick={handleGenerateCredential}
                disabled={qrLoading}
                className="mt-3 w-full rounded-md bg-vermillion px-3 py-2 text-xs text-white hover:bg-vermillion-light disabled:cursor-not-allowed disabled:opacity-60"
              >
                {qrLoading ? "生成中" : qrDataUrl ? "重新生成凭证" : "生成账号凭证"}
              </button>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadCredential}
                  disabled={!qrDataUrl}
                  className="rounded-md border border-gold/20 px-3 py-2 text-xs text-gold hover:bg-gold/10 disabled:opacity-50"
                >
                  下载
                </button>
                <button
                  onClick={handleCopyCredential}
                  disabled={!credentialUrl}
                  className="rounded-md border border-gold/20 px-3 py-2 text-xs text-gold hover:bg-gold/10 disabled:opacity-50"
                >
                  复制链接
                </button>
              </div>
            </div>
          </div>

          {accountMessage && <p className="rounded-md border border-gold/15 bg-gold/5 px-3 py-2 text-xs text-paper-dark/65">{accountMessage}</p>}
          <p className="text-xs leading-relaxed text-paper-dark/45">
            账号凭证可恢复当前随机账号与历史记录，请勿转发给他人。
          </p>
        </section>

        <section className="rounded-xl border border-gold/20 bg-xuan-card/70 p-4 space-y-3">
          <div>
            <p className="text-sm text-paper-dark/70">通过二维码找回账号</p>
            <p className="mt-1 text-xs text-paper-dark/45">上传之前保存的账号凭证二维码，或粘贴凭证链接，即可切换回原账号。</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={credentialInput}
              onChange={(event) => setCredentialInput(event.target.value)}
              placeholder="粘贴账号凭证链接或 sycred_ 开头的凭证"
              className="h-11 flex-1 rounded-md border border-gold/20 bg-xuan-surface px-3 text-sm text-paper-dark placeholder:text-paper-dark/35 focus:border-gold focus:outline-none"
            />
            <button
              onClick={handleImportCredentialText}
              disabled={importingCredential}
              className="rounded-md bg-vermillion px-5 py-2 text-sm text-white hover:bg-vermillion-light disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importingCredential ? "导入中" : "导入凭证"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleImportCredentialImage(event.target.files?.[0])}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importingCredential}
              className="rounded-md border border-gold/20 px-4 py-2 text-sm text-gold hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              选择二维码图片
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-gold/20 bg-xuan-card/70 p-4 space-y-3">
          <p className="text-sm text-paper-dark/70">找回记录</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={recoverId}
              onChange={(event) => setRecoverId(event.target.value)}
              placeholder="输入 rec_ 开头的记录号"
              className="h-11 flex-1 rounded-md border border-gold/20 bg-xuan-surface px-3 text-sm text-paper-dark placeholder:text-paper-dark/35 focus:border-gold focus:outline-none"
            />
            <button onClick={handleRecover} className="rounded-md bg-vermillion px-5 py-2 text-sm text-white hover:bg-vermillion-light">
              找回
            </button>
          </div>
          {message && <p className="text-sm text-vermillion-light">{message}</p>}
          {recovered && <RecordCard item={recovered} expanded />}
        </section>

        <section className="rounded-xl border border-gold/20 bg-xuan-card/70 p-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-sm text-paper-dark/75">意见反馈</p>
            <p className="mt-1 text-xs leading-relaxed text-paper-dark/45">遇到问题、发现内容错误或有新的想法，都可以提交给我们。</p>
          </div>
          <Link href="/feedback" className="mt-3 inline-flex h-10 items-center justify-center rounded-md border border-gold/30 px-4 text-sm text-gold transition-colors hover:bg-gold/10 sm:mt-0">
            提交反馈
          </Link>
        </section>
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-gold">最近记录</h2>
            <button onClick={load} className="text-sm text-paper-dark/60 hover:text-gold">刷新</button>
          </div>
          {loading ? (
            <p className="text-sm text-paper-dark/50">加载中...</p>
          ) : records.length ? (
            <div className="grid gap-3">
              {records.map((item) => <RecordCard key={item.recordId} item={item} />)}
            </div>
          ) : (
            <p className="rounded-lg border border-gold/15 bg-xuan-card/45 p-4 text-sm text-paper-dark/55">还没有记录，先去求一签、点一盏灯或做一次八字精批。</p>
          )}
        </section>
      </main>
    </div>
  );
}

function formatRecordTime(value?: string) {
  if (!value) return "时间未知";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";

  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value || "";

  return `${pick("year")}-${pick("month")}-${pick("day")} ${pick("hour")}:${pick("minute")}`;
}

function RecordCard({ item, expanded = false }: { item: RecordItem; expanded?: boolean }) {
  return (
    <article className="rounded-xl border border-gold/15 bg-xuan-card/65 p-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <h3 className="font-display text-lg text-gold/90">{item.title}</h3>
          <time className="block text-xs text-paper-dark/40" dateTime={item.createdAt}>
            创建时间：{formatRecordTime(item.createdAt)}
          </time>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-xs ${item.paid ? "border-emerald-500/30 text-emerald-300" : "border-gold/25 text-paper-dark/55"}`}>
          {item.paid ? "已解锁" : "待支付"}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-paper-dark/65">{item.summary}</p>
      {item.protected && item.message && (
        <p className="rounded-lg border border-gold/15 bg-gold/5 p-3 text-sm text-paper-dark/60">
          {item.message}
        </p>
      )}
      {expanded && item.fullResult && (
        <pre className="max-h-80 overflow-auto rounded-lg border border-gold/10 bg-xuan/70 p-3 text-xs leading-relaxed text-paper-dark/70">
          {JSON.stringify(item.fullResult, null, 2)}
        </pre>
      )}
    </article>
  );
}
