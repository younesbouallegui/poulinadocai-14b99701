import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Lock, BadgeCheck, Building2 } from "lucide-react";
import logo from "@/assets/poulina-logo.png";

export default function Auth() {
  const { t } = useTranslation();
  const { user, isLocalAdmin, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user || isLocalAdmin) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const isAdminShortcut = identifier.trim().toLowerCase() === "admin";
    const { error } = await signIn(identifier, password);
    if (error) toast.error(t("auth.invalid"));
    else navigate(isAdminShortcut ? "/admin" : "/", { replace: true });
    setBusy(false);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-background">
      {/* Left: branding panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[hsl(220_45%_11%)] text-white p-12">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
             style={{ background: "radial-gradient(900px 500px at 10% 0%, hsl(217 91% 60% / 0.4), transparent 60%), radial-gradient(700px 500px at 90% 100%, hsl(258 90% 66% / 0.35), transparent 60%)" }} />
        <div className="relative flex items-center gap-3">
          <img src={logo} alt="Poulina" className="h-10 w-10 rounded-md bg-white/5 p-1 ring-1 ring-white/10" />
          <div>
            <div className="text-sm font-semibold tracking-tight">{t("common.appName")}</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/50">Certification Platform</div>
          </div>
        </div>

        <div className="relative max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] uppercase tracking-wider text-white/70 ring-1 ring-white/10">
            <ShieldCheck className="h-3.5 w-3.5" /> Secure exam environment
          </div>
          <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight">
            Validate expertise.<br/>Certify with confidence.
          </h1>
          <p className="text-sm leading-relaxed text-white/70">
            Enterprise knowledge management and proctored skill assessments for production teams. Sign in with your corporate credentials to access your dashboard.
          </p>
          <ul className="space-y-2.5 text-sm text-white/80">
            <li className="flex items-center gap-2.5"><BadgeCheck className="h-4 w-4 text-emerald-400" /> Proctored, full-screen assessments</li>
            <li className="flex items-center gap-2.5"><Lock className="h-4 w-4 text-blue-300" /> Anti-cheat & integrity monitoring</li>
            <li className="flex items-center gap-2.5"><Building2 className="h-4 w-4 text-violet-300" /> Role-based admin oversight</li>
          </ul>
        </div>

        <div className="relative text-[11px] text-white/40">© {new Date().getFullYear()} Poulina Group · Internal use only</div>
      </aside>

      {/* Right: form panel */}
      <main className="flex flex-col">
        <header className="flex items-center justify-between p-6">
          <div className="flex items-center gap-2 lg:hidden">
            <img src={logo} alt="Poulina" className="h-7 w-7 rounded" />
            <span className="font-display text-sm font-semibold tracking-tight">{t("common.appName")}</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-2">Sign in</div>
              <h2 className="font-display text-3xl font-semibold tracking-tight">{t("auth.welcomeTitle")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("auth.welcomeSubtitle")}</p>
            </div>

            <form onSubmit={submit} className="space-y-5" autoComplete="on">
              <div className="space-y-1.5">
                <Label htmlFor="identifier" className="text-xs font-medium">{t("auth.usernameOrEmail")}</Label>
                <Input
                  id="identifier"
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="h-11"
                  placeholder="name@poulina.com"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium">{t("common.password")}</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.signIn")}
              </Button>
            </form>

            <div className="mt-8 rounded-lg border border-border bg-muted/30 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
              <ShieldCheck className="inline h-3.5 w-3.5 mr-1 -mt-0.5 text-primary" />
              {t("auth.contactAdmin")}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
