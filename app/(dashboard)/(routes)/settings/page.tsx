"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Heading from "@/components/heading";
import { SettingsIcon, User, Zap, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const DATASET_OPTIONS = [
    { value: "news",     label: "News",            description: "Latest news articles" },
    { value: "social",   label: "Social Sentiment", description: "Reddit finance communities" },
    { value: "sec",      label: "SEC Filings",      description: "10-K, 10-Q filings" },
    { value: "earnings", label: "Earnings Calls",   description: "Earnings call transcripts" },
];

const PREF_KEY = "finchat_default_dataset";

const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <div className="border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 bg-muted/40 border-b">
            <Icon size={16} className="text-violet-500" />
            <h2 className="font-semibold text-sm">{title}</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
            {children}
        </div>
    </div>
);

const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
        <span className="text-sm text-muted-foreground w-36 shrink-0">{label}</span>
        <span className="text-sm font-medium">{value}</span>
    </div>
);

const SettingsPage = () => {
    const { user, isLoaded } = useUser();
    const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
    const [defaultDataset, setDefaultDataset] = useState("news");

    useEffect(() => {
        fetch("/api/usage")
            .then(r => r.json())
            .then(setUsage)
            .catch(() => {});

        const saved = localStorage.getItem(PREF_KEY);
        if (saved) setDefaultDataset(saved);
    }, []);

    const handleDatasetChange = (value: string) => {
        setDefaultDataset(value);
        localStorage.setItem(PREF_KEY, value);
    };

    const fullName = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "—" : "—";
    const email = user?.primaryEmailAddress?.emailAddress ?? "—";
    const joined = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : "—";

    return (
        <div>
            <Heading
                title="Settings"
                description="Manage your profile, usage, and preferences."
                icon={SettingsIcon}
                iconColor="text-violet-500"
                bgColor="bg-violet-500/10"
            />

            <div className="px-4 lg:px-8 space-y-6 pb-10">

                {/* Profile */}
                <Section title="Profile" icon={User}>
                    <div className="flex items-center gap-4 pb-2">
                        {isLoaded && user?.imageUrl && (
                            <img
                                src={user.imageUrl}
                                alt={fullName}
                                className="h-14 w-14 rounded-full object-cover"
                            />
                        )}
                        <div>
                            <p className="font-semibold">{fullName}</p>
                            <p className="text-sm text-muted-foreground">{email}</p>
                        </div>
                    </div>
                    <div className="space-y-3 pt-1 border-t">
                        <Field label="Full name" value={fullName} />
                        <Field label="Email" value={email} />
                        <Field label="Member since" value={joined} />
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">
                        Profile details are managed via your Clerk account.
                    </p>
                </Section>

                {/* Usage */}
                <Section title="Usage" icon={Zap}>
                    {usage ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Queries used</span>
                                <span className={cn(
                                    "font-semibold tabular-nums",
                                    usage.used >= usage.limit ? "text-red-500" : "text-foreground"
                                )}>
                                    {usage.used} / {usage.limit}
                                </span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all",
                                        usage.used >= usage.limit ? "bg-red-500"
                                            : (usage.used / usage.limit) >= 0.8 ? "bg-amber-400"
                                            : "bg-violet-500"
                                    )}
                                    style={{ width: `${Math.min((usage.used / usage.limit) * 100, 100)}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {usage.used >= usage.limit
                                    ? "You've reached your free query limit."
                                    : `${usage.limit - usage.used} ${usage.limit - usage.used === 1 ? "query" : "queries"} remaining on your free plan.`}
                            </p>
                        </div>
                    ) : (
                        <div className="h-8 bg-muted animate-pulse rounded-md" />
                    )}
                </Section>

                {/* Preferences */}
                <Section title="FinChat Preferences" icon={SlidersHorizontal}>
                    <div>
                        <p className="text-sm font-medium mb-1">Default dataset</p>
                        <p className="text-xs text-muted-foreground mb-3">
                            The dataset tab that opens by default when you launch FinChat.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {DATASET_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleDatasetChange(opt.value)}
                                    className={cn(
                                        "flex flex-col items-start px-4 py-3 rounded-lg border text-left transition-all",
                                        defaultDataset === opt.value
                                            ? "border-violet-500 bg-violet-500/5"
                                            : "border-border hover:border-violet-300"
                                    )}
                                >
                                    <span className={cn(
                                        "text-sm font-medium",
                                        defaultDataset === opt.value ? "text-violet-600" : ""
                                    )}>
                                        {opt.label}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{opt.description}</span>
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                            Preference saved locally in your browser.
                        </p>
                    </div>
                </Section>

            </div>
        </div>
    );
};

export default SettingsPage;
