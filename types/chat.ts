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
  location: {
    name: string
    address: string
    lat: number
    lng: number
  }
  content?: string
}

export type Message = TextMessage | MapMessage
