"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Sparkles, Send, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChatMessage } from "./components/chat-message"
import { searchLocation, isLocationQuery, extractLocationFromMessage } from "./utils/location-service"
import type { Message, TextMessage, MapMessage } from "./types/chat"

export default function AIChatbotInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showChat, setShowChat] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: TextMessage = {
      id: Date.now().toString(),
      type: "text",
      content: inputValue,
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = inputValue
    setInputValue("")
    setIsLoading(true)
    setShowChat(true)

    // 위치 관련 쿼리인지 확인
    if (isLocationQuery(currentInput)) {
      const locationQuery = extractLocationFromMessage(currentInput)
      const locationResult = await searchLocation(locationQuery)

      if (locationResult) {
        // 지도 메시지 생성
        const mapMessage: MapMessage = {
          id: (Date.now() + 1).toString(),
          type: "map",
          role: "assistant",
          location: locationResult,
          content: `${locationResult.name}의 위치를 찾았습니다.`,
          timestamp: new Date(),
        }

        setTimeout(() => {
          setMessages((prev) => [...prev, mapMessage])
          setIsLoading(false)
        }, 1000)
        return
      }
    }

    // 일반 AI 응답
    setTimeout(() => {
      const aiMessage: TextMessage = {
        id: (Date.now() + 1).toString(),
        type: "text",
        content:
          "안녕하세요! 프로젝트에 대해 궁금한 것이 있으시면 언제든 물어보세요. 위치를 찾고 싶으시면 '강남역 지도' 같은 형태로 말씀해 주세요!",
        role: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
      setIsLoading(false)
    }, 1000)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const resetChat = () => {
    setMessages([])
    setShowChat(false)
    setInputValue("")
  }

  if (showChat && messages.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#ff86e1]/20 via-[#89bcff]/10 to-white flex flex-col">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-white/50 p-4">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={resetChat} className="text-[#456288] hover:bg-[#ff86e1]/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#ff86e1] to-[#89bcff] rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-[#160211]">AI Assistant</h1>
                <p className="text-sm text-[#56637e]">프로젝트에 대해 무엇이든 물어보세요</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start mb-6">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-[#ff86e1] to-[#89bcff] rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#56637e] rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-[#56637e] rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-[#56637e] rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="bg-white/80 backdrop-blur-sm border-t border-white/50 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="메시지를 입력하세요..."
                className="w-full h-12 pl-4 pr-12 text-base bg-white/80 backdrop-blur-sm border-2 border-[#ff86e1]/20 rounded-xl focus:border-[#ff86e1]/40 focus:ring-0 placeholder:text-[#56637e] text-[#160211]"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="icon"
                className="absolute right-1 top-1 h-10 w-10 bg-[#456288] hover:bg-[#56637e] rounded-lg disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#ff86e1]/20 via-[#89bcff]/10 to-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl mx-auto space-y-12">
        {/* Header with sparkle icon */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <Sparkles className="w-12 h-12 text-[#160211]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-medium text-[#160211]">Ask our AI anything</h1>
        </div>

        {/* Suggestions section */}
        <div className="space-y-6">
          <h2 className="text-lg text-[#56637e] font-medium">Suggestions on what to ask Our AI</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Suggestion card 1 */}
            <div
              onClick={() => handleSuggestionClick("What can I ask you to do?")}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-105"
            >
              <p className="text-[#160211] font-medium">What can I ask you to do?</p>
            </div>

            {/* Suggestion card 2 - highlighted */}
            <div
              onClick={() => handleSuggestionClick("Which one of my projects is performing the best?")}
              className="bg-gradient-to-br from-[#ff86e1]/30 to-[#89bcff]/20 backdrop-blur-sm rounded-2xl p-6 border border-[#ff86e1]/30 shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-105"
            >
              <p className="text-[#160211] font-medium">Which one of my projects is performing the best?</p>
            </div>

            {/* Suggestion card 3 */}
            <div
              onClick={() => handleSuggestionClick("What projects should I be concerned about right now?")}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-105"
            >
              <p className="text-[#160211] font-medium">What projects should I be concerned about right now?</p>
            </div>
          </div>
        </div>

        {/* Input section */}
        <div className="w-full max-w-3xl mx-auto">
          <div className="relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your projects"
              className="w-full h-14 pl-6 pr-14 text-lg bg-white/80 backdrop-blur-sm border-2 border-[#ff86e1]/20 rounded-2xl focus:border-[#ff86e1]/40 focus:ring-0 placeholder:text-[#56637e] text-[#160211]"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              size="icon"
              className="absolute right-2 top-2 h-10 w-10 bg-[#456288] hover:bg-[#56637e] rounded-xl disabled:opacity-50"
            >
              <Send className="w-5 h-5 text-white" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
