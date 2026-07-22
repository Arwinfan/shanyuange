import { fail, handleOptions, readBody } from "../../_shared";

export async function onRequestPost(context: any) {
  await readBody(context.request);

  const provider = context.env?.PAYMENT_PROVIDER || "";
  if (!provider || provider === "local") {
    return fail("支付渠道暂未配置，请稍后再试", 503);
  }

  return fail("支付结果确认暂未开放，请稍后再试", 503);
}

export async function onRequestOptions() { return handleOptions(); }
