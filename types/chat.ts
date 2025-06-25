export interface BaseMessage {
  id: string
  role: "user" | "assistant"
  timestamp: Date
}

export interface TextMessage extends BaseMessage {
  type: "text"
  content: string
}

export interface MapMessage extends BaseMessage {
  type: "map"
  route: {
    title: string
    address: string
    mapx: number
    mapy: number
  }[],
  location: {
    name: string
    address: string
    lat: number
    lng: number
  }
  content?: string
}

export interface ImageMessage extends BaseMessage {
  type: "image"
  imageUrl: string
  content?: string // 이미지에 대한 설명 등
}

export interface UploadMessage extends BaseMessage {
  type: "upload"
  content: string // 안내 문구
}

export type Message = TextMessage | MapMessage | ImageMessage | UploadMessage
