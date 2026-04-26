import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/lexai/session-store";
import type { Message, IntakeData } from "@/lib/lexai/types";

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { messages, intakeData }: { messages: Message[]; intakeData: IntakeData } = await req.json();

        if (!messages || !intakeData) {
            return new NextResponse("Messages and intakeData are required", { status: 400 });
        }

        const sessionId = createSession(messages, intakeData);
        return NextResponse.json({ sessionId });

    } catch (error) {
        console.error("[LEXAI_SESSION_ERROR]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}
