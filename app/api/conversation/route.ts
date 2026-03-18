import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { query, dataset } = body;

        if (!query) {
            return new NextResponse("Query is required", { status: 400 });
        }

        const backendUrl = process.env.BACKEND_RAG_API_URL || "http://127.0.0.1:3001";
        const response = await fetch(`${backendUrl}/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, dataset: dataset || "sec" }),
        });

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.log("[CONVERSATION_ERROR]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}
