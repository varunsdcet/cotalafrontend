import { Bot, User } from "lucide-react";

type Role = "user" | "assistant";

interface ChatMessageProps {
  role: Role;
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";
  const cleanedContent = content.replace(/\*\*(.*?)\*\*/g, "$1");

  return (
    <div className={`flex items-start gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-black flex items-center justify-center shrink-0 mt-1">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}

      <div
        className={
          isUser
            ? "max-w-[90%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap bg-[#e9d8ff] text-slate-900 border border-[#d8bcff]"
            : "max-w-[90%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap bg-white text-slate-800 border border-slate-200"
        }
      >
        {cleanedContent}
      </div>

      {isUser && (
        <div className="h-7 w-7 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center shrink-0 mt-1">
          <User className="h-4 w-4 text-slate-700" />
        </div>
      )}
    </div>
  );
}

