import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { zabbixRpc, zabbixUserIdToUuid } from "../_shared/zabbix.ts";

async function resolveUserId(zabbix_token: string): Promise<string> {
  // Validate the Zabbix session and resolve the corresponding userid.
  const users = await zabbixRpc("user.get", { output: ["userid"] }, zabbix_token);
  const uid = users?.[0]?.userid;
  if (!uid) throw new Error("Invalid Zabbix session");
  return await zabbixUserIdToUuid(String(uid));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, zabbix_token, quiz_id } = body ?? {};
    if (!action || !zabbix_token || !quiz_id) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const platformUserId = await resolveUserId(String(zabbix_token));

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "submit") {
      const { data, error } = await sb.rpc("score_quiz_attempt_as", {
        p_user_id: platformUserId,
        p_quiz_id: quiz_id,
        p_answers: body.answers ?? [],
        p_auto: !!body.auto,
        p_violations_count: body.violations_count ?? 0,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "violation") {
      const { error } = await sb.rpc("record_assessment_violation_as", {
        p_user_id: platformUserId,
        p_quiz_id: quiz_id,
        p_violation_type: String(body.violation_type ?? "unknown"),
        p_details: body.details ?? {},
      });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("assessment-submit error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
