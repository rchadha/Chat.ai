import { Scale } from "lucide-react";
import Heading from "@/components/heading";
import { IntakeChatLayout } from "@/components/lexai/intake-chat-layout";
import type { SupportedLanguage } from "@/lib/lexai/types";

interface Props {
    searchParams: Promise<{ lang?: string }>;
}

const LexAIChatPage = async ({ searchParams }: Props) => {
    const params = await searchParams;
    const language: SupportedLanguage = params.lang === "hi" ? "hi" : "en";

    return (
        <div className="h-full flex flex-col">
            <Heading
                title="LexAI — Intake"
                description="AI that handles client intake so you can focus on the law."
                icon={Scale}
                iconColor="text-amber-500"
                bgColor="bg-amber-500/10"
            />
            <IntakeChatLayout language={language} />
        </div>
    );
};

export default LexAIChatPage;
