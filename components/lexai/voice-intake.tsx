"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BEGIN_SIGNAL } from "@/lib/lexai/constants";
import type { Message, IntakeData, SupportedLanguage } from "@/lib/lexai/types";

// ── Web Speech API type declarations (not in default TS lib) ──────────────────

interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
}
interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
    readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
}
interface ISpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((e: SpeechRecognitionEvent) => void) | null;
    onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}
interface ISpeechRecognitionConstructor {
    new(): ISpeechRecognition;
}

// ── Types ──────────────────────────────────────────────────────────────────────

type VoiceState =
    | "idle"        // before first message
    | "thinking"    // waiting for AI chat response
    | "speaking"    // TTS audio is playing
    | "listening"   // STT is active, waiting for client to speak
    | "processing"; // client spoke, submitting to chat API

const STATE_LABEL: Record<VoiceState, string> = {
    idle: "Starting…",
    thinking: "One moment…",
    speaking: "Speaking…",
    listening: "Listening — speak your answer",
    processing: "Got it…",
};

const STT_LANG: Record<SupportedLanguage, string> = {
    en: "en-US",
    hi: "hi-IN",
};

// ── Props ──────────────────────────────────────────────────────────────────────

interface VoiceIntakeProps {
    language: SupportedLanguage;
    onMessagesChange?: (messages: Message[]) => void;
    onIntakeDataChange?: (data: IntakeData) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getSpeechRecognition(): ISpeechRecognitionConstructor | null {
    if (typeof window === "undefined") return null;
    const w = window as Window & {
        SpeechRecognition?: ISpeechRecognitionConstructor;
        webkitSpeechRecognition?: ISpeechRecognitionConstructor;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// ── Main component ─────────────────────────────────────────────────────────────

export const VoiceIntake = ({ language, onMessagesChange, onIntakeDataChange }: VoiceIntakeProps) => {
    const [voiceState, setVoiceState] = useState<VoiceState>("idle");
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentAIMessage, setCurrentAIMessage] = useState("");
    const [lastUserTranscript, setLastUserTranscript] = useState("");
    const [interimTranscript, setInterimTranscript] = useState("");
    const [sttSupported] = useState(() => !!getSpeechRecognition());
    const [errorMsg, setErrorMsg] = useState("");

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const recognitionRef = useRef<ISpeechRecognition | null>(null);
    const messagesRef = useRef<Message[]>([]);
    const onIntakeDataChangeRef = useRef(onIntakeDataChange);
    const resultReceivedRef = useRef(false);
    // Prevents double-invocation in React Strict Mode (dev only)
    const hasStartedRef = useRef(false);

    // Keep refs in sync
    useEffect(() => { messagesRef.current = messages; }, [messages]);
    useEffect(() => { onIntakeDataChangeRef.current = onIntakeDataChange; }, [onIntakeDataChange]);
    useEffect(() => { onMessagesChange?.(messages); }, [messages, onMessagesChange]);

    // ── TTS ──────────────────────────────────────────────────────────────────

    const playTTS = useCallback(async (text: string): Promise<void> => {
        setVoiceState("speaking");
        try {
            const res = await fetch("/api/lexai/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });
            if (!res.ok) throw new Error("TTS request failed");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);

            return new Promise((resolve) => {
                const audio = new Audio(url);
                audioRef.current = audio;
                audio.onended = () => {
                    URL.revokeObjectURL(url);
                    audioRef.current = null;
                    resolve();
                };
                audio.onerror = () => {
                    URL.revokeObjectURL(url);
                    audioRef.current = null;
                    resolve(); // continue even on audio error
                };
                audio.play().catch(() => resolve());
            });
        } catch {
            // If TTS fails, continue the conversation silently
        }
    }, []);

    // ── STT ──────────────────────────────────────────────────────────────────

    const startListening = useCallback((submitFn: (text: string) => void) => {
        const SpeechRecognition = getSpeechRecognition();
        if (!SpeechRecognition) return;

        // Stop any existing session
        recognitionRef.current?.stop();

        const recognition = new SpeechRecognition();
        recognition.lang = STT_LANG[language];
        recognition.continuous = false;
        recognition.interimResults = true;
        resultReceivedRef.current = false;

        recognition.onresult = (e: SpeechRecognitionEvent) => {
            const results = Array.from({ length: e.results.length }, (_, i) => e.results[i]);
            const interim = results
                .filter((r) => !r.isFinal)
                .map((r) => r[0].transcript)
                .join("");
            const final = results
                .filter((r) => r.isFinal)
                .map((r) => r[0].transcript)
                .join("");

            if (interim) setInterimTranscript(interim);
            if (final) {
                resultReceivedRef.current = true;
                setInterimTranscript("");
                setLastUserTranscript(final);
                submitFn(final);
            }
        };

        recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
            if (e.error === "no-speech") {
                // No speech detected — stay in listening state, user can tap mic
                setVoiceState("listening");
            } else if (e.error === "not-allowed") {
                setErrorMsg("Microphone permission denied. Please allow microphone access and refresh.");
                setVoiceState("idle");
            }
        };

        recognition.onend = () => {
            // If recognition ended without a result, go back to idle listening
            // so the user can tap the mic button to try again
            if (!resultReceivedRef.current) {
                setVoiceState("listening");
            }
        };

        recognitionRef.current = recognition;
        setVoiceState("listening");
        setInterimTranscript("");
        recognition.start();
    }, [language]);

    // ── Extraction (background, after each AI response) ───────────────────────

    const triggerExtraction = useCallback((msgs: Message[]) => {
        void fetch("/api/lexai/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: msgs }),
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => { if (data) onIntakeDataChangeRef.current?.(data); })
            .catch(() => {});
    }, []);

    // ── Core conversation turn ────────────────────────────────────────────────

    const callChat = useCallback(async (history: Message[]) => {
        setVoiceState("thinking");
        setInterimTranscript("");

        try {
            const res = await fetch("/api/lexai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: history }),
            });

            if (!res.ok) {
                setErrorMsg("Something went wrong. Please refresh and try again.");
                setVoiceState("idle");
                return;
            }

            const text = await res.text();
            const assistantMessage: Message = { role: "assistant", content: text };
            const updated = [...history, assistantMessage];

            setMessages(updated);
            setCurrentAIMessage(text);

            // Trigger extraction in background
            triggerExtraction(updated);

            // Play TTS, then start listening
            await playTTS(text);

            // Small pause after AI finishes speaking — feels more natural
            await new Promise((r) => setTimeout(r, 500));

            // Start listening, passing the submit function inline
            startListening((transcript) => {
                const userMessage: Message = { role: "user", content: transcript };
                const next = [...updated, userMessage];
                setMessages(next);
                setVoiceState("processing");
                void callChat(next);
            });

        } catch {
            setErrorMsg("Something went wrong. Please refresh and try again.");
            setVoiceState("idle");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playTTS, startListening, triggerExtraction]);

    // ── Boot: fire [BEGIN] on mount ───────────────────────────────────────────

    useEffect(() => {
        const trigger: Message[] = [{ role: "user", content: BEGIN_SIGNAL }];
        setMessages(trigger);
        void callChat(trigger);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Cleanup on unmount ────────────────────────────────────────────────────

    useEffect(() => {
        return () => {
            audioRef.current?.pause();
            recognitionRef.current?.stop();
        };
    }, []);

    // ── Manual mic button (tap to restart listening) ──────────────────────────

    const handleMicClick = useCallback(() => {
        if (voiceState !== "listening" && voiceState !== "speaking") return;

        // Stop TTS if playing
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        // Restart listening with current history
        const history = messagesRef.current;
        startListening((transcript) => {
            const userMessage: Message = { role: "user", content: transcript };
            const next = [...history, userMessage];
            setMessages(next);
            setVoiceState("processing");
            void callChat(next);
        });
    }, [voiceState, startListening, callChat]);

    // ── Render ────────────────────────────────────────────────────────────────

    const isListening = voiceState === "listening";
    const isSpeaking = voiceState === "speaking";
    const isThinking = voiceState === "thinking" || voiceState === "processing";
    const canInterrupt = isSpeaking || isListening;

    return (
        <div className="flex flex-col h-full items-center justify-center px-6 gap-8">

            {/* Error state */}
            {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-center max-w-sm">
                    {errorMsg}
                </div>
            )}

            {!sttSupported && !errorMsg && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 text-center max-w-sm">
                    Your browser doesn&apos;t support voice input. Please use Chrome or Edge.
                </div>
            )}

            {/* Current AI message */}
            {currentAIMessage && (
                <div className="max-w-lg text-center text-base leading-relaxed text-foreground">
                    {currentAIMessage}
                </div>
            )}

            {/* Central mic orb */}
            <div className="relative flex items-center justify-center">
                {/* Outer pulse ring — listening */}
                {isListening && (
                    <>
                        <div className="absolute w-40 h-40 rounded-full bg-amber-400/20 animate-ping" />
                        <div className="absolute w-32 h-32 rounded-full bg-amber-400/30 animate-pulse" />
                    </>
                )}
                {/* Outer pulse ring — speaking */}
                {isSpeaking && (
                    <div className="absolute w-32 h-32 rounded-full bg-violet-400/20 animate-pulse" />
                )}

                {/* Main button */}
                <button
                    onClick={handleMicClick}
                    disabled={isThinking || !!errorMsg || !sttSupported}
                    className={cn(
                        "relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg",
                        isListening
                            ? "bg-amber-500 hover:bg-amber-600 scale-110"
                            : isSpeaking
                                ? "bg-violet-500 hover:bg-violet-600 cursor-pointer"
                                : isThinking
                                    ? "bg-muted cursor-not-allowed"
                                    : "bg-muted cursor-not-allowed"
                    )}
                    title={canInterrupt ? "Tap to speak" : undefined}
                >
                    {isThinking ? (
                        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                    ) : isListening ? (
                        <Mic className="w-8 h-8 text-white" />
                    ) : isSpeaking ? (
                        <Mic className="w-8 h-8 text-white opacity-60" />
                    ) : (
                        <MicOff className="w-8 h-8 text-muted-foreground" />
                    )}
                </button>
            </div>

            {/* Status label */}
            <p className={cn(
                "text-sm font-medium",
                isListening ? "text-amber-600" : "text-muted-foreground"
            )}>
                {STATE_LABEL[voiceState]}
            </p>

            {/* Live interim transcript while speaking */}
            {interimTranscript && (
                <p className="text-sm text-muted-foreground italic text-center max-w-sm">
                    &ldquo;{interimTranscript}&rdquo;
                </p>
            )}

            {/* Last client response */}
            {lastUserTranscript && !interimTranscript && (
                <p className="text-xs text-muted-foreground text-center max-w-sm">
                    You said: &ldquo;{lastUserTranscript}&rdquo;
                </p>
            )}

            {/* Tap hint when listening */}
            {isListening && (
                <p className="text-xs text-muted-foreground">
                    Speak now — tap the mic to retry if needed
                </p>
            )}
        </div>
    );
};
