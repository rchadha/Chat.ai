import { Sparkles } from "lucide-react";

export const BotAvatar = () => {
    return (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 via-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
        </div>
    );
};
