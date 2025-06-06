"use client"
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
// left at 1:12:26
import { UserButton } from "@clerk/nextjs";
import { ArrowRight, Code, DatabaseIcon, ImageIcon, MessageSquare, Music, VideoIcon } from "lucide-react";
import { useRouter } from "next/navigation";

const tools = [
  {
    label: "Conversation w/ OpenAI",
    icon: MessageSquare,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
    href: "/conversation"
  },
  {
    label: "Conversation w/ Local LLM",
    icon: ImageIcon,
    color: "text-pink-700",
    bgColor: "bg-pink-700/10",
    href: "/image"
  },
  {
    label: "Chat with SQL",
    icon: DatabaseIcon,
    color: "text-green-700",
    bgColor: "bg-green-700/10",
    href: "/sqlconversation"
  }

]

const DashboardPage = () =>  {
  const router = useRouter();

  return (
    <div>
      <div className="mb-8 space-y-4">
        <h2 className="text-2xl md:text-4xl font-bold text-center">
          Explore the power of AI
        </h2>
        <p className="text-muted-foreground text-center font-light text-sm md:text-lg">
          Chat with the smartest AI - Experience the power of AI
        </p>
      </div>
      <div className="px-4 md:px-20 lg:px-32 space-y-4">
        {tools.map((tool) => (
          <Card 
          onClick={() => router.push(tool.href)}
            key={tool.href}
            className=" p-4 border-black/5 flex items-center justify-between hover:shadow-md transition cursor-pointer"
          >
            <div className="flex items-center gap-x-4">
              <div className={cn("p-2 w-fit rounded-md", tool.bgColor)}>
                <tool.icon className={cn("w-8 h-8", tool.color)} />
              </div>
              <div className="font-semibold">{tool.label}</div>
            </div>
            <ArrowRight className="w-5 h-5" />

          </Card>

        ))}

      </div>
    </div>
    
  )
}

export default DashboardPage;
