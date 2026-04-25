import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user, roles } = useAuth();
  const [name, setName] = useState("");
  const [lang, setLang] = useState(i18n.language.slice(0, 2));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, preferred_language").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setName(data.display_name ?? "");
        setLang(data.preferred_language ?? "en");
      }
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ display_name: name, preferred_language: lang }).eq("id", user.id);
    if (error) toast.error(error.message);
    else {
      i18n.changeLanguage(lang);
      toast.success("Saved");
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-3xl font-display font-semibold tracking-tight mb-8">{t("nav.settings")}</h1>
      <Card className="p-6 space-y-5">
        <div className="space-y-2">
          <Label>{t("common.email")}</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dn">{t("common.displayName")}</Label>
          <Input id="dn" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("common.language")}</Label>
          <Select value={lang} onValueChange={setLang}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t("common.english")}</SelectItem>
              <SelectItem value="fr">{t("common.french")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Roles</Label>
          <div className="flex gap-1.5">
            {roles.length === 0 ? <span className="text-sm text-muted-foreground">—</span> :
              roles.map((r) => <Badge key={r} variant="secondary" className="capitalize">{r}</Badge>)}
          </div>
        </div>
        <Button onClick={save} disabled={busy}>{t("common.save")}</Button>
      </Card>
    </div>
  );
}
