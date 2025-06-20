// API 호출 함수들
export const extractLocationAPI = async (message: string) => {
  const response = await fetch('http://localhost:8000/location/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_message: message
    })
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API 요청 실패 (${response.status}): ${errorText}`)
  }
  
  const contentType = response.headers.get('Content-Type')
  if (!contentType || !contentType.includes('application/json')) {
    const responseText = await response.text()
    throw new Error(`JSON이 아닌 응답을 받았습니다: ${responseText.substring(0, 100)}...`)
  }
  
  return response.json()
}

export const recommendPlaceAPI = async (message: string, area_name:string, sigungu_name:string) => {
  const response = await fetch('http://localhost:8000/recommend/place', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_message: message, 
      area_name: area_name,
      sigungu_name: sigungu_name
    })
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API 요청 실패 (${response.status}): ${errorText}`)
  }
  
  const contentType = response.headers.get('Content-Type')
  if (!contentType || !contentType.includes('application/json')) {
    const responseText = await response.text()
    throw new Error(`JSON이 아닌 응답을 받았습니다: ${responseText.substring(0, 100)}...`)
  }
  
  return response.json()
}

export const recommendRouteAPI = async (message: string) => {
  const response = await fetch('http://localhost:8000/recommend/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_message: message
    })
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API 요청 실패 (${response.status}): ${errorText}`)
  }
  
  const contentType = response.headers.get('Content-Type')
  if (!contentType || !contentType.includes('application/json')) {
    const responseText = await response.text()
    throw new Error(`JSON이 아닌 응답을 받았습니다: ${responseText.substring(0, 100)}...`)
  }
  
  return response.json()
}

// 추가 유틸리티 함수들
export const getChatHistory = async (sessionId: string) => {
  const response = await fetch(`http://localhost:8000/chat/history/${sessionId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API 요청 실패 (${response.status}): ${errorText}`)
  }
  
  const contentType = response.headers.get('Content-Type')
  if (!contentType || !contentType.includes('application/json')) {
    const responseText = await response.text()
    throw new Error(`JSON이 아닌 응답을 받았습니다: ${responseText.substring(0, 100)}...`)
  }
  
  return response.json()
}

export const clearSession = async (sessionId: string) => {
  const response = await fetch(`http://localhost:8000/chat/clear/${sessionId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API 요청 실패 (${response.status}): ${errorText}`)
  }
  
  const contentType = response.headers.get('Content-Type')
  if (!contentType || !contentType.includes('application/json')) {
    const responseText = await response.text()
    throw new Error(`JSON이 아닌 응답을 받았습니다: ${responseText.substring(0, 100)}...`)
  }
  
  return response.json()
}

// TypeScript 타입 정의 (선택사항)
export interface LocationExtractResponse {
  area?: string
  sigungu?: string
  raw_response?: string
  message?: string
  warning?: string
  error?: string
}

export interface RecommendedPlace {
  title: string
  overview: string
  address: string
}

export interface RecommendPlaceResponse {
  recommended_places?: RecommendedPlace[]
  chat_reply?: string
  message?: string
  error?: string
}

export interface RecommendRouteResponse {
  route_recommendation?: string
  error?: string
}

export interface ChatHistoryResponse {
  history?: any[]
  error?: string
}
