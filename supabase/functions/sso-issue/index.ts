import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { zabbixRpc, zabbixUserIdToUuid } from "../_shared/zabbix.ts";

const HUB_SSO_URL = Deno.env.get("HUB_SSO_URL") ?? "https://poulinaaihub.younesblg.com/auth/sso";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { zabbix_token } = await req.json();
    if (!zabbix_token) {
      return new Response(JSON.stringify({ error: "Missing zabbix_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate the token and fetch user identity directly from Zabbix.
    let users: any[];
    try {
      users = await zabbixRpc("user.get", { output: ["userid", "username"] }, zabbix_token);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const me = users?.[0];
    if (!me?.userid) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a 32-byte random code, store only its hash. 60-second TTL, single use.
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const code_hash = await sha256Hex(code);
    const user_uuid = await zabbixUserIdToUuid(me.userid);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await sb.from("sso_handoff_codes").insert({
      code_hash,
      user_id: user_uuid,
      zabbix_userid: String(me.userid),
      zabbix_username: me.username,
      zabbix_token,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    if (error) throw error;

    const redirect_url = `${HUB_SSO_URL}?code=${code}`;
    return new Response(JSON.stringify({ code, redirect_url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
