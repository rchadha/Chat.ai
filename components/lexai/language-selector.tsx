"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SUPPORTED_LANGUAGES, DISCLOSURE } from "@/lib/lexai/constants";
import type { SupportedLanguage } from "@/lib/lexai/types";

const BEGIN_LABEL: Record<SupportedLanguage, string> = {
    en: "Begin intake",
    hi: "शुरू करें",
};

export const LanguageSelector = () => {
    const [selected, setSelected] = useState<SupportedLanguage>("en");
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
            <div className="w-full max-w-md space-y-8">

                {/* Language picker */}
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 text-center">
                        Select your language / अपनी भाषा चुनें
                    </p>
                    <div className="flex gap-3 justify-center">
                        {SUPPORTED_LANGUAGES.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => setSelected(lang.code)}
                                className={cn(
                                    "px-6 py-3 rounded-xl border-2 text-sm font-medium transition-all",
                                    selected === lang.code
                                        ? "border-amber-500 bg-amber-500/10 text-amber-700"
                                        : "border-border text-muted-foreground hover:border-amber-300 hover:text-foreground"
                                )}
                            >
                                <span className="block text-base font-semibold">{lang.nativeLabel}</span>
                                {lang.nativeLabel !== lang.label && (
                                    <span className="block text-xs text-muted-foreground">{lang.label}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Disclosure */}
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 leading-relaxed text-center">
                    {DISCLOSURE[selected]}
                </div>

                {/* Begin button */}
                <div className="flex justify-center">
                    <button
                        onClick={() => router.push(`/lexai/chat?lang=${selected}`)}
                        className="px-8 py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-colors"
                    >
                        {BEGIN_LABEL[selected]}
                    </button>
                </div>

            </div>
        </div>
    );
};
