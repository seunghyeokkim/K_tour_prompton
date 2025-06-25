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

export const recommendPlaceAPI = async (message: string, area_name:string = "", sigungu_name:string = "") => {
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

// 이미지 대화 API 함수
export const imageChatAPI = async (message: string, imageUrl: string) => {
  const response = await fetch('http://localhost:8000/chat/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_message: message,
      image_url: imageUrl
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

// 파일을 Base64로 변환하는 유틸리티 함수
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

// 이미지 URL 유효성 검증 함수
export const validateImageUrl = (url: string): boolean => {
  const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
  const validSchemes = ['http://', 'https://', 'data:image/']
  
  // URL 스키마 확인
  if (!validSchemes.some(scheme => url.startsWith(scheme))) {
    return false
  }
  
  // data URL인 경우 별도 검증
  if (url.startsWith('data:image/')) {
    return true
  }
  
  // 일반 URL인 경우 확장자 확인
  return validExtensions.some(ext => url.toLowerCase().endsWith(ext))
}

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

// 쓰레기 봉투 평가 API 함수
export const evaluateTrashbagAPI = async (prompt: string, imageBase64: string) => {
  const response = await fetch('http://localhost:8000/evaluate/trashbag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, image_base64: imageBase64 })
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
// 쓰레기통 위치 RAG API 함수
export const getTrashRAGAPI = async (area_name: string, sigungu_name: string) => {
  const response = await fetch('http://localhost:8000/location/trashRAG', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      area_name,
      sigungu_name
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
  recommended_route?: any[]
}

export interface RecommendRouteResponse {
  route_recommendation?: string
  error?: string
}

export interface ChatHistoryResponse {
  history?: any[]
  error?: string
}

export interface ImageChatRequest {
  user_message: string
  image_url: string
}

export interface ImageChatResponse {
  chat_reply?: string
  conversation_length?: number
  image_processed?: boolean
  success: boolean
  error?: string
  raw_response?: string
}
export interface TrashLocation {
  name: string
  lat: number
  lng: number
  address: string
}

export interface TrashRAGResponse {
  area: string
  sigungu: string
  trash_locations: TrashLocation[]
  count: number
  conversation_length: number
  success: boolean
  message?: string
  warning?: string
  error?: string
}