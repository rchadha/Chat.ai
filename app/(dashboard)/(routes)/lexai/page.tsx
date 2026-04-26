import Heading from "@/components/heading";
import { Scale } from "lucide-react";
import { LanguageSelector } from "@/components/lexai/language-selector";

const LexAIPage = () => {
    return (
        <div>
            <Heading
                title="LexAI"
                description="AI that handles client intake so you can focus on the law."
                icon={Scale}
                iconColor="text-amber-500"
                bgColor="bg-amber-500/10"
            />
            <LanguageSelector />
        </div>
    );
};

export default LexAIPage;
