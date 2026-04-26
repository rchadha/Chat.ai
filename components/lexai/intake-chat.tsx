"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { BotAvatar } from "@/components/bot-avator";
import { TypingIndicator } from "@/components/lexai/typing-indicator";
import { AutoResizeTextarea } from "@/components/lexai/auto-resize-textarea";
import { BEGIN_SIGNAL } from "@/lib/lexai/constants";
import type { Message, IntakeData, SupportedLanguage } from "@/lib/lexai/types";

const PLACEHOLDER: Record<SupportedLanguage, string> = {
    en: "Type your answer…",
    hi: "अपना जवाब लिखें…",
};

interface IntakeChatProps {
    language: SupportedLanguage;
    onMessagesChange?: (messages: Message[]) => void;
    onIntakeDataChange?: (data: IntakeData) => void;
}

export const IntakeChat = ({ language, onMessagesChange, onIntakeDataChange }: IntakeChatProps) => {
    // messages holds the full history including the hidden [BEGIN] trigger.
    // visible messages are everything after the first entry.
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    // Refs used by the extraction effect to avoid stale closures
    const prevLoadingRef = useRef(false);
    const messagesRef = useRef(messages);
    const onIntakeDataChangeRef = useRef(onIntakeDataChange);
    useEffect(() => { messagesRef.current = messages; }, [messages]);
    useEffect(() => { onIntakeDataChangeRef.current = onIntakeDataChange; }, [onIntakeDataChange]);

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    // Propagate messages up to parent
    useEffect(() => {
        onMessagesChange?.(messages);
    }, [messages, onMessagesChange]);

    // After each completed stream, fire extraction in the background
    useEffect(() => {
        const wasLoading = prevLoadingRef.current;
        prevLoadingRef.current = isLoading;

        // Only trigger when loading transitions true → false and we have a real conversation
        if (!wasLoading || isLoading || messagesRef.current.length < 3) return;

        const snapshot = messagesRef.current;
        void fetch("/api/lexai/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: snapshot }),
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => { if (data) onIntakeDataChangeRef.current?.(data); })
            .catch(() => {});
    }, [isLoading]);

    const callChat = useCallback(async (history: Message[]) => {
        setIsLoading(true);

        // Optimistically add an empty assistant message that we'll stream into
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        try {
            const res = await fetch("/api/lexai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: history }),
            });

            if (!res.ok || !res.body) {
                const errText = await res.text().catch(() => "");
                console.error("[LEXAI_CHAT] API error", res.status, errText);
                setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        role: "assistant",
                        content: `Something went wrong (${res.status}). Please try again.`,
                    };
                    return updated;
                });
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                accumulated += decoder.decode(value, { stream: true });
                const snapshot = accumulated;
                setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        role: "assistant",
                        content: snapshot,
                    };
                    return updated;
                });
            }
        } catch {
            setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    role: "assistant",
                    content: "Something went wrong. Please try again.",
                };
                return updated;
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fire the opening greeting on mount
    useEffect(() => {
        const trigger: Message[] = [{ role: "user", content: BEGIN_SIGNAL }];
        setMessages(trigger);
        callChat(trigger);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submit = useCallback(async () => {
        const query = input.trim();
        if (!query || isLoading) return;

        const userMessage: Message = { role: "user", content: query };
        const updated = [...messages, userMessage];
        setMessages(updated);
        setInput("");

        // Build the history to send: filter out the [BEGIN] trigger from
        // the visible history but keep assistant responses intact.
        // The API needs the full alternating user/assistant turns.
        await callChat(updated);
    }, [input, isLoading, messages, callChat]);

    // Visible messages: skip the hidden [BEGIN] trigger (first entry)
    const visible = messages.slice(1);

    return (
        <div className="flex flex-col h-full">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 space-y-6">
                {visible.map((msg, i) => (
                    <div
                        key={i}
                        className={cn(
                            "flex gap-3",
                            msg.role === "user" ? "flex-row-reverse" : "flex-row"
                        )}
                    >
                        {msg.role === "user" ? <UserAvatar /> : <BotAvatar />}
                        <div className={cn("max-w-[80%]", msg.role === "user" ? "items-end" : "items-start")}>
                            <div
                                className={cn(
                                    "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                                    msg.role === "user"
                                        ? "bg-amber-500 text-white rounded-tr-sm"
                                        : "bg-muted rounded-tl-sm"
                                )}
                            >
                                {msg.role === "assistant" ? (
                                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    msg.content
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && visible.length === 0 && (
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
            <div className="px-4 lg:px-6 pb-6 pt-2 border-t">
                <div className={cn(
                    "flex items-end gap-2 rounded-xl border bg-background px-4 py-3 transition-colors",
                    isLoading
                        ? "opacity-60 cursor-not-allowed"
                        : "focus-within:border-amber-400"
                )}>
                    <AutoResizeTextarea
                        value={input}
                        onChange={setInput}
                        onSubmit={submit}
                        disabled={isLoading}
                        placeholder={PLACEHOLDER[language]}
                    />
                    <button
                        disabled={isLoading || !input.trim()}
                        onClick={submit}
                        className={cn(
                            "shrink-0 p-1.5 rounded-lg transition-colors mb-0.5",
                            input.trim() && !isLoading
                                ? "bg-amber-500 text-white hover:bg-amber-600"
                                : "text-muted-foreground cursor-not-allowed"
                        )}
                        aria-label="Send"
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
