export function baseHeaders(method: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const key = process.env.BLOG_API_KEY;
    if (key) headers["X-Custom-Auth-Key"] = key;
  }
  return headers;
}

export async function forward(res: Response) {
  const text = await res.text();
  const contentType = res.headers.get("content-type") || "application/json";
  return new Response(text, { status: res.status, headers: { "Content-Type": contentType } });
}
