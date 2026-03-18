"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Heading from "@/components/heading";
import { MessageSquare, ChevronDown, ChevronUp, Copy, Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { BotAvatar } from "@/components/bot-avator";

const DATASETS = [
    { label: "News", value: "news" },
    { label: "SEC Filings", value: "sec" },
    { label: "Earnings Calls", value: "earnings" },
] as const;

type Dataset = typeof DATASETS[number]["value"];

const DATASET_LABELS: Record<Dataset, string> = {
    sec: "SEC Filings",
    earnings: "Earnings Calls",
    news: "News",
};

type DatasetStatus = {
    vector_count: number;
    last_updated: string | null;
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

const SUGGESTIONS: Record<Dataset, string[]> = {
    sec: [
        "What risk factors did NVIDIA highlight in their latest 10-K?",
        "What did NVIDIA say about supply and capacity constraints?",
        "How did NVIDIA describe their data center business strategy?",
    ],
    earnings: [
        "What were NVIDIA's key revenue highlights from the latest earnings call?",
        "What guidance did NVIDIA management provide for the next quarter?",
        "What did Jensen Huang say about AI infrastructure demand?",
    ],
    news: [
        "What is the latest news about NVIDIA's chip sales in China?",
        "What are analysts saying about NVIDIA's stock price target?",
        "What is the latest news about NVIDIA Blackwell GPU production?",
    ],
};

type RetrievalSource = {
    source: string;
    vector_score: number;
    rerank_score: number | null;
};

type Message = {
    role: "user" | "assistant";
    content: string;
    dataset?: Dataset;
    retrieval?: RetrievalSource[];
};

type ChatHistory = Record<Dataset, Message[]>;

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
                                {r.source.split("/").slice(-2).join("/")}
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
    const [history, setHistory] = useState<ChatHistory>({ sec: [], earnings: [], news: [] });
    const [input, setInput] = useState("");
    const [dataset, setDataset] = useState<Dataset>("news");
    const [isLoading, setIsLoading] = useState(false);
    const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
    const [status, setStatus] = useState<StatusData | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history, isLoading, dataset]);

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
                            content: `You've used all ${data.limit} free queries. Thanks for trying Chat.ai!`,
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
                title="Chat with your data"
                description="Chat with NVIDIA financial data across SEC filings, earnings calls, and news."
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
                        const badge = s?.last_updated
                            ? formatRelativeDate(s.last_updated)
                            : s ? "Historical" : null;
                        return (
                            <button
                                key={d.value}
                                onClick={() => setDataset(d.value)}
                                className={cn(
                                    "flex flex-col items-start px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                                    dataset === d.value
                                        ? "bg-white text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <span>{d.label}</span>
                                {badge && (
                                    <span className={cn(
                                        "text-[10px] font-normal leading-tight",
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
                {status?.[dataset] && (
                    <p className="text-xs text-muted-foreground mt-2 pl-1">
                        {status[dataset].vector_count.toLocaleString()} {dataset === "news" ? "articles" : "chunks"}
                        {" · "}
                        {status[dataset].last_updated
                            ? `Last updated ${formatInfoDate(status[dataset].last_updated!)}`
                            : "Historical data"}
                    </p>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 lg:px-8 space-y-6 pb-4">
                {messages.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full gap-6 py-16">
                        <div className="text-center">
                            <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                            <p className="text-muted-foreground text-sm">
                                Ask a question about NVIDIA {DATASET_LABELS[dataset]}
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

                            {/* Dataset badge + copy button for assistant messages */}
                            {msg.role === "assistant" && (
                                <div className="flex items-center gap-2 mt-1.5 px-1">
                                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600">
                                        {DATASET_LABELS[msg.dataset ?? dataset]}
                                    </span>
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
                        placeholder={isLimitReached ? "Query limit reached" : `Ask about NVIDIA ${DATASET_LABELS[dataset]}...`}
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
