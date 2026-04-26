"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntakeData, SummaryResult, TranscriptEntry, FamilyMember, EducationEntry, EmploymentEntry, AddressEntry, TravelEntry } from "@/lib/lexai/types";

interface SummaryViewProps {
    sessionId: string;
}

type SummaryResponse = SummaryResult & { intakeData: IntakeData };

// ── Field rendering helpers ────────────────────────────────────────────────────

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                {label}
            </p>
            <div className="text-sm text-foreground">{children}</div>
        </div>
    );
}

function renderScalar(v: string | string[] | null): React.ReactNode {
    if (v === null) return <span className="text-muted-foreground italic">Not collected</span>;
    if (Array.isArray(v)) return v.join(", ");
    return v;
}

function FamilyList({ members }: { members: FamilyMember[] }) {
    return (
        <div className="space-y-1.5">
            {members.map((m, i) => (
                <div key={i} className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-muted-foreground"> · {m.relationship}</span>
                    {m.dateOfBirth && <span className="text-muted-foreground"> · b. {m.dateOfBirth}</span>}
                    {m.currentLocation && <span className="text-muted-foreground"> · {m.currentLocation}</span>}
                </div>
            ))}
        </div>
    );
}

function EntryList({ items, render }: { items: object[]; render: (item: object, i: number) => React.ReactNode }) {
    return <div className="space-y-1.5">{items.map((item, i) => render(item, i))}</div>;
}

// ── Transcript row ─────────────────────────────────────────────────────────────

function TranscriptRow({ entry }: { entry: TranscriptEntry }) {
    const isTranslated = entry.original !== entry.english;
    return (
        <div className={cn(
            "flex gap-4 py-3 border-b last:border-0",
            entry.role === "user" ? "flex-row-reverse" : "flex-row"
        )}>
            <div className="shrink-0 w-16 text-[11px] font-semibold text-muted-foreground text-right pt-0.5">
                {entry.role === "user" ? "Client" : "Assistant"}
            </div>
            <div className="flex-1 space-y-1">
                <p className="text-sm leading-relaxed">{entry.original}</p>
                {isTranslated && (
                    <p className="text-sm text-muted-foreground italic leading-relaxed border-l-2 border-amber-300 pl-3">
                        {entry.english}
                    </p>
                )}
            </div>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────

export const SummaryView = ({ sessionId }: SummaryViewProps) => {
    const router = useRouter();
    const [data, setData] = useState<SummaryResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/lexai/summary?session=${sessionId}`)
            .then((r) => {
                if (r.status === 404) throw new Error("Session not found or expired. Please start a new intake.");
                if (!r.ok) throw new Error("Failed to generate summary. Please try again.");
                return r.json();
            })
            .then(setData)
            .catch((e: Error) => setError(e.message));
    }, [sessionId]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4 px-8 text-center">
                <p className="text-sm text-destructive">{error}</p>
                <button
                    onClick={() => router.push("/lexai")}
                    className="text-sm text-amber-600 hover:underline"
                >
                    Start a new intake
                </button>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                <p className="text-sm text-muted-foreground">Generating lawyer summary…</p>
                <p className="text-xs text-muted-foreground/60">This usually takes 10–20 seconds</p>
            </div>
        );
    }

    const { intakeData: d, summary, transcript } = data;

    return (
        <div className="max-w-4xl mx-auto px-4 lg:px-8 pb-16 print:px-0">

            {/* Toolbar — hidden on print */}
            <div className="flex items-center justify-between py-4 mb-6 print:hidden">
                <button
                    onClick={() => router.push("/lexai")}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft size={14} />
                    New intake
                </button>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
                >
                    <Printer size={14} />
                    Print / Save PDF
                </button>
            </div>

            {/* Title */}
            <div className="mb-8 pb-4 border-b">
                <h1 className="text-2xl font-bold">Intake Summary</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Generated by LexAI · {new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}
                </p>
                {d.notesForLawyer.length > 0 && (
                    <div className="mt-4 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 mb-1.5">
                            Lawyer notes — review before filing
                        </p>
                        <ul className="space-y-1">
                            {d.notesForLawyer.map((note, i) => (
                                <li key={i} className="text-sm text-orange-900">· {note}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Structured fields */}
            <section className="mb-10">
                <h2 className="text-base font-semibold mb-4">Collected Fields</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FieldBlock label="Legal name">{renderScalar(d.legalName)}</FieldBlock>
                    <FieldBlock label="Other names">{renderScalar(d.otherNames)}</FieldBlock>
                    <FieldBlock label="Date of birth">{renderScalar(d.dateOfBirth)}</FieldBlock>
                    <FieldBlock label="Place of birth">{renderScalar(d.placeOfBirth)}</FieldBlock>
                    <FieldBlock label="Citizenship(s)">{renderScalar(d.citizenships)}</FieldBlock>
                    <FieldBlock label="Languages spoken">{renderScalar(d.languagesSpoken)}</FieldBlock>
                    <FieldBlock label="Current address (Canada)">{renderScalar(d.currentAddressCanada)}</FieldBlock>
                    <FieldBlock label="Arrival in Canada">{renderScalar(d.arrivalDateCanada)}</FieldBlock>
                </div>

                {d.familyMembers && d.familyMembers.length > 0 && (
                    <div className="mt-5">
                        <FieldBlock label="Family members">
                            <FamilyList members={d.familyMembers} />
                        </FieldBlock>
                    </div>
                )}

                {d.educationHistory && d.educationHistory.length > 0 && (
                    <div className="mt-5">
                        <FieldBlock label="Education history">
                            <EntryList
                                items={d.educationHistory}
                                render={(item, i) => {
                                    const e = item as EducationEntry;
                                    return (
                                        <div key={i} className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                                            <span className="font-medium">{e.institution}</span>
                                            <span className="text-muted-foreground"> · {e.location} · {e.years}</span>
                                            {e.credential && <span className="text-muted-foreground"> · {e.credential}</span>}
                                        </div>
                                    );
                                }}
                            />
                        </FieldBlock>
                    </div>
                )}

                {d.employmentHistory && d.employmentHistory.length > 0 && (
                    <div className="mt-5">
                        <FieldBlock label="Employment history">
                            <EntryList
                                items={d.employmentHistory}
                                render={(item, i) => {
                                    const e = item as EmploymentEntry;
                                    return (
                                        <div key={i} className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                                            <span className="font-medium">{e.role}</span>
                                            <span className="text-muted-foreground"> at {e.employer} · {e.location} · {e.years}</span>
                                        </div>
                                    );
                                }}
                            />
                        </FieldBlock>
                    </div>
                )}

                {d.addressHistory && d.addressHistory.length > 0 && (
                    <div className="mt-5">
                        <FieldBlock label="Address history (past 10 years)">
                            <EntryList
                                items={d.addressHistory}
                                render={(item, i) => {
                                    const e = item as AddressEntry;
                                    return (
                                        <div key={i} className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                                            <span className="font-medium">{e.address}</span>
                                            <span className="text-muted-foreground"> · {e.country} · {e.fromYear}–{e.toYear}</span>
                                        </div>
                                    );
                                }}
                            />
                        </FieldBlock>
                    </div>
                )}

                {d.travelHistory && d.travelHistory.length > 0 && (
                    <div className="mt-5">
                        <FieldBlock label="Travel history (past 10 years)">
                            <EntryList
                                items={d.travelHistory}
                                render={(item, i) => {
                                    const e = item as TravelEntry;
                                    return (
                                        <div key={i} className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                                            <span className="font-medium">{e.country}</span>
                                            <span className="text-muted-foreground"> · {e.dates}</span>
                                            {e.purpose && <span className="text-muted-foreground"> · {e.purpose}</span>}
                                        </div>
                                    );
                                }}
                            />
                        </FieldBlock>
                    </div>
                )}
            </section>

            {/* Prose summary */}
            <section className="mb-10">
                <h2 className="text-base font-semibold mb-4">Narrative Summary</h2>
                <div className="rounded-xl border bg-muted/20 px-5 py-5">
                    <p className="text-sm leading-relaxed whitespace-pre-line">{summary}</p>
                </div>
            </section>

            {/* Transcript */}
            <section>
                <h2 className="text-base font-semibold mb-1">Full Transcript</h2>
                <p className="text-xs text-muted-foreground mb-4">
                    Original language shown first. English translation shown below in italics where applicable.
                </p>
                <div className="rounded-xl border px-4">
                    {transcript.map((entry, i) => (
                        <TranscriptRow key={i} entry={entry} />
                    ))}
                </div>
            </section>
        </div>
    );
};
