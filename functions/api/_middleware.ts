import { authorizeApiRequest } from "../_shared";

export async function onRequest(context: any) {
  if (context.request.method.toUpperCase() === "OPTIONS") return context.next();
  const authError = await authorizeApiRequest(context.request, context.env);
  return authError || context.next();
}