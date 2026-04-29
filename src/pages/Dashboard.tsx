import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowUp, BookOpen, Sparkles, Loader2, ExternalLink, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Source {
  document_id: string;
  document_title: string;
  document_slug: string;
  document_category: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  streaming?: boolean;
}

const suggestions = [
  "How do I monitor production database health?",
  "Explain the proxy failover strategy",
  "What are common troubleshooting steps?",
  "Walk me through user provisioning",
];

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.display_name) setName(data.display_name);
    });
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [question]);

  const streamInto = (id: string, fullText: string) => {
    return new Promise<void>((resolve) => {
      let i = 0;
      const chunk = Math.max(2, Math.floor(fullText.length / 120));
      const tick = () => {
        i = Math.min(fullText.length, i + chunk);
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: fullText.slice(0, i) } : m)));
        if (i < fullText.length) {
          setTimeout(tick, 18);
        } else {
          setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, streaming: false } : m)));
          resolve();
        }
      };
      tick();
    });
  };

  const ask = async (text?: string) => {
    const q = (text ?? question).trim();
    if (!q || busy) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: q };
    const assistantId = crypto.randomUUID();
    const placeholder: ChatMessage = { id: assistantId, role: "assistant", content: "", streaming: true };
    setMessages((prev) => [...prev, userMsg, placeholder]);
    setQuestion("");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ask-ai", { body: { question: q } });
      if (error) throw error;
      const answer: string = data?.answer ?? "";
      const sources: Source[] = data?.sources ?? [];
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, sources } : m)));
      await streamInto(assistantId, answer);
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: t("ai.error"), streaming: false } : m)),
      );
      toast.error(err.message || t("ai.error"));
    } finally {
      setBusy(false);
    }
  };

  const newChat = () => setMessages([]);
  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* top bar */}
      {!isEmpty && (
        <div className="flex items-center justify-between px-4 sm:px-6 py-2 border-b border-border/60">
          <div className="text-sm font-medium text-muted-foreground">AI Assistant</div>
          <Button size="sm" variant="ghost" onClick={newChat} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> New chat
          </Button>
        </div>
      )}

      {/* messages / hero */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="hero-glow min-h-full flex items-center justify-center px-6 py-16">
            <div className="w-full max-w-2xl text-center animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary text-xs font-medium mb-6">
                <Sparkles className="h-3 w-3" />
                AI Knowledge Assistant
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight">
                {t("dashboard.greeting")}{name ? `, ${name.split(" ")[0]}` : ""}.
              </h1>
              <p className="mt-3 text-muted-foreground">{t("dashboard.askHint")}</p>

              <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="group px-4 py-3 rounded-xl border border-border/60 bg-card/40 hover:bg-accent transition-colors text-sm"
                  >
                    <span className="text-foreground/90 group-hover:text-foreground">{s}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-8">
            {messages.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}
          </div>
        )}
      </div>

      {/* composer */}
      <div className="border-t border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask();
            }}
            className="relative flex items-end gap-2 rounded-2xl border border-border bg-card shadow-[var(--shadow-elegant)] focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 transition-all"
          >
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask();
                }
              }}
              placeholder={t("dashboard.askPlaceholder")}
              rows={1}
              className="flex-1 resize-none bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-muted-foreground max-h-[200px]"
            />
            <div className="p-2">
              <Button
                type="submit"
                size="icon"
                disabled={busy || !question.trim()}
                className="h-9 w-9 rounded-xl"
                aria-label={t("dashboard.submit")}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </Button>
            </div>
          </form>
          <p className="mt-2 text-[11px] text-center text-muted-foreground">
            AI can make mistakes. Verify important information against the documentation.
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const { t } = useTranslation();
  const isUser = msg.role === "user";

  return (
    <div className={cn("flex gap-3 animate-fade-up", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
      )}
      <div className={cn("flex flex-col gap-2 min-w-0", isUser ? "items-end max-w-[85%]" : "flex-1")}>
        {isUser ? (
          <div className="rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm whitespace-pre-wrap break-words">
            {msg.content}
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-pre:bg-muted prose-pre:text-foreground">
            {msg.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            ) : (
              <TypingDots />
            )}
            {msg.streaming && msg.content && <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary/70 animate-pulse align-middle" />}
          </div>
        )}
        {!isUser && msg.sources && msg.sources.length > 0 && !msg.streaming && (
          <div className="pt-2">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
              {t("ai.sourcesLabel")}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {msg.sources.map((s) => (
                <Link
                  key={s.document_id}
                  to={`/docs/${s.document_slug}`}
                  className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-accent text-accent-foreground hover:bg-primary-soft transition-colors"
                >
                  <BookOpen className="h-3 w-3" />
                  {s.document_title}
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" />
    </div>
  );
}
