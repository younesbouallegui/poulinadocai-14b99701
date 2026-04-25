import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import logo from "@/assets/poulina-logo.png";

export default function Auth() {
  const { t, i18n } = useTranslation();
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "signin") {
      const { error } = await signIn(email, password);
      if (error) toast.error(t("auth.invalid"));
      else navigate("/", { replace: true });
    } else {
      const { error } = await signUp(email, password, name || email.split("@")[0], i18n.language);
      if (error) toast.error(error);
      else {
        toast.success(t("auth.signupSuccess"));
        navigate("/", { replace: true });
      }
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background hero-glow">
      <header className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Poulina" className="h-8 w-8 rounded" />
          <span className="font-display font-semibold tracking-tight">{t("common.appName")}</span>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <Card className="w-full max-w-md p-8 glass animate-fade-up">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "signin" ? t("auth.welcomeTitle") : t("auth.createTitle")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "signin" ? t("auth.welcomeSubtitle") : t("auth.createSubtitle")}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">{t("common.displayName")}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t("common.email")}</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("common.password")}</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "signin" ? t("common.signIn") : t("common.signUp")}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                {t("auth.noAccount")}{" "}
                <button onClick={() => setMode("signup")} className="text-primary hover:underline font-medium">
                  {t("common.signUp")}
                </button>
              </>
            ) : (
              <>
                {t("auth.haveAccount")}{" "}
                <button onClick={() => setMode("signin")} className="text-primary hover:underline font-medium">
                  {t("common.signIn")}
                </button>
              </>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
