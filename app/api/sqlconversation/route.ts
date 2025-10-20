import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
});

const openai= new OpenAIApi(configuration);

export async function POST(
    req: Request
) {
    try{
        const { userId } = await auth();
        const body = await req.json();
        const { messages } = body;

        if (!userId) {
            return new NextResponse("Unauthorized", {status: 401});
        }

        if (!configuration.apiKey) {
            return new NextResponse("Open AI key not configured", {status: 500});
        }

        if (!messages) {
            return new NextResponse("Messages are required", {status: 400});
        }

        const message = messages[messages.length - 1].content;

        // const response = await openai.createChatCompletion({
        //     model: "gpt-3.5-turbo",
        //     messages
        // });

        const response = await fetch("http://127.0.0.1:3002/query-sql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
        },
            body: JSON.stringify({ query: message })   
        });

        const data = await response.json();
        console.log("Data", data);

        return NextResponse.json(data);


    } catch(error) {
        console.log("[CONVERSATION_ERROR]", error);
        return new NextResponse("Internal error", { status: 500}); 
    }
}