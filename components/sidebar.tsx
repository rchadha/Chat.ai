"use client"

import Link from "next/link";
import Image from "next/image";
import { DatabaseIcon, ImageIcon, LayoutDashboard, MessageSquare, SettingsIcon, VideoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {  usePathname } from "next/navigation";

const routes = [
    {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: '/dashboard',
        color: "text-sky-500"
    },
    {
        label: "Conversation w/ OpenAI",
        icon: MessageSquare,
        href: '/conversation',
        color: "text-violet-500"
    },
    {
        label: "Conversation w/ Local LLM",
        icon: ImageIcon,
        href: '/image',
        color: "text-pink-700"
    },
    {
        label: "Chat with SQL",
        icon: DatabaseIcon,
        href: '/video',
        color: "text-orange-700"
    },
    {
        label: "Settings",
        icon: SettingsIcon,
        href: '/settings',
        
    }
]

const Sidebar = () => {
    const pathname = usePathname();
    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-[#111827] text-white">
            <div className="px-3 py-2 flex-1">
                <Link href="/dashboard" className="flex items-center pl-3 mb-14">
                    <div className="relative w-36 h-8 mr-4">
                        <Image 
                            fill
                            alt="Logo"
                            src="/Logo-NME.png"
                        />
                    </div>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            href={route.href}
                            key={route.href}
                            className={cn("text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
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
        </div>

    )
}
//Logo red color #ED3737
export default Sidebar;