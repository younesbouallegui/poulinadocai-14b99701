import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowUp, BookOpen, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

interface Source {
  document_id: string;
  document_title: string;
  document_slug: string;
  document_category: string;
}

const categories = [
  { key: "monitoring", color: "from-blue-500/20 to-blue-500/5" },
  { key: "proxy", color: "from-cyan-500/20 to-cyan-500/5" },
  { key: "users", color: "from-violet-500/20 to-violet-500/5" },
  { key: "database", color: "from-emerald-500/20 to-emerald-500/5" },
  { key: "ai", color: "from-amber-500/20 to-amber-500/5" },
  { key: "troubleshooting", color: "from-rose-500/20 to-rose-500/5" },
];

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [busy, setBusy] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.display_name) setName(data.display_name);
    });
  }, [user]);

  const ask = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question.trim() || busy) return;
    setBusy(true);
    setAnswer("");
    setSources([]);
    try {
      const { data, error } = await supabase.functions.invoke("ask-ai", {
        body: { question: question.trim() },
      });
      if (error) throw error;
      setAnswer(data.answer ?? "");
      setSources(data.sources ?? []);
      setTimeout(() => answerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (err: any) {
      toast.error(err.message || t("ai.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hero-glow">
      <div className="mx-auto max-w-4xl px-6 pt-16 pb-24">
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary text-xs font-medium mb-6">
            <Sparkles className="h-3 w-3" />
            AI Knowledge Assistant
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight">
            {t("dashboard.greeting")}{name ? `, ${name.split(" ")[0]}` : ""}.
          </h1>
          <p className="mt-3 text-muted-foreground">{t("dashboard.askHint")}</p>
        </div>

        <form onSubmit={ask} className="mt-10 animate-fade-up">
          <div className="relative glass rounded-2xl p-2 transition-shadow focus-within:shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); }
              }}
              placeholder={t("dashboard.askPlaceholder")}
              rows={2}
              className="w-full resize-none bg-transparent px-4 py-3 text-base outline-none placeholder:text-muted-foreground"
            />
            <div className="flex justify-end px-2 pb-1">
              <Button type="submit" size="sm" disabled={busy || !question.trim()} className="gap-1.5">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                {t("dashboard.submit")}
              </Button>
            </div>
          </div>
        </form>

        {(busy || answer) && (
          <Card ref={answerRef as any} className="mt-8 p-6 animate-fade-up">
            {busy && !answer ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("ai.thinking")}
              </div>
            ) : (
              <>
                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-display">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
                </div>
                {sources.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-border/60">
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">{t("ai.sourcesLabel")}</div>
                    <div className="flex flex-wrap gap-2">
                      {sources.map((s) => (
                        <Link key={s.document_id} to={`/docs/${s.document_slug}`} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-accent text-accent-foreground hover:bg-primary-soft transition-colors">
                          <BookOpen className="h-3 w-3" />
                          {s.document_title}
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        )}

        <div className="mt-16">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("dashboard.recentDocs")}</h2>
            <Link to="/docs" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((c) => (
              <Link key={c.key} to={`/docs?category=${c.key}`}>
                <Card className={`p-4 h-full bg-gradient-to-br ${c.color} hover:shadow-[var(--shadow-elegant)] transition-all hover:-translate-y-0.5 border-border/60`}>
                  <BookOpen className="h-4 w-4 text-primary mb-2" />
                  <div className="text-sm font-medium">{t(`docs.categories.${c.key}`)}</div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
