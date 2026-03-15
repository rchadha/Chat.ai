# Server Component Approach Example

## Option 1: Server Actions + URL Search Params (Client State)

```tsx
// app/(dashboard)/(routes)/conversation/page.tsx (Server Component)
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Heading from "@/components/heading";
import { MessageSquare } from "lucide-react";
import { ConversationForm } from "./conversation-form";
import { getMessages } from "./actions";

export default async function ConversationPage({
  searchParams,
}: {
  searchParams: { messages?: string };
}) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  // Parse messages from URL search params (or fetch from database)
  const messages = searchParams.messages 
    ? JSON.parse(decodeURIComponent(searchParams.messages))
    : [];

  return (
    <div>
      <Heading 
        title="Chat with your data"  
        description="Chat with your data and get answers to your queries."
        icon={MessageSquare}
        iconColor="text-violet-500"
        bgColor="bg-violet-500/10"
      />
      <div className="px-4 lg:px-8">
        <ConversationForm initialMessages={messages} />
      </div>
    </div>
  );
}
```

```tsx
// app/(dashboard)/(routes)/conversation/conversation-form.tsx (Client Component)
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formSchema } from "./constants";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { submitMessage } from "./actions";
import { ChatCompletionRequestMessage } from "openai";
import Empty from "@/components/empty";
import { Loader } from "@/components/loader";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { BotAvatar } from "@/components/bot-avator";

interface ConversationFormProps {
  initialMessages: ChatCompletionRequestMessage[];
}

export function ConversationForm({ initialMessages }: ConversationFormProps) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [isPending, startTransition] = useTransition();
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { prompt: "" }
  });

  const onSubmit = async (values: { prompt: string }) => {
    const userMessage: ChatCompletionRequestMessage = {
      role: "user",
      content: values.prompt,
    };

    // Optimistically update UI
    setMessages((current) => [...current, userMessage]);
    form.reset();

    // Use Server Action
    startTransition(async () => {
      try {
        const botMessage = await submitMessage([...messages, userMessage]);
        setMessages((current) => [...current, botMessage]);
        
        // Update URL with messages (optional, for shareable URLs)
        const messagesParam = encodeURIComponent(
          JSON.stringify([...messages, userMessage, botMessage])
        );
        router.push(`/conversation?messages=${messagesParam}`);
      } catch (error) {
        console.error(error);
        // Remove optimistic update on error
        setMessages(messages);
      }
    });
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="rounded-lg border w-full p-4 px-3 md:px-6 focus-within:shadow-sm grid grid-cols-12 gap-2"
        >
          <FormField 
            name="prompt"
            render={({ field }) => (
              <FormItem className="col-span-12 lg:col-span-10">
                <FormControl className="m-0 p-0">
                  <Input
                    className="border-0 outline-none focus-visible:ring-0 focus-visible:ring-transparent"
                    disabled={isPending}
                    placeholder="Chat with your own data"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <Button className="col-span-12 lg:col-span-2 w-full" disabled={isPending}>
            Generate
          </Button>
        </form>
      </Form>
      <div className="space-y-4 mt-4">
        {isPending && (
          <div className="p-8 rounded-lg w-full flex items-center justify-center bg-muted">
            <Loader />
          </div>
        )}
        {messages.length === 0 && !isPending && (
          <div>
            <Empty label="No conversation started." />
          </div>
        )}
        <div className="flex flex-col-reverse gap-y-4">
          {messages.map((message, index) => (
            <div 
              key={index}
              className={cn(
                "p-8 w-full flex items-start gap-x-8 rounded-lg",
                message.role === "user" ? "bg-white-border border-black/10" : "bg-muted"
              )}
            >
              {message.role === "user" ? <UserAvatar /> : <BotAvatar />}    
              <p className="text-sm">{message.content}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
```

```tsx
// app/(dashboard)/(routes)/conversation/actions.ts (Server Actions)
"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ChatCompletionRequestMessage } from "openai";

export async function submitMessage(
  messages: ChatCompletionRequestMessage[]
): Promise<ChatCompletionRequestMessage> {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  // Call your API route internally or make the API call directly here
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/conversation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error("Failed to get response");
  }

  const data = await response.json();
  
  return {
    role: "assistant",
    content: data.response,
  };
}
```

## Option 2: Database Storage (Persistent State)

```tsx
// Store messages in database, fetch on page load
// app/(dashboard)/(routes)/conversation/page.tsx (Server Component)
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getConversationMessages } from "@/lib/db";
import { ConversationForm } from "./conversation-form";

export default async function ConversationPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  // Fetch messages from database
  const messages = await getConversationMessages(userId);

  return (
    <div>
      <Heading {...headingProps} />
      <ConversationForm initialMessages={messages} />
    </div>
  );
}
```

## Key Differences:

1. **Server Component (page.tsx)**: 
   - Fetches initial data
   - Handles authentication
   - No client-side JavaScript

2. **Client Component (conversation-form.tsx)**: 
   - Handles user interactions
   - Manages form state
   - Uses Server Actions for mutations

3. **Server Actions (actions.ts)**: 
   - Run on the server
   - Can be called from Client Components
   - Handle API calls and data mutations

## Trade-offs:

**Server Component Approach:**
- ✅ Better SEO (initial render on server)
- ✅ Smaller client bundle (less JavaScript)
- ✅ Faster initial page load
- ❌ More complex architecture
- ❌ State management is trickier (URL params or database)
- ❌ Less reactive UI (requires page refresh or router.push)

**Current Client Component Approach:**
- ✅ Simpler architecture
- ✅ Real-time, reactive UI
- ✅ Easy state management
- ❌ Larger client bundle
- ❌ All JavaScript sent to client
- ❌ Slower initial load

