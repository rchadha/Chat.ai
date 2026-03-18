import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userUsage } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { QUERY_LIMIT } from "../conversation/route";

export async function GET() {
    const { userId } = await auth();

    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const [usage] = await db
        .select()
        .from(userUsage)
        .where(eq(userUsage.userId, userId));

    const used = usage?.queryCount ?? 0;

    return NextResponse.json({ used, limit: QUERY_LIMIT });
}
