import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const { text } = await req.json();
        if (!text) return new NextResponse("Text required", { status: 400 });

        const response = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "tts-1",
                input: text,
                voice: "nova",          // warm, natural voice; handles Hindi well
                response_format: "mp3",
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("[LEXAI_TTS_ERROR]", err);
            return new NextResponse("TTS failed", { status: 502 });
        }

        const audioBuffer = await response.arrayBuffer();
        return new Response(audioBuffer, {
            headers: { "Content-Type": "audio/mpeg" },
        });

    } catch (error) {
        console.error("[LEXAI_TTS_ERROR]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}
