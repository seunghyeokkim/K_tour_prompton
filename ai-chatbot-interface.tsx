"use client"

import { v4 as uuidv4 } from "uuid"
import React from "react"
import { useState, useRef, useEffect } from "react"
import { Sparkles, Send, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChatMessage } from "./components/chat-message"
import type { Message, TextMessage } from "./types/chat"
import {
  extractLocationAPI,
  recommendPlaceAPI,
  LocationExtractResponse,
  RecommendPlaceResponse,
  imageChatAPI,
  evaluateTrashbagAPI,
  getTrashRAGAPI
} from "./utils/api"
import TrashImageUpload from "./components/TrashImageUpload"
import KoreaSVGMap from './components/KoreaSVGMap'
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps"
import { geoCentroid } from "d3-geo"
import SouthKorea from '@svg-maps/south-korea/south-korea.svg'

export default function AIChatbotInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [recommended, setRecommended] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showChat, setShowChat] = useState(false)

  // 지역 정보 추적용 상태 (효율이 떨어질 수 있지만, 간단한 예시로 유지)
  const [lastArea, setLastArea] = useState("")
  const [lastSigungu, setLastSigungu] = useState("")

  // ✅ 시/도 단위 달성 상태
  const [completedAreas, setCompletedAreas] = useState<string[]>([])
  const TOTAL_AREAS = 17;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: TextMessage = {
      id: uuidv4(),
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

    try {
      if (!recommended) {
        // 장소 추천 요청
        const extractRes: LocationExtractResponse = await extractLocationAPI(currentInput);
        const { area, sigungu, message } = extractRes;

        if (area && sigungu) {
          setLastArea(area)
          setLastSigungu(sigungu)
          const recommendRes: RecommendPlaceResponse = await recommendPlaceAPI(
            `${area} ${sigungu} 플로깅 장소 추천`,
            area,
            sigungu
          );
          const placeContent = recommendRes.chat_reply || "추천 결과가 없습니다.";

          setMessages((prev) => [
            ...prev,
            {
              id: uuidv4(),
              type: "text",
              content: placeContent,
              role: "assistant",
              timestamp: new Date(),
            },
          ])
          setRecommended(true)
        } else {
          const content = message || "지역 정보를 인식하지 못했습니다.";
          setMessages((prev) => [
            ...prev,
            {
              id: uuidv4(),
              type: "text",
              content,
              role: "assistant",
              timestamp: new Date(),
            },
          ])
        }
      } else {
        // 경로 추천 + 지도 메시지 삽입
        const recommendRes: RecommendPlaceResponse = await recommendPlaceAPI(currentInput);
        const placeContent = recommendRes.chat_reply || "추천 결과가 없습니다.";
      
        // 2단계 응답 텍스트
        setMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            type: "text",
            content: placeContent,
            role: "assistant",
            timestamp: new Date(),
          },
        ]);
      
        // ✅ 3단계: 지도 삽입용 메시지
        if (recommendRes.recommended_route) {
          const parsedRoute = recommendRes.recommended_route.map((p: any) => ({
            title: p.title,
            address: p.address,
            mapx: parseFloat(p.mapx),
            mapy: parseFloat(p.mapy),
          }));
      
          // 지도용 메시지 (iframe 렌더링됨)
          setMessages((prev) => [
            ...prev,
            {
              id: uuidv4(),
              type: "map", // 👈 ChatMessage에서 iframe으로 처리됨
              role: "assistant",
              timestamp: new Date(),
              route: parsedRoute,
              location: {
                name: "서울특별시청",
                address: "서울 중구 세종대로 110",
                lat: 37.5665,
                lng: 126.9780
              }
            },
            {
              id: uuidv4(),
              type: "upload",
              role: "assistant",
              timestamp: new Date(),
              content: "플로깅 완료 시 수거한 쓰레기 이미지를 업로드해주세요!"
            }
          ]);
        }
      
        setRecommended(false);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          type: "text",
          content: "서버와 통신 중 오류가 발생했습니다.",
          role: "assistant",
          timestamp: new Date(),
        },
      ])
    }
    setIsLoading(false)
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
    setRecommended(false)
  }

  // 평가 API 호출 함수 추가
  async function evaluateTrashbag(prompt: string, imageBase64: string) {
    return await evaluateTrashbagAPI(prompt, imageBase64)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#ff86e1]/20 via-[#89bcff]/10 to-white flex flex-col">
      {showChat && messages.length > 0 ? (
        <>
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

          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-4xl mx-auto">
              {messages.map((message) => (
                <React.Fragment key={message.id}>
                  {message.type === "reward" && (
                    <div className="flex justify-center my-4">
                      <KoreaSVGMap completedAreas={completedAreas} />
                    </div>
                  )}
                  <ChatMessage
                    message={message}
                    onUpload={
                      message.type === "upload"
                        ? async (file: File, previewUrl: string) => {
                            setMessages((prev) => [
                              ...prev,
                              {
                                id: uuidv4(),
                                type: "image",
                                imageUrl: previewUrl,
                                role: "user",
                                timestamp: new Date(),
                                content: "사용자 업로드 이미지",
                              },
                            ])

                            const evalMsgId = uuidv4()
                            setMessages((prev) => [
                              ...prev,
                              {
                                id: evalMsgId,
                                type: "text",
                                content: "쓰레기 확인 중...",
                                role: "assistant",
                                timestamp: new Date(),
                              },
                            ])

                            try {
                              const prompt = "다음이 유저가 주는 쓰레기 봉투 이미지이다. 이 이미지를 보고 플로깅 성과를 평가해줘."
                              const result = await evaluateTrashbag(prompt, previewUrl)

                              // 1. 평가 결과 예쁘게 파싱
                              let evalContent = result.result || "평가 결과를 받아오지 못했습니다.";
                              try {
                                const parsed = JSON.parse(evalContent);
                                evalContent = `점수: ${parsed.score}\n요약: ${parsed.summary}\n피드백: ${parsed.feedback}`;
                              } catch (e) {}

                              // 2. 쓰레기통 안내/리워드 메시지 한 번에 추가
                              const ragResult = await getTrashRAGAPI(lastArea, lastSigungu);
                              let newMessages: Message[] = [];

                              // 쓰레기통 지도를 가장 먼저 추가 (정보가 있을 때만)
                              if (ragResult.success && ragResult.trash_locations?.length > 0) {
                                newMessages.push({
                                  id: uuidv4(),
                                  type: "map",
                                  role: "assistant",
                                  timestamp: new Date(),
                                  location: {
                                    name: ragResult.area + " " + ragResult.sigungu,
                                    address: ragResult.trash_locations[0].address,
                                    lat: ragResult.trash_locations[0].lat,
                                    lng: ragResult.trash_locations[0].lng,
                                  },
                                  trash_location: ragResult.trash_locations.map((t: any) => ({
                                    name: t.name,
                                    address: t.address,
                                    lng: t.lng,
                                    lat: t.lat,
                                  })),
                                });
                              }

                              // 평가 결과를 두 번째로 추가
                              newMessages.push({
                                id: uuidv4(),
                                type: "text",
                                content: evalContent,
                                role: "assistant",
                                timestamp: new Date(),
                              });

                              // 리워드 메시지를 마지막에 추가
                              let uniqueAreaCount = completedAreas.includes(lastArea) ? completedAreas.length : completedAreas.length + 1;
                              let percent = Math.round((uniqueAreaCount / TOTAL_AREAS) * 100);
                              let badge = "";
                              if (uniqueAreaCount >= 17) badge = "🌏 전국 정복자";
                              else if (uniqueAreaCount >= 10) badge = "🏅 플로깅 마스터";
                              else if (uniqueAreaCount >= 5) badge = "🥉 열정 플로거";
                              else if (uniqueAreaCount >= 1) badge = "🎉 첫 플로깅 달성";
                              newMessages.push({
                                id: uuidv4(),
                                type: "reward",
                                role: "assistant",
                                timestamp: new Date(),
                                content: `${lastArea} 플로깅 완료!`,
                                badge,
                                percent,
                                uniqueAreaCount,
                              });

                              // 메시지 한 번만 추가!
                              setMessages((prevMsg) => [...prevMsg, ...newMessages]);

                              // 완료 지역도 한 번만 갱신!
                              setCompletedAreas((prev) => {
                                if (lastArea && !prev.includes(lastArea)) {
                                  return [...prev, lastArea];
                                }
                                return prev;
                              });
                            } catch (e) {
                              setMessages((prev) =>
                                prev.map((m) =>
                                  m.id === evalMsgId
                                    ? { ...m, content: "평가 중 오류가 발생했습니다." }
                                    : m
                                )
                              )
                            }
                          }
                        : undefined
                    }
                  />
                </React.Fragment>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start mb-6">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-[#ff86e1] to-[#89bcff] rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-[#56637e] rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-[#56637e] rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2 h-2 bg-[#56637e] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

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
        </>
      ) : (
        <div className="w-full max-w-4xl mx-auto space-y-12 flex flex-col items-center justify-center p-6">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <Sparkles className="w-12 h-12 text-[#160211]" />
            </div>
            <h1 className="text-4xl md:text-5xl font-medium text-[#160211]">AI 플로깅 도우미에게 무엇이든 물어보세요</h1>
          </div>

          <div className="space-y-6">
            <h2 className="text-lg text-[#56637e] font-medium">AI에게 이런 걸 물어볼 수 있어요</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div onClick={() => handleSuggestionClick("내 주변 플로깅 명소 추천해줘")} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-105">
                <p className="text-[#160211] font-medium">내 주변 플로깅 명소 추천해줘</p>
              </div>
              <div onClick={() => handleSuggestionClick("서울 강남구에서 플로깅하기 좋은 코스 알려줘")} className="bg-gradient-to-br from-[#ff86e1]/30 to-[#89bcff]/20 backdrop-blur-sm rounded-2xl p-6 border border-[#ff86e1]/30 shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-105">
                <p className="text-[#160211] font-medium">서울 강남구에서 플로깅하기 좋은 코스 알려줘</p>
              </div>
              <div onClick={() => handleSuggestionClick("플로깅이 뭔지 설명해줘")} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-105">
                <p className="text-[#160211] font-medium">플로깅이 뭔지 설명해줘</p>
              </div>
            </div>
          </div>

          <div className="w-full max-w-3xl mx-auto">
            <div className="relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="플로깅, 명소, 코스 등 궁금한 것을 입력해보세요"
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
      )}
    </div>
  )
}
