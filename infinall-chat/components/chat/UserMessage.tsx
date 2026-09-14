"use client";

import { Message } from "@/components/workspace/SplitWorkspace";
import { User } from "lucide-react";

interface UserMessageProps {
  message: Message;
}

export default function UserMessage({ message }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed"
        style={{
          background: "var(--color-card)",
          color: "var(--color-text)",
          border: "1px solid var(--color-border)",
        }}
      >
        {message.content}
      </div>
    </div>
  );
}
