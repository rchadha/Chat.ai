"use client"

import Link from "next/link";
import { DatabaseIcon, ImageIcon, LayoutDashboard, MessageSquare, SettingsIcon, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const routes = [
    {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: '/dashboard',
        color: "text-sky-500"
    },
    {
        label: "Chat with your data",
        icon: MessageSquare,
        href: '/conversation',
        color: "text-violet-500"
    },
    {
        label: "Conversation using Local LLM",
        icon: ImageIcon,
        href: '/image',
        color: "text-pink-700"
    },
    {
        label: "Chat with your Financial Data",
        icon: DatabaseIcon,
        href: '/sqlconversation',
        color: "text-orange-700"
    },
    {
        label: "Settings",
        icon: SettingsIcon,
        href: '/settings',
    }
]

const UsageCounter = () => {
    const [used, setUsed] = useState<number | null>(null);
    const limit = 5;

    useEffect(() => {
        fetch("/api/usage")
            .then((r) => r.json())
            .then((data) => setUsed(data.used))
            .catch(() => {});

        const handler = (e: CustomEvent<{ used: number }>) => setUsed(e.detail.used);
        window.addEventListener("usage-updated", handler as EventListener);
        return () => window.removeEventListener("usage-updated", handler as EventListener);
    }, []);

    if (used === null) return null;

    const remaining = limit - used;
    const pct = (used / limit) * 100;
    const isExhausted = used >= limit;

    return (
        <div className="px-3 py-4 border-t border-white/10">
            <div className="bg-white/5 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                        <Zap size={13} className={isExhausted ? "text-red-400" : "text-violet-400"} />
                        <span>Free queries</span>
                    </div>
                    <span className={cn(
                        "font-semibold tabular-nums",
                        isExhausted ? "text-red-400" : "text-white"
                    )}>
                        {used}/{limit}
                    </span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all",
                            isExhausted ? "bg-red-500" : pct >= 80 ? "bg-amber-400" : "bg-violet-500"
                        )}
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <p className="text-[11px] text-zinc-500">
                    {isExhausted
                        ? "No queries remaining"
                        : `${remaining} query${remaining !== 1 ? "ies" : "y"} remaining`}
                </p>
            </div>
        </div>
    );
};

const Sidebar = () => {
    const pathname = usePathname();
    return (
        <div className="flex flex-col h-full bg-[#111827] text-white">
            <div className="px-3 py-4 flex-1">
                <Link href="/dashboard" className="flex items-center pl-3 mb-14">
                    <span className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-orange-500 to-pink-600 text-transparent bg-clip-text">
                        Chat.ai
                    </span>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            href={route.href}
                            key={route.href}
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                                pathname === route.href ? "text-white bg-white/10" : "text-zinc-400"
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
            <UsageCounter />
        </div>
    );
}

export default Sidebar;
