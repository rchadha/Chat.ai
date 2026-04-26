import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Configuration, OpenAIApi } from "openai";
import { getChatSystemPrompt } from "@/lib/lexai/prompts";
import type { Message } from "@/lib/lexai/types";

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { messages }: { messages: Message[] } = await req.json();

        if (!messages || messages.length === 0) {
            return new NextResponse("Messages are required", { status: 400 });
        }

        const response = await openai.createChatCompletion({
            model: "gpt-4o",
            max_tokens: 1024,
            messages: [
                { role: "system", content: getChatSystemPrompt() },
                ...messages,
            ],
        });

        const text = response.data.choices[0].message?.content ?? "";

        return new Response(text, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });

    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[LEXAI_CHAT_ERROR]", msg);
        return new NextResponse(`Internal error: ${msg}`, { status: 500 });
    }
}
