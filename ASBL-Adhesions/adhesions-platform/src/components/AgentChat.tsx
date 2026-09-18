"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { cn } from "@/lib/utils";

export interface AgentChatProps {
  agentSlug: string;
  agentName: string;
  agentRole: string;
  model: string;
  suggestions?: string[];
}

const SUGGESTIONS_DEFAULT = [
  "Qui approche de son échéance de cotisation ?",
  "Rédige la relance J-15 pour Marc Lefèvre",
  "Prépare l'attestation d'Amine Belkacem",
];

export function AgentChat({ agentSlug, agentName, agentRole, model, suggestions = SUGGESTIONS_DEFAULT }: AgentChatProps) {
  const storageKey = `adhesions-chat:${agentSlug}`;

  const { messages, sendMessage, status, stop, setMessages, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { agentSlug },
    }),
  });

  const [input, setInput] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {
      // noop
    } finally {
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (messages.length === 0) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // noop
    }
  }, [messages, hydrated, storageKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, status]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || status !== "ready") return;
    sendMessage({ text: t });
    setInput("");
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(input);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(input);
    }
  };

  const resetConversation = () => {
    setMessages([]);
    localStorage.removeItem(storageKey);
  };

  const isStreaming = status === "streaming" || status === "submitted";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-bg)] shadow-sm">
      <header className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-3 bg-[var(--color-bg-soft)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-white font-black text-sm">
            {agentName.slice(0, 1)}
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
              {agentName}
              <span
                className={cn(
                  "inline-block h-2 w-2 rounded-full",
                  isStreaming ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                )}
                aria-hidden
              />
            </div>
            <div className="text-xs text-[var(--color-ink-soft)]">{agentRole}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-[var(--color-line)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink-soft)]">
            {model}
          </span>
          <button
            type="button"
            onClick={resetConversation}
            disabled={messages.length === 0 || isStreaming}
            className="text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] disabled:opacity-40"
          >
            Réinitialiser
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-w-0">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center py-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-white text-lg font-black">
              {agentName.slice(0, 1)}
            </div>
            <div>
              <h3 className="text-lg font-semibold">Démarrer une conversation</h3>
              <p className="mt-2 text-sm max-w-md mx-auto text-[var(--color-ink-soft)]">
                {agentName} connaît le pipeline CotisAuto™ (détection, relance, suivi paiement, attestation). Posez une question ou choisissez un point de départ.
              </p>
            </div>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="rounded-full border border-[var(--color-line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-accent)] hover:text-white hover:border-[var(--color-accent)] transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} role={msg.role} parts={msg.parts as Part[]} agentInitial={agentName.slice(0, 1)} />
        ))}

        {isStreaming && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-ink-soft)]">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            {agentName} rédige…
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            Une erreur est survenue : {error.message}. Réessayez.
          </div>
        )}
      </div>

      <form onSubmit={onFormSubmit} className="border-t border-[var(--color-line)] bg-[var(--color-bg-soft)] p-3">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            rows={2}
            disabled={status !== "ready"}
            placeholder={`Demandez à ${agentName}…  (Entrée pour envoyer, Maj+Entrée pour retour à la ligne)`}
            className="w-full resize-none rounded-xl border border-[var(--color-line)] bg-white px-3 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-dim)] outline-none focus:border-[var(--color-accent)] transition disabled:opacity-60"
          />
          <div className="flex items-center justify-end gap-2 pt-2.5">
            {isStreaming && (
              <button
                type="button"
                onClick={() => stop()}
                className="rounded-lg border border-[var(--color-line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)]"
              >
                Arrêter
              </button>
            )}
            <button
              type="submit"
              disabled={status !== "ready" || !input.trim()}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-1.5 text-xs font-bold text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
            >
              Envoyer
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

type Part = { type: string; text?: string };

function MessageBubble({ role, parts, agentInitial }: { role: string; parts: Part[]; agentInitial: string }) {
  const isUser = role === "user";
  const text = parts.map((p) => (p.type === "text" && typeof p.text === "string" ? p.text : "")).join("");
  if (!text.trim() && role !== "user") return null;

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black",
          isUser ? "bg-[var(--color-ink)] text-white" : "bg-[var(--color-accent)] text-white"
        )}
      >
        {isUser ? "Vous" : agentInitial}
      </div>
      <div
        className={cn(
          "max-w-[82%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed border",
          isUser
            ? "bg-[var(--color-ink)] text-white border-transparent"
            : "bg-white text-[var(--color-ink)] border-[var(--color-line)]"
        )}
      >
        {isUser ? <span className="whitespace-pre-wrap">{text}</span> : <MarkdownPreview text={text} />}
      </div>
    </div>
  );
}

function MarkdownPreview({ text }: { text: string }) {
  const blocks = useMemo(() => renderMarkdownBlocks(text), [text]);
  return <div className="text-[14px] leading-relaxed break-words min-w-0 max-w-full">{blocks}</div>;
}

function renderMarkdownBlocks(raw: string): React.ReactNode {
  const lines = raw.split("\n");
  const out: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    out.push(
      <ul key={`ul-${out.length}`} className="my-2 ml-5 list-disc space-y-1 text-[14px]">
        {listBuffer.map((item, i) => (
          <li key={i}>{renderInlineMd(item)}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bullet = line.match(/^\s*[-*•]\s+(.+)$/);
    if (bullet) {
      listBuffer.push(bullet[1]);
      continue;
    }
    // Table rows (very simple passthrough as monospace)
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flushList();
      out.push(
        <div key={i} className="my-0.5 overflow-x-auto text-[12.5px] font-mono whitespace-pre text-[var(--color-ink-soft)]">
          {line}
        </div>
      );
      continue;
    }
    flushList();
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) {
      out.push(
        <h1 key={i} className="mt-4 mb-2 text-[20px] font-bold">
          {renderInlineMd(h1[1])}
        </h1>
      );
      continue;
    }
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      out.push(
        <h2 key={i} className="mt-3 mb-1.5 text-[16px] font-bold">
          {renderInlineMd(h2[1])}
        </h2>
      );
      continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      out.push(
        <h3 key={i} className="mt-2 mb-1 text-[14.5px] font-semibold">
          {renderInlineMd(h3[1])}
        </h3>
      );
      continue;
    }
    if (/^-{3,}$/.test(line.trim())) {
      out.push(<hr key={i} className="my-3 border-[var(--color-line)]" />);
      continue;
    }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      out.push(
        <blockquote key={i} className="my-2 border-l-4 border-[var(--color-accent)] pl-3 italic text-[var(--color-ink-soft)]">
          {renderInlineMd(quote[1])}
        </blockquote>
      );
      continue;
    }
    if (line.trim()) {
      out.push(
        <p key={i} className="my-1.5">
          {renderInlineMd(line)}
        </p>
      );
    } else {
      out.push(<div key={i} className="h-1.5" />);
    }
  }
  flushList();
  return <>{out}</>;
}

function renderInlineMd(s: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = regex.exec(s)) !== null) {
    if (match.index > last) nodes.push(s.slice(last, match.index));
    const tok = match[0];
    if (tok.startsWith("**")) {
      nodes.push(<strong key={idx++}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("`")) {
      nodes.push(
        <code key={idx++} className="rounded bg-[var(--color-bg-soft)] px-1 py-0.5 font-mono text-[12.5px]">
          {tok.slice(1, -1)}
        </code>
      );
    } else if (tok.startsWith("*")) {
      nodes.push(<em key={idx++}>{tok.slice(1, -1)}</em>);
    }
    last = match.index + tok.length;
  }
  if (last < s.length) nodes.push(s.slice(last));
  return <>{nodes}</>;
}
