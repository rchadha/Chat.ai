"use client"

import Link from "next/link";
import { BarChart2, BrainCircuit, DatabaseIcon, LayoutDashboard, MessageSquare, Scale, SettingsIcon, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const routes = [
    {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: '/dashboard',
        color: "text-sky-500",
        comingSoon: false,
    },
    {
        label: "FinChat",
        icon: BarChart2,
        href: '/conversation',
        color: "text-violet-500",
        comingSoon: false,
    },
    {
        label: "DataChat",
        icon: DatabaseIcon,
        href: '/sqlconversation',
        color: "text-orange-500",
        comingSoon: true,
    },
    {
        label: "LocalChat",
        icon: BrainCircuit,
        href: '/image',
        color: "text-pink-500",
        comingSoon: true,
    },
    {
        label: "LexAI",
        icon: Scale,
        href: '/lexai',
        color: "text-emerald-500",
        comingSoon: true,
    },
    {
        label: "Settings",
        icon: SettingsIcon,
        href: '/settings',
        comingSoon: false,
    }
]

const UsageCounter = () => {
    const [used, setUsed] = useState<number | null>(null);
    const [limit, setLimit] = useState<number>(50);

    useEffect(() => {
        fetch("/api/usage")
            .then((r) => r.json())
            .then((data) => {
                setUsed(data.used);
                setLimit(data.limit);
            })
            .catch(() => {});

        const handler = (e: CustomEvent<{ used: number; limit: number }>) => {
            setUsed(e.detail.used);
            if (e.detail.limit) setLimit(e.detail.limit);
        };
        window.addEventListener("usage-updated", handler as EventListener);
        return () => window.removeEventListener("usage-updated", handler as EventListener);
    }, []);

    if (used === null) return null;

    const remaining = limit - used;
    const pct = Math.min((used / limit) * 100, 100);
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
                        : `${remaining} ${remaining !== 1 ? "queries" : "query"} remaining`}
                </p>
            </div>
        </div>
    );
};

const Sidebar = () => {
    const pathname = usePathname();

    const mainRoutes = routes.filter(r => r.href !== '/settings');
    const settingsRoute = routes.find(r => r.href === '/settings')!;

    return (
        <div className="flex flex-col h-full bg-[#111827] text-white">
            <div className="px-3 py-4 flex-1">
                <Link href="/dashboard" className="flex items-center pl-3 mb-10">
                    <span className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 text-transparent bg-clip-text">
                        Lumin.ai
                    </span>
                </Link>

                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 pl-3 mb-2">Products</p>
                <div className="space-y-1 mb-6">
                    {mainRoutes.map((route) => (
                        route.comingSoon ? (
                            <div
                                key={route.href}
                                className="text-sm flex p-3 w-full justify-start font-medium rounded-lg opacity-60 cursor-not-allowed"
                            >
                                <div className="flex items-center flex-1 text-zinc-400">
                                    <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                    {route.label}
                                </div>
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">
                                    Soon
                                </span>
                            </div>
                        ) : (
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
                        )
                    ))}
                </div>

                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 pl-3 mb-2">General</p>
                <div className="space-y-1">
                    <Link
                        href={settingsRoute.href}
                        className={cn(
                            "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                            pathname === settingsRoute.href ? "text-white bg-white/10" : "text-zinc-400"
                        )}
                    >
                        <div className="flex items-center flex-1">
                            <settingsRoute.icon className="h-5 w-5 mr-3" />
                            {settingsRoute.label}
                        </div>
                    </Link>
                </div>
            </div>
            <UsageCounter />
        </div>
    );
}

export default Sidebar;
