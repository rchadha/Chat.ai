import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Configuration, OpenAIApi } from "openai";
import { getSession, cacheSessionSummary } from "@/lib/lexai/session-store";
import { getSummarySystemPrompt } from "@/lib/lexai/prompts";
import { BEGIN_SIGNAL } from "@/lib/lexai/constants";
import type { SummaryResult } from "@/lib/lexai/types";

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get("session");
        if (!sessionId) {
            return new NextResponse("session param required", { status: 400 });
        }

        const session = getSession(sessionId);
        if (!session) {
            return new NextResponse("Session not found or expired", { status: 404 });
        }

        // Return cached summary if already generated
        if (session.summary) {
            return NextResponse.json({ intakeData: session.intakeData, ...session.summary });
        }

        const messages = session.messages.filter((m) => m.content !== BEGIN_SIGNAL);
        const transcriptText = messages
            .map((m) => `${m.role === "user" ? "Client" : "Assistant"}: ${m.content}`)
            .join("\n\n");

        const response = await openai.createChatCompletion({
            model: "gpt-4o",
            max_tokens: 4096,
            // @ts-ignore — response_format not in v3 types but supported by the API
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: getSummarySystemPrompt() },
                {
                    role: "user",
                    content: `STRUCTURED INTAKE DATA:\n${JSON.stringify(session.intakeData, null, 2)}\n\nCONVERSATION TRANSCRIPT:\n${transcriptText}\n\nGenerate the summary and translated transcript as specified.`,
                },
            ],
        });

        const raw = response.data.choices[0].message?.content ?? "";

        let parsed: SummaryResult;
        try {
            parsed = JSON.parse(raw) as SummaryResult;
        } catch {
            console.error("[LEXAI_SUMMARY] JSON parse failed:", raw.slice(0, 200));
            return new NextResponse("Summary generation failed", { status: 500 });
        }

        cacheSessionSummary(sessionId, parsed);

        return NextResponse.json({ intakeData: session.intakeData, ...parsed });

    } catch (error) {
        console.error("[LEXAI_SUMMARY_ERROR]", error instanceof Error ? error.message : error);
        return new NextResponse("Internal error", { status: 500 });
    }
}
