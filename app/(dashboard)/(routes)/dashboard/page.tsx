"use client"

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowRight, BarChart2, BrainCircuit, DatabaseIcon, Scale } from "lucide-react";
import { useRouter } from "next/navigation";

const tools = [
    {
        label: "FinChat",
        description: "Ask questions across SEC filings, earnings calls, news, and social sentiment.",
        icon: BarChart2,
        color: "text-violet-500",
        bgColor: "bg-violet-500/10",
        href: "/conversation",
        comingSoon: false,
    },
    {
        label: "DataChat",
        description: "Query your SQL database in plain English — no SQL required.",
        icon: DatabaseIcon,
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
        href: "/sqlconversation",
        comingSoon: false,
    },
    {
        label: "LocalChat",
        description: "Chat with a locally running LLM — fully private, no data sent to the cloud.",
        icon: BrainCircuit,
        color: "text-pink-500",
        bgColor: "bg-pink-500/10",
        href: "/image",
        comingSoon: true,
        hidden: true,
    },
    {
        label: "LexAI",
        description: "AI assistant for legal research, contract analysis, and document workflows.",
        icon: Scale,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        href: "/lexai",
        comingSoon: false,
    },
]

const DashboardPage = () => {
    const router = useRouter();

    return (
        <div>
            <div className="mb-8 space-y-4">
                <h2 className="text-2xl md:text-4xl font-bold text-center">
                    Welcome to lumin.ai
                </h2>
                <p className="text-muted-foreground text-center font-light text-sm md:text-lg">
                    AI-powered research tools for finance, data, and beyond.
                </p>
            </div>
            <div className="px-4 md:px-20 lg:px-32 space-y-4">
                {tools.filter(t => !t.hidden).map((tool) => (
                    <Card
                        key={tool.href}
                        onClick={() => !tool.comingSoon && router.push(tool.href)}
                        className={cn(
                            "p-4 border-black/5 flex items-center justify-between transition",
                            tool.comingSoon
                                ? "opacity-60 cursor-not-allowed"
                                : "hover:shadow-md cursor-pointer group"
                        )}
                    >
                        <div className="flex items-center gap-x-4">
                            <div className={cn("p-2 w-fit rounded-md", tool.bgColor, tool.comingSoon && "opacity-50")}>
                                <tool.icon className={cn("w-8 h-8", tool.color)} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">{tool.label}</span>
                                    {tool.comingSoon && (
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                            Coming Soon
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-muted-foreground">{tool.description}</div>
                            </div>
                        </div>
                        {!tool.comingSoon && (
                            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
}

export default DashboardPage;
