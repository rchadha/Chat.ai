import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userUsage, queryLog } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const QUERY_LIMIT = 50;

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

        // Check usage
        const [usage] = await db
            .select()
            .from(userUsage)
            .where(eq(userUsage.userId, userId));

        const currentCount = usage?.queryCount ?? 0;

        if (currentCount >= QUERY_LIMIT) {
            return NextResponse.json(
                { error: "limit_reached", used: currentCount, limit: QUERY_LIMIT },
                { status: 429 }
            );
        }

        // Call backend
        const backendUrl = process.env.BACKEND_RAG_API_URL || "http://127.0.0.1:3001";
        const response = await fetch(`${backendUrl}/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, dataset: dataset || "sec" }),
        });

        const data = await response.json();

        // Increment usage and log the query in parallel
        await Promise.all([
            db
                .insert(userUsage)
                .values({ userId, queryCount: 1 })
                .onConflictDoUpdate({
                    target: userUsage.userId,
                    set: {
                        queryCount: currentCount + 1,
                        updatedAt: new Date(),
                    },
                }),
            db.insert(queryLog).values({
                userId,
                query,
                dataset: dataset || "sec",
            }),
        ]);

        return NextResponse.json({ ...data, used: currentCount + 1, limit: QUERY_LIMIT });

    } catch (error) {
        console.log("[CONVERSATION_ERROR]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}
