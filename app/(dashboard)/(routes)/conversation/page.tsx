"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Heading from "@/components/heading";
import { MessageSquare, ChevronDown, ChevronUp, Copy, Check, Zap, Users, Newspaper, TrendingUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { BotAvatar } from "@/components/bot-avator";

const DATASETS = [
    { label: "News", value: "news", icon: Newspaper },
    { label: "Social Sentiment", value: "social", icon: Users },
    { label: "SEC Filings", value: "sec", icon: FileText },
    { label: "Earnings Calls", value: "earnings", icon: TrendingUp },
] as const;

type Dataset = typeof DATASETS[number]["value"];

const DATASET_LABELS: Record<Dataset, string> = {
    news: "News",
    social: "Social Sentiment",
    sec: "SEC Filings",
    earnings: "Earnings Calls",
};

type DatasetStatus = {
    count: number;
    latest: string | null;
};

type StatusData = Record<Dataset, DatasetStatus>;

function formatRelativeDate(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Updated today";
    if (diffDays === 1) return "Updated yesterday";
    if (diffDays < 7) return `Updated ${diffDays} days ago`;
    return `Updated ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function formatInfoDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatInfoDateTime(iso: string): string {
    return new Date(iso).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit", hour12: true,
        timeZone: "America/New_York",
        timeZoneName: "short",
    });
}

const SUGGESTIONS: Record<Dataset, string[]> = {
    news: [
        "What is the latest news about this company's business outlook?",
        "What are analysts saying about the stock price target?",
        "What recent developments have impacted the company's valuation?",
    ],
    social: [
        "What is the current sentiment around this stock on Reddit?",
        "What are retail investors saying about recent performance?",
        "Are investors on Reddit bullish or bearish right now?",
        "What concerns are Reddit users raising about this stock?",
        "What are the most discussed topics on investing forums this week?",
    ],
    sec: [
        "What risk factors were highlighted in the latest 10-K?",
        "What did the company say about supply and capacity constraints?",
        "How did the company describe their core business strategy?",
    ],
    earnings: [
        "What were the key revenue highlights from the latest earnings call?",
        "What guidance did management provide for the next quarter?",
        "What did the CEO say about demand and growth outlook?",
    ],
};

type RetrievalSource = {
    source: string;
    vector_score: number;
    rerank_score: number | null;
};

type SentimentLabel = "positive" | "neutral" | "negative";

type Message = {
    role: "user" | "assistant";
    content: string;
    dataset?: Dataset;
    retrieval?: RetrievalSource[];
    sentiment_label?: SentimentLabel;
};

type ChatHistory = Record<Dataset, Message[]>;

// ── Sentiment badge ────────────────────────────────────────────────────────────

const SENTIMENT_CONFIG: Record<SentimentLabel, { label: string; className: string }> = {
    positive: { label: "Positive", className: "bg-green-100 text-green-700" },
    neutral:  { label: "Neutral",  className: "bg-gray-100 text-gray-600"  },
    negative: { label: "Negative", className: "bg-red-100 text-red-600"    },
};

const SentimentBadge = ({ sentiment }: { sentiment: SentimentLabel }) => {
    const cfg = SENTIMENT_CONFIG[sentiment];
    return (
        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", cfg.className)}>
            {cfg.label}
        </span>
    );
};

// ── Sources panel ──────────────────────────────────────────────────────────────

const SourcesPanel = ({ retrieval }: { retrieval: RetrievalSource[] }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="mt-2 text-xs">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
                {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                <span>{retrieval.length} source{retrieval.length !== 1 ? "s" : ""}</span>
            </button>
            {open && (
                <div className="mt-2 space-y-2 pl-1">
                    {retrieval.map((r, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <span
                                className="truncate text-muted-foreground max-w-[220px]"
                                title={r.source}
                            >
                                {r.source
                                    .split("/")
                                    .filter(Boolean)
                                    .map(s => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()))
                                    .slice(-2)
                                    .join(" · ")}
                            </span>
                            <div className="flex items-center gap-1.5 ml-auto shrink-0">
                                <div className="w-16 h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-violet-500 rounded-full"
                                        style={{ width: `${Math.round(r.vector_score * 100)}%` }}
                                    />
                                </div>
                                <span className="text-muted-foreground tabular-nums w-8 text-right">
                                    {Math.round(r.vector_score * 100)}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Copy button ────────────────────────────────────────────────────────────────

const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={copy}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded"
            title="Copy response"
        >
            {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
        </button>
    );
};

// ── Typing indicator ───────────────────────────────────────────────────────────

const TypingIndicator = () => (
    <div className="flex items-center gap-1 py-1">
        {[0, 1, 2].map((i) => (
            <div
                key={i}
                className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
            />
        ))}
    </div>
);

// ── Auto-resize textarea ───────────────────────────────────────────────────────

const AutoResizeTextarea = ({
    value,
    onChange,
    onSubmit,
    disabled,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    disabled: boolean;
    placeholder: string;
}) => {
    const ref = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (ref.current) {
            ref.current.style.height = "auto";
            ref.current.style.height = `${ref.current.scrollHeight}px`;
        }
    }, [value]);

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
        }
    };

    return (
        <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50 max-h-40 overflow-y-auto py-1"
        />
    );
};

// ── Main component ─────────────────────────────────────────────────────────────

const Conversation = () => {
    const [history, setHistory] = useState<ChatHistory>({ news: [], social: [], sec: [], earnings: [] });
    const [input, setInput] = useState("");
    const [dataset, setDataset] = useState<Dataset>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("finchat_default_dataset") as Dataset | null;
            if (saved && ["news", "social", "sec", "earnings"].includes(saved)) return saved;
        }
        return "news";
    });
    const [isLoading, setIsLoading] = useState(false);
    const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
    const [status, setStatus] = useState<StatusData | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch("/api/usage")
            .then((r) => r.json())
            .then(setUsage)
            .catch(() => {});

        fetch("/api/status")
            .then((r) => r.json())
            .then(setStatus)
            .catch(() => {});
    }, []);

    const messages = history[dataset];
    const isLimitReached = usage !== null && usage.used >= usage.limit;

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history, isLoading]);

    // Scroll to top when switching datasets
    useEffect(() => {
        messagesRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, [dataset]);

    const submit = useCallback(async (query: string) => {
        if (!query.trim() || isLoading) return;

        const userMessage: Message = { role: "user", content: query };
        setHistory((prev) => ({
            ...prev,
            [dataset]: [...prev[dataset], userMessage],
        }));
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/conversation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, dataset }),
            });
            const data = await res.json();

            if (res.status === 429) {
                setUsage({ used: data.used, limit: data.limit });
                window.dispatchEvent(new CustomEvent("usage-updated", { detail: { used: data.used, limit: data.limit } }));
                setHistory((prev) => ({
                    ...prev,
                    [dataset]: [
                        ...prev[dataset],
                        {
                            role: "assistant",
                            content: `You've used all ${data.limit} free queries. Thanks for trying Lumin.ai!`,
                            dataset,
                        },
                    ],
                }));
                return;
            }

            setUsage({ used: data.used, limit: data.limit });
            window.dispatchEvent(new CustomEvent("usage-updated", { detail: { used: data.used, limit: data.limit } }));
            setHistory((prev) => ({
                ...prev,
                [dataset]: [
                    ...prev[dataset],
                    {
                        role: "assistant",
                        content: data.response,
                        dataset,
                        retrieval: data.retrieval,
                        sentiment_label: data.sentiment_label ?? undefined,
                    },
                ],
            }));
        } catch {
            setHistory((prev) => ({
                ...prev,
                [dataset]: [
                    ...prev[dataset],
                    { role: "assistant", content: "Something went wrong. Please try again.", dataset },
                ],
            }));
        } finally {
            setIsLoading(false);
        }
    }, [dataset, isLoading]);

    return (
        <div className="h-full flex flex-col">
            <Heading
                title="FinChat"
                description="Ask questions across news, social sentiment, SEC filings, and earnings calls for any public company."
                icon={MessageSquare}
                iconColor="text-violet-500"
                bgColor="bg-violet-500/10"
            />
            {usage && (
                <div className="px-4 lg:px-8 pb-2 flex items-center gap-2">
                    <Zap size={13} className={isLimitReached ? "text-red-500" : "text-violet-500"} />
                    <span className={cn("text-xs font-medium", isLimitReached ? "text-red-500" : "text-muted-foreground")}>
                        {isLimitReached
                            ? "Free query limit reached"
                            : `${usage.used}/${usage.limit} free queries used`}
                    </span>
                </div>
            )}

            {/* Dataset tabs */}
            <div className="px-4 lg:px-8 pb-2">
                <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
                    {DATASETS.map((d) => {
                        const s = status?.[d.value];
                        const badge = s?.latest
                            ? formatRelativeDate(s.latest)
                            : s ? "Historical" : null;
                        return (
                            <button
                                key={d.value}
                                onClick={() => setDataset(d.value)}
                                className={cn(
                                    "flex flex-col items-start px-3 py-2 rounded-md text-sm font-medium transition-all",
                                    dataset === d.value
                                        ? "bg-white text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <div className="flex items-center gap-1.5">
                                    <d.icon size={13} className={dataset === d.value ? "text-violet-500" : ""} />
                                    <span>{d.label}</span>
                                </div>
                                {badge && (
                                    <span className={cn(
                                        "text-[10px] font-normal leading-tight pl-5",
                                        dataset === d.value ? "text-violet-500" : "text-muted-foreground"
                                    )}>
                                        {badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Info bar */}
                {(status?.[dataset] || dataset === "social") && (
                    <p className="text-xs text-muted-foreground mt-2 pl-1 flex items-center gap-1">
                        {dataset === "social" ? (
                            <>
                                <Users size={11} />
                                <span>
                                    {status?.social ? `${status.social.count.toLocaleString()} posts · ` : ""}
                                    {status?.social?.latest
                                        ? `Last updated ${formatInfoDateTime(status.social.latest)} · `
                                        : ""}
                                    Data sourced from Reddit finance communities (r/investing, r/stocks, r/wallstreetbets).
                                </span>
                            </>
                        ) : status?.[dataset] ? (
                            <>
                                {status[dataset].count.toLocaleString()} {dataset === "news" ? "articles" : "chunks"}
                                {" · "}
                                {status[dataset].latest
                                    ? `Last updated ${dataset === "news" ? formatInfoDateTime(status[dataset].latest!) : formatInfoDate(status[dataset].latest!)}`
                                    : "Historical data"}
                            </>
                        ) : null}
                    </p>
                )}
            </div>

            {/* Messages */}
            <div ref={messagesRef} className="flex-1 overflow-y-auto px-4 lg:px-8 space-y-6 pb-4">
                {messages.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full gap-6 py-16">
                        <div className="text-center">
                            {(() => {
                                const Icon = DATASETS.find(d => d.value === dataset)?.icon ?? MessageSquare;
                                return <Icon className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />;
                            })()}
                            <p className="text-muted-foreground text-sm">
                                Ask a question about {DATASET_LABELS[dataset]}
                            </p>
                        </div>
                        <div className="grid gap-3 w-full max-w-lg">
                            {SUGGESTIONS[dataset].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => submit(s)}
                                    className="text-left px-4 py-3 rounded-lg border border-border hover:border-violet-400 hover:bg-violet-500/5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={cn(
                            "flex gap-3",
                            msg.role === "user" ? "flex-row-reverse" : "flex-row"
                        )}
                    >
                        {msg.role === "user" ? <UserAvatar /> : <BotAvatar />}
                        <div className={cn("max-w-[75%] group", msg.role === "user" ? "items-end" : "items-start")}>
                            <div
                                className={cn(
                                    "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                                    msg.role === "user"
                                        ? "bg-violet-500 text-white rounded-tr-sm"
                                        : "bg-muted rounded-tl-sm"
                                )}
                            >
                                {msg.role === "assistant" ? (
                                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    msg.content
                                )}
                            </div>

                            {/* Dataset badge + sentiment + copy button for assistant messages */}
                            {msg.role === "assistant" && (
                                <div className="flex items-center gap-2 mt-1.5 px-1">
                                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600">
                                        {DATASET_LABELS[msg.dataset ?? dataset]}
                                    </span>
                                    {msg.sentiment_label && (
                                        <SentimentBadge sentiment={msg.sentiment_label} />
                                    )}
                                    <CopyButton text={msg.content} />
                                </div>
                            )}

                            {msg.retrieval && msg.retrieval.length > 0 && (
                                <SourcesPanel retrieval={msg.retrieval} />
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3">
                        <BotAvatar />
                        <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                            <TypingIndicator />
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 lg:px-8 pb-6 pt-2 border-t">
                <div className={cn(
                    "flex items-end gap-2 rounded-xl border bg-background px-4 py-3 focus-within:shadow-sm transition-colors",
                    isLimitReached ? "opacity-50 cursor-not-allowed" : "focus-within:border-violet-400"
                )}>
                    <AutoResizeTextarea
                        value={input}
                        onChange={setInput}
                        onSubmit={() => submit(input)}
                        disabled={isLoading || isLimitReached}
                        placeholder={isLimitReached ? "Query limit reached" : `Ask about ${DATASET_LABELS[dataset]}...`}
                    />
                    <button
                        disabled={isLoading || !input.trim() || isLimitReached}
                        onClick={() => submit(input)}
                        className={cn(
                            "shrink-0 p-1.5 rounded-lg transition-colors mb-0.5",
                            input.trim() && !isLoading
                                ? "bg-violet-500 text-white hover:bg-violet-600"
                                : "text-muted-foreground cursor-not-allowed"
                        )}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5 px-1">
                    Press <kbd className="font-mono">Enter</kbd> to send · <kbd className="font-mono">Shift+Enter</kbd> for new line
                </p>
            </div>
        </div>
    );
};

export default Conversation;
