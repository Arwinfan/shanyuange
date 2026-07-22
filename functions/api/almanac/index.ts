import { handleOptions, ok, fail } from "../../_shared";
import { buildAlmanac } from "../../_business";

export async function onRequestGet(context: any) {
  const url = new URL(context.request.url);
  const date = url.searchParams.get("date") || undefined;

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return fail("date 必须是 YYYY-MM-DD 格式");
  }

  return ok(buildAlmanac(date));
}

export async function onRequestOptions() { return handleOptions(); }
