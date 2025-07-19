import { User, Bot, MapPin } from "lucide-react"
import type { Message } from "../types/chat"
import { TrashMap, RouteMap } from "./naver-map"  // ← NaverMap 컴포넌트 import 추가
import TrashImageUpload from "./TrashImageUpload"


interface ChatMessageProps {
  message: Message
  onUpload?: (file: File, previewUrl: string) => void
}

export function ChatMessage({ message, onUpload }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} mb-6`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-[#ff86e1] to-[#89bcff] rounded-full flex items-center justify-center">
          {message.type === "map" ? <MapPin className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
        </div>
      )}

      <div
          className={`${
            message.type === "map" ? "max-w-full" : "max-w-[70%]"
          } ${isUser ? "order-first" : ""}`}
        >
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
            <div className="p-2">
              {/* 경로가 있으면 RouteMap 사용 */}
              {message.route && message.route.length > 0 && (
                <RouteMap 
                  route={message.route}
                  location={message.location}
                  pathOptions={{
                    width: 6,
                    color: '#ff86e1',
                    outlineColor: '#89bcff',
                    outlineWidth: 2,
                    patternInterval: 20
                  }}
                  width="600px" 
                  height="400px" 
                />
              )}
              
              {/* 쓰레기통 위치가 있으면 TrashMap 사용 */}
              {message.trash_location && message.trash_location.length > 0 && (
                <TrashMap 
                  trash_location={message.trash_location}
                  location={message.location}
                  width="600px" 
                  height="400px" 
                />
              )}
            </div>
          ) : message.type === "image" ? (
            <div className="p-2 flex flex-col items-center">
              <img
                src={message.imageUrl}
                alt={message.content || "업로드된 이미지"}
                className="max-w-xs max-h-80 rounded-lg border border-gray-200 shadow"
                style={{ objectFit: "contain" }}
              />
              {message.content && (
                <div className="mt-2 text-xs text-gray-500 text-center">{message.content}</div>
              )}
            </div>
          ) : message.type === "upload" ? (
            <div className="p-2 flex flex-col items-center">
              <div className="mb-2 text-base font-semibold text-[#160211]">{message.content}</div>
              {onUpload && (
                <TrashImageUpload onUpload={onUpload} />
              )}
            </div>
          ) : message.type === "reward" ? (
            <div className="p-4 flex flex-col items-center">
              <div className="text-2xl mb-2">{message.badge}</div>
              <div className="font-bold text-lg mb-1">{message.content}</div>
              <div className="text-[#456288] mb-2">
                전국 달성률: <b>{message.percent}%</b> ({message.uniqueAreaCount} / 17개 시·도)
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-gradient-to-r from-[#ff86e1] to-[#89bcff]" style={{ width: `${message.percent}%` }} />
              </div>
              <div className="text-xs text-[#56637e]">다른 시/도도 도전해보세요!</div>
            </div>
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
