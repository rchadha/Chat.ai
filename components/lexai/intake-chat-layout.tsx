"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { VoiceIntake } from "@/components/lexai/voice-intake";
import { IntakeSummaryPanel } from "@/components/lexai/intake-summary-panel";
import { EMPTY_INTAKE_DATA } from "@/lib/lexai/types";
import type { IntakeData, Message, SupportedLanguage } from "@/lib/lexai/types";

interface IntakeChatLayoutProps {
    language: SupportedLanguage;
}

export const IntakeChatLayout = ({ language }: IntakeChatLayoutProps) => {
    const router = useRouter();
    const [intakeData, setIntakeData] = useState<IntakeData>(EMPTY_INTAKE_DATA);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isFinishing, setIsFinishing] = useState(false);

    const handleFinish = useCallback(async () => {
        if (isFinishing || messages.length === 0) return;
        setIsFinishing(true);
        try {
            const res = await fetch("/api/lexai/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages, intakeData }),
            });
            if (!res.ok) throw new Error("Failed to save session");
            const { sessionId } = await res.json();
            router.push(`/lexai/summary?session=${sessionId}`);
        } catch {
            setIsFinishing(false);
        }
    }, [isFinishing, messages, intakeData, router]);

    return (
        <div className="flex flex-1 overflow-hidden border-t">
            {/* Left — conversation */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <VoiceIntake
                    language={language}
                    onMessagesChange={setMessages}
                    onIntakeDataChange={setIntakeData}
                />
            </div>

            {/* Right — live summary panel */}
            <div className="hidden lg:flex w-80 flex-col border-l overflow-hidden">
                <IntakeSummaryPanel
                    data={intakeData}
                    onFinish={handleFinish}
                    isFinishing={isFinishing}
                />
            </div>
        </div>
    );
};
