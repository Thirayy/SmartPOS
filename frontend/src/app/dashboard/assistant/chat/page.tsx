"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { fetchApi, getBusinessId, streamApi, type StreamEvent } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/states";

interface ChatSource {
  module_name: string;
  slide_number: number;
  slide_title: string;
  source_file?: string | null;
  ethics_topic?: string | null;
  principle?: string | null;
  source_excerpt: string;
  business_relevance?: string | null;
}

interface ChatMessage {
  id?: number;
  localId?: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  analysis_mode?: "AI" | "LOCAL" | null;
  pending?: boolean;
}

interface ConversationSummary {
  id: number;
  title: string;
  updated_at: string;
  last_message?: string | null;
}

interface ConversationDetail {
  id: number;
  title: string;
  messages: Array<{
    id: number;
    role: "user" | "assistant";
    content: string;
    sources?: ChatSource[];
    analysis_mode?: "AI" | "LOCAL" | null;
  }>;
}

const SUGGESTED_PROMPTS = [
  "Jelaskan kondisi bisnis saya saat ini.",
  "Prinsip HCB apa yang paling relevan untuk usaha saya?",
  "Apa langkah perbaikan yang harus saya prioritaskan?",
  "Bagaimana menetapkan harga yang adil?",
];

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Gagal mengirim pesan.";

const createStreamId = () => `stream-${Date.now()}`;

function formatConversationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function readSources(event: StreamEvent): ChatSource[] {
  const raw = event.sources;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is ChatSource =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as ChatSource).module_name === "string" &&
      typeof (item as ChatSource).source_excerpt === "string"
  );
}

function readMode(event: StreamEvent): "AI" | "LOCAL" {
  return event.analysis_mode === "AI" ? "AI" : "LOCAL";
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
          <Bot className="h-4 w-4" />
        </span>
      ) : null}

      <div
        className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[76%] ${
          isUser
            ? "rounded-tr-md bg-indigo-600 text-white"
            : "rounded-tl-md border border-slate-200/80 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        }`}
      >
        {!isUser && message.analysis_mode ? (
          <Badge
            tone={message.analysis_mode === "AI" ? "indigo" : "slate"}
            className="mb-2"
          >
            {message.analysis_mode === "AI" ? "Analisis AI" : "Analisis lokal"}
          </Badge>
        ) : null}

        {message.content ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : message.pending ? (
          <span className="flex items-center gap-1 py-1" aria-label="Asisten sedang mengetik">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" />
          </span>
        ) : (
          <p className="text-xs italic text-slate-400">
            Asisten tidak mengembalikan jawaban. Silakan coba lagi.
          </p>
        )}

        {!isUser && message.sources?.length ? (
          <details className="group mt-3 rounded-xl border border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/40">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span>Sumber HCB ({message.sources.length})</span>
              <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
            </summary>
            <div className="space-y-3 border-t border-slate-200/70 px-3 py-3 dark:border-slate-800">
              {message.sources.map((source, index) => (
                <div key={`${source.module_name}-${source.slide_number}-${index}`} className="space-y-1.5">
                  <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                    {source.module_name} · Slide {source.slide_number}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {source.slide_title}
                    {source.principle ? ` — ${source.principle}` : ""}
                  </p>
                  <p className="rounded-lg bg-white/70 p-2 text-[11px] leading-5 text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
                    &ldquo;{source.source_excerpt}&rdquo;
                  </p>
                  {source.business_relevance ? (
                    <p className="text-[10px] leading-4 text-slate-400 dark:text-slate-500">
                      Relevansi: {source.business_relevance}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>

      {isUser ? (
        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
          <User className="h-4 w-4" />
        </span>
      ) : null}
    </div>
  );
}

export default function AssistantChatPage() {
  const businessId = getBusinessId();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = useCallback(async () => {
    if (businessId === null) {
      setLoadingHistory(false);
      return;
    }
    try {
      const data = (await fetchApi(
        `/businesses/${businessId}/ai/chat/conversations`
      )) as ConversationSummary[];
      setConversations(Array.isArray(data) ? data : []);
      setHistoryError("");
    } catch (loadError) {
      setHistoryError(getErrorMessage(loadError));
    } finally {
      setLoadingHistory(false);
    }
  }, [businessId]);

  useEffect(() => {
    void (async () => {
      await loadConversations();
    })();
  }, [loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: streaming ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, streaming]);

  const openConversation = async (id: number) => {
    if (streaming || businessId === null) return;
    setLoadingConversation(true);
    setError("");
    try {
      const data = (await fetchApi(
        `/businesses/${businessId}/ai/chat/${id}`
      )) as ConversationDetail;
      setConversationId(data.id);
      setMessages(
        data.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          sources: message.sources ?? [],
          analysis_mode: message.analysis_mode ?? null,
        }))
      );
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoadingConversation(false);
    }
  };

  const startNewConversation = () => {
    if (streaming) return;
    setConversationId(null);
    setMessages([]);
    setInput("");
    setError("");
  };

  const sendMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || streaming) return;
    if (businessId === null) {
      setError("Sesi login tidak ditemukan. Silakan masuk kembali.");
      return;
    }

    const localId = createStreamId();
    setInput("");
    setError("");
    setStreaming(true);
    setMessages((current) => [
      ...current,
      { role: "user", content: text },
      {
        localId,
        role: "assistant",
        content: "",
        sources: [],
        analysis_mode: null,
        pending: true,
      },
    ]);

    let streamedContent = "";
    let streamedSources: ChatSource[] = [];
    let streamedMode: "AI" | "LOCAL" = "LOCAL";

    const updateAssistant = (patch: Partial<ChatMessage>) => {
      setMessages((current) =>
        current.map((message) =>
          message.localId === localId ? { ...message, ...patch } : message
        )
      );
    };

    try {
      await streamApi(
        `/businesses/${businessId}/ai/chat`,
        {
          method: "POST",
          body: JSON.stringify({
            message: text,
            conversation_id: conversationId,
          }),
        },
        (event) => {
          if (event.type === "meta") {
            if (typeof event.conversation_id === "number") {
              setConversationId(event.conversation_id);
            }
            streamedSources = readSources(event);
            streamedMode = readMode(event);
            updateAssistant({
              sources: streamedSources,
              analysis_mode: streamedMode,
            });
          }

          if (event.type === "token" && typeof event.content === "string") {
            streamedContent += event.content;
            updateAssistant({
              content: streamedContent,
              sources: streamedSources,
              analysis_mode: streamedMode,
            });
          }

          if (event.type === "error" && typeof event.message === "string") {
            setError(event.message);
          }

          if (event.type === "done") {
            updateAssistant({ pending: false });
          }
        }
      );

      updateAssistant({
        content: streamedContent,
        sources: streamedSources,
        analysis_mode: streamedMode,
        pending: false,
      });
    } catch (sendError) {
      setError(getErrorMessage(sendError));
      setMessages((current) =>
        current.filter(
          (message) => message.localId !== localId || Boolean(message.content)
        )
      );
    } finally {
      setStreaming(false);
      void loadConversations();
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/dashboard/assistant"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            <ArrowLeft className="h-3 w-3" />
            Kembali ke analisis
          </Link>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            <MessageCircle className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Diskusi dengan Asisten
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Tanyakan kondisi bisnis dan etika dagang HCB. Jawaban disimpan dalam riwayat percakapan.
          </p>
        </div>
        <Badge tone="indigo" className="w-fit">
          <Sparkles className="h-3 w-3" />
          HCB knowledge base
        </Badge>
      </div>

      {error ? (
        <ErrorState
          title="Percakapan bermasalah"
          message={error}
          onRetry={() => setError("")}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="flex max-h-[70vh] flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-3 dark:border-slate-800">
            <h2 className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Riwayat percakapan
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={startNewConversation}
              disabled={streaming}
              aria-label="Percakapan baru"
              className="h-8 w-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {loadingHistory ? (
              <div className="flex items-center gap-2 px-2 py-3 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Memuat riwayat...
              </div>
            ) : null}

            {!loadingHistory && historyError ? (
              <p className="px-2 py-3 text-xs text-rose-500">{historyError}</p>
            ) : null}

            {!loadingHistory && !historyError && !conversations.length ? (
              <p className="px-2 py-3 text-xs italic text-slate-400">
                Belum ada riwayat. Mulai percakapan baru.
              </p>
            ) : null}

            <div className="space-y-1" data-testid="conversation-list">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => void openConversation(conversation.id)}
                  disabled={streaming || loadingConversation}
                  className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                    conversationId === conversation.id
                      ? "bg-indigo-50 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-200"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="line-clamp-2 text-xs font-semibold">
                      {conversation.title}
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {formatConversationDate(conversation.updated_at)}
                    </span>
                  </span>
                  {conversation.last_message ? (
                    <span className="mt-1 line-clamp-1 block text-[10px] font-normal text-slate-400">
                      {conversation.last_message}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="flex h-[70vh] flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Bot className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                Asisten Bisnis HCB
              </p>
              <p className="text-[10px] text-slate-400">
                {conversationId ? "Percakapan tersimpan" : "Percakapan baru"}
              </p>
            </div>
            {streaming ? (
              <Badge tone="slate" className="ml-auto">
                <Loader2 className="h-3 w-3 animate-spin" />
                Menjawab
              </Badge>
            ) : null}
          </div>

          <div
            data-testid="chat-messages"
            className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-slate-50/40 p-4 dark:bg-slate-950/20"
          >
            {loadingConversation ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat percakapan...
              </div>
            ) : null}

            {!loadingConversation && !messages.length ? (
              <div className="mx-auto max-w-lg py-6 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                  <Bot className="h-7 w-7" />
                </span>
                <h3 className="mt-4 text-base font-extrabold text-slate-900 dark:text-white">
                  Mulai diskusi
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Asisten memakai data bisnis dan materi HCB yang relevan. Pilih pertanyaan
                  di bawah atau tulis pertanyaan Anda sendiri.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs font-semibold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:text-indigo-300"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((message, index) => (
              <MessageBubble
                key={message.id ?? message.localId ?? `${message.role}-${index}`}
                message={message}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={4000}
                placeholder="Tanyakan kondisi bisnis atau etika dagang..."
                className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-indigo-600 dark:focus:ring-indigo-950"
              />
              <Button
                type="submit"
                size="icon"
                disabled={streaming || !input.trim()}
                aria-label="Kirim pesan"
              >
                {streaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-[10px] text-slate-400">
              Enter untuk kirim, Shift+Enter untuk baris baru. Keputusan akhir tetap di tangan Anda.
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
