import { NextResponse } from "next/server";

export async function GET() {
    try {
        const backendUrl = process.env.BACKEND_RAG_API_URL || "http://127.0.0.1:3001";
        const response = await fetch(`${backendUrl}/status`, {
            next: { revalidate: 300 }, // cache for 5 minutes on the server
        });
        const data = await response.json();
        return NextResponse.json(data);
    } catch {
        return new NextResponse("Unavailable", { status: 503 });
    }
}
