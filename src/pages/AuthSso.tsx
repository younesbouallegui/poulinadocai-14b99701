import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function AuthSso() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { signInFromSso } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = params.get("code");
    if (!token) {
      setError("Missing SSO code");
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("sso-accept", {
          body: { token },
        });
        if (error || !data?.session_token) {
          setError(data?.error ?? error?.message ?? "SSO exchange failed");
          return;
        }
        signInFromSso(data);
        navigate("/", { replace: true });
      } catch (e: any) {
        setError(e?.message ?? "SSO exchange failed");
      }
    })();
  }, [params, navigate, signInFromSso]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {error ? (
        <div className="max-w-md text-center space-y-4 px-6">
          <h1 className="text-xl font-semibold">Sign-in from Hub failed</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => (window.location.href = "https://poulinaaihub.younesblg.com/")}>
            Return to Hub
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Signing you in…</span>
        </div>
      )}
    </div>
  );
}
