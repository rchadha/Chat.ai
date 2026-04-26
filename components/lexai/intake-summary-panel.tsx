"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntakeData } from "@/lib/lexai/types";

interface IntakeSummaryPanelProps {
    data: IntakeData;
    onFinish: () => void;
    isFinishing?: boolean;
}

// Count how many core fields are filled
function countFilledFields(data: IntakeData): number {
    const fields: (keyof IntakeData)[] = [
        "legalName", "dateOfBirth", "placeOfBirth", "citizenships",
        "currentAddressCanada", "arrivalDateCanada", "familyMembers",
        "educationHistory", "employmentHistory", "addressHistory",
        "travelHistory", "languagesSpoken",
    ];
    return fields.filter((k) => {
        const v = data[k];
        if (v === null || v === undefined) return false;
        if (Array.isArray(v)) return v.length > 0;
        return true;
    }).length;
}

function FieldRow({ label, value }: { label: string; value: unknown }) {
    const isEmpty = value === null || value === undefined ||
        (Array.isArray(value) && value.length === 0);

    const display = (() => {
        if (isEmpty) return null;
        if (typeof value === "string") return value;
        if (Array.isArray(value)) {
            if (value.length === 0) return null;
            if (typeof value[0] === "string") return (value as string[]).join(", ");
            return `${value.length} entr${value.length === 1 ? "y" : "ies"} collected`;
        }
        return String(value);
    })();

    return (
        <div className={cn(
            "rounded-lg border px-3 py-2 transition-colors",
            isEmpty ? "border-dashed border-border" : "border-amber-200 bg-amber-50/50"
        )}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                {label}
            </p>
            <p className={cn(
                "text-xs mt-0.5 leading-snug",
                isEmpty ? "text-muted-foreground/40" : "text-foreground font-medium"
            )}>
                {isEmpty ? "— not yet collected —" : display}
            </p>
        </div>
    );
}

const FIELDS: { label: string; key: keyof IntakeData }[] = [
    { label: "Legal name", key: "legalName" },
    { label: "Other names", key: "otherNames" },
    { label: "Date of birth", key: "dateOfBirth" },
    { label: "Place of birth", key: "placeOfBirth" },
    { label: "Citizenship(s)", key: "citizenships" },
    { label: "Current address (Canada)", key: "currentAddressCanada" },
    { label: "Arrival in Canada", key: "arrivalDateCanada" },
    { label: "Family members", key: "familyMembers" },
    { label: "Education", key: "educationHistory" },
    { label: "Employment", key: "employmentHistory" },
    { label: "Address history", key: "addressHistory" },
    { label: "Travel history", key: "travelHistory" },
    { label: "Languages spoken", key: "languagesSpoken" },
];

export const IntakeSummaryPanel = ({ data, onFinish, isFinishing = false }: IntakeSummaryPanelProps) => {
    const filled = countFilledFields(data);
    const total = 12;
    const showFinish = filled >= 5;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Live summary
                    </p>
                    <span className={cn(
                        "text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums",
                        filled === 0
                            ? "bg-muted text-muted-foreground"
                            : filled >= 8
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                    )}>
                        {filled}/{total} fields
                    </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-500",
                            filled >= 8 ? "bg-green-500" : "bg-amber-400"
                        )}
                        style={{ width: `${(filled / total) * 100}%` }}
                    />
                </div>
            </div>

            {/* Fields */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {FIELDS.map(({ label, key }) => (
                    <FieldRow key={key} label={label} value={data[key]} />
                ))}

                {/* Lawyer notes */}
                {data.notesForLawyer.length > 0 && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 mt-3">
                        <p className="text-[10px] font-semibold text-orange-700 uppercase tracking-wide mb-1">
                            Notes for lawyer
                        </p>
                        <ul className="space-y-0.5">
                            {data.notesForLawyer.map((note, i) => (
                                <li key={i} className="text-xs text-orange-800 leading-snug">
                                    · {note}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Finish button */}
            {showFinish && (
                <div className="px-5 pb-5 pt-3 border-t">
                    <button
                        onClick={onFinish}
                        disabled={isFinishing}
                        className="w-full py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isFinishing
                            ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                            : "Finish intake →"}
                    </button>
                    <p className="text-[11px] text-muted-foreground text-center mt-2">
                        {total - filled} field{total - filled !== 1 ? "s" : ""} still uncollected
                    </p>
                </div>
            )}
        </div>
    );
};
