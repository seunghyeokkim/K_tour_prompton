'use client'

import { useState } from "react"
import { Sparkles, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function AIChatbotInterface() {
  const [input, setInput] = useState("")

  const handleSend = () => {
    if (!input.trim()) return
    console.log("🚀 전송된 메시지:", input)
    setInput("")
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
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <p className="text-[#160211] font-medium">What can I ask you to do?</p>
            </div>
            <div className="bg-gradient-to-br from-[#ff86e1]/30 to-[#89bcff]/20 backdrop-blur-sm rounded-2xl p-6 border border-[#ff86e1]/30 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <p className="text-[#160211] font-medium">Which one of my projects is performing the best?</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <p className="text-[#160211] font-medium">What projects should I be concerned about right now?</p>
            </div>
          </div>
        </div>

        {/* Input section */}
        <div className="w-full max-w-3xl mx-auto">
          <div className="relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask me anything about your projects"
              className="w-full h-14 pl-6 pr-14 text-lg bg-white/80 backdrop-blur-sm border-2 border-[#ff86e1]/20 rounded-2xl focus:border-[#ff86e1]/40 focus:ring-0 placeholder:text-[#56637e] text-[#160211]"
            />
            <Button
              onClick={handleSend}
              size="icon"
              className="absolute right-2 top-2 h-10 w-10 bg-[#456288] hover:bg-[#56637e] rounded-xl"
            >
              <Send className="w-5 h-5 text-white" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
