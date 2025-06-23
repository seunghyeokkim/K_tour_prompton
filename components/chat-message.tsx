import { User, Bot, MapPin } from "lucide-react"
import type { Message } from "../types/chat"

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} mb-6`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-[#ff86e1] to-[#89bcff] rounded-full flex items-center justify-center">
          {message.type === "map" ? <MapPin className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
        </div>
      )}

      <div className={`max-w-[70%] ${isUser ? "order-first" : ""}`}>
        <div
          className={`rounded-2xl overflow-hidden ${
            isUser
              ? "bg-gradient-to-r from-[#ff86e1] to-[#89bcff] text-white ml-auto"
              : "bg-white/80 backdrop-blur-sm border border-white/50 text-[#160211]"
          }`}
        >
          {message.type === "text" ? (
            <div className="px-4 py-3">
              <p className="text-sm leading-relaxed" style={{ whiteSpace: "pre-line" }}>
                {message.content}
              </p>
            </div>
          ) : message.type === "map" ? (
            <iframe
              src={`/tmap-frame.html?route=${encodeURIComponent(JSON.stringify(message.route))}`}
              width="100%"
              height="300px"
              style={{ border: "none" }}
              title="Tmap"
            />
          ) : null}
        </div>

        <p className={`text-xs text-[#56637e] mt-1 ${isUser ? "text-right" : "text-left"}`}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-[#456288] rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  )
}
