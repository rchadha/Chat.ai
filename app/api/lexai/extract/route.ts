import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Configuration, OpenAIApi } from "openai";
import { getExtractSystemPrompt } from "@/lib/lexai/prompts";
import { EMPTY_INTAKE_DATA } from "@/lib/lexai/types";
import type { Message, IntakeData } from "@/lib/lexai/types";

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
            return NextResponse.json(EMPTY_INTAKE_DATA);
        }

        const transcript = messages
            .map((m) => `${m.role === "user" ? "Client" : "Assistant"}: ${m.content}`)
            .join("\n\n");

        const response = await openai.createChatCompletion({
            model: "gpt-4o",
            max_tokens: 2048,
            // @ts-ignore — response_format not in v3 types but supported by the API
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: getExtractSystemPrompt() },
                {
                    role: "user",
                    content: `Here is the conversation so far:\n\n${transcript}\n\nExtract the intake fields as JSON.`,
                },
            ],
        });

        const raw = response.data.choices[0].message?.content ?? "";

        let parsed: IntakeData;
        try {
            parsed = JSON.parse(raw) as IntakeData;
        } catch {
            console.error("[LEXAI_EXTRACT] JSON parse failed:", raw.slice(0, 200));
            return NextResponse.json(EMPTY_INTAKE_DATA);
        }

        return NextResponse.json(parsed);

    } catch (error) {
        console.error("[LEXAI_EXTRACT_ERROR]", error instanceof Error ? error.message : error);
        return new NextResponse("Internal error", { status: 500 });
    }
}
