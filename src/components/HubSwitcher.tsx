import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function HubSwitcher() {
  const { zabbixToken } = useAuth();
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (!zabbixToken) {
      toast.error("Please sign in first.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("sso-issue", {
        body: { zabbix_token: zabbixToken },
      });
      if (error || !data?.redirect_url) {
        toast.error("Could not start handoff to Poulina AI Hub.");
        setBusy(false);
        return;
      }
      // Smooth transition: fade out then redirect
      document.body.style.transition = "opacity 200ms ease";
      document.body.style.opacity = "0";
      setTimeout(() => {
        window.location.href = data.redirect_url;
      }, 180);
    } catch {
      toast.error("Could not start handoff to Poulina AI Hub.");
      setBusy(false);
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={go}
            disabled={busy}
            className="gap-2 font-medium"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Poulina AI Hub</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Switch to AI Hub — stay logged in</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
