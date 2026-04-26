import type { Message, IntakeData, SummaryResult } from './types';

type SessionData = {
    messages: Message[];
    intakeData: IntakeData;
    summary: SummaryResult | null;
    expiresAt: number;
};

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

// Survive Next.js hot reloads in development via a global
const g = global as typeof global & { __lexaiSessions?: Map<string, SessionData> };
if (!g.__lexaiSessions) {
    g.__lexaiSessions = new Map();
}
const store = g.__lexaiSessions;

export function createSession(messages: Message[], intakeData: IntakeData): string {
    const id = crypto.randomUUID();
    store.set(id, { messages, intakeData, summary: null, expiresAt: Date.now() + SESSION_TTL_MS });
    return id;
}

export function getSession(id: string): SessionData | null {
    const session = store.get(id);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
        store.delete(id);
        return null;
    }
    return session;
}

export function cacheSessionSummary(id: string, summary: SummaryResult): void {
    const session = store.get(id);
    if (session) session.summary = summary;
}
