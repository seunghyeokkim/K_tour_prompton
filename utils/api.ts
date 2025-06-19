// API 호출 함수들
export const sendToStartAPI = async (message: string, sessionId?: string) => {
  const response = await fetch('http://localhost:8000/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_message: message,
      session_id: sessionId 
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

export const sendToChatAPI = async (message: string, sessionId: string) => {
  const response = await fetch('http://localhost:8000/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_message: message,
      session_id: sessionId 
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

export const sendToRouteAPI = async (message: string, sessionId: string) => {
  const response = await fetch('http://localhost:8000/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_message: message,
      session_id: sessionId 
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

export const resetSession = async (sessionId: string) => {
  const response = await fetch('http://localhost:8000/reset_session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_message: "",
      session_id: sessionId 
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