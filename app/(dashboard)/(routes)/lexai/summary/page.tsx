import { Scale } from "lucide-react";
import Heading from "@/components/heading";
import { SummaryView } from "@/components/lexai/summary-view";

interface Props {
    searchParams: Promise<{ session?: string }>;
}

const LexAISummaryPage = async ({ searchParams }: Props) => {
    const params = await searchParams;
    const sessionId = params.session ?? "";

    return (
        <div>
            <Heading
                title="LexAI — Intake Summary"
                description="Lawyer-ready summary generated from the intake conversation."
                icon={Scale}
                iconColor="text-amber-500"
                bgColor="bg-amber-500/10"
            />
            <SummaryView sessionId={sessionId} />
        </div>
    );
};

export default LexAISummaryPage;
