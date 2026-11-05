export async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error ?? `Request failed (${response.status})`);
  return data;
}

export function sendJson(url, method, body) {
  return fetchJson(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
