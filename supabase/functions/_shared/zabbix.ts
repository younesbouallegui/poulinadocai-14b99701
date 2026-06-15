// Shared Zabbix JSON-RPC helpers.
export const ZABBIX_URL = Deno.env.get("ZABBIX_API_URL") ??
  "https://zabbix.younesblg.com/api_jsonrpc.php";

export async function zabbixRpc(
  method: string,
  params: unknown,
  auth?: string | null,
): Promise<any> {
  const body: Record<string, unknown> = {
    jsonrpc: "2.0",
    method,
    params,
    id: 1,
  };
  const headers: Record<string, string> = {
    "Content-Type": "application/json-rpc",
  };
  // Zabbix 6.4+: bearer auth header. Older Zabbix: "auth" field in body.
  if (auth) {
    headers.Authorization = `Bearer ${auth}`;
    // also include body auth for compatibility with older Zabbix
    body.auth = auth;
  }
  const res = await fetch(ZABBIX_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.error) {
    throw new Error(`Zabbix ${method} failed: ${json.error.data ?? json.error.message}`);
  }
  return json.result;
}

// Map Zabbix roleid → platform app_role.
// Zabbix built-in: 1=User, 2=Admin, 3=Super Admin. Custom roleids fall back to viewer.
export function mapZabbixRole(roleid: string | number | undefined): "admin" | "editor" | "viewer" {
  const id = String(roleid ?? "");
  if (id === "3") return "admin";
  if (id === "2") return "editor";
  return "viewer";
}

// Deterministic UUID v4-shaped derivation from a Zabbix userid so the same
// person always maps to the same UUID across sessions (matches frontend logic).
export async function zabbixUserIdToUuid(zabbixUserId: string): Promise<string> {
  const data = new TextEncoder().encode(`poulina-zabbix:${zabbixUserId}`);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const b = Array.from(new Uint8Array(hashBuf)).slice(0, 16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
