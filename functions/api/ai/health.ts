import { handleOptions, ok } from "../../_shared";
import { getAiRuntimeStatus } from "../../_llm";

export async function onRequestGet(context: any) {
  return ok({
    time: new Date().toISOString(),
    ai: getAiRuntimeStatus(context.env || {}),
  });
}

export async function onRequestOptions() {
  return handleOptions();
}
