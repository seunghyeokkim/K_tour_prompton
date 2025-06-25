// 네이버 지도 API를 사용한 위치 검색 서비스
export interface LocationResult {
  name: string
  address: string
  lat: number
  lng: number
}

// 실제 구현에서는 네이버 지도 API의 Geocoding API를 사용해야 합니다
export async function searchLocation(query: string): Promise<LocationResult | null> {
  // 예시 데이터 - 실제로는 네이버 지도 API를 호출해야 합니다
  const mockLocations: { [key: string]: LocationResult } = {
    강남역: {
      name: "강남역",
      address: "서울특별시 강남구 강남대로 지하 396",
      lat: 37.4979,
      lng: 127.0276,
    },
    홍대: {
      name: "홍익대학교",
      address: "서울특별시 마포구 와우산로 94",
      lat: 37.5511,
      lng: 126.924,
    },
    명동: {
      name: "명동",
      address: "서울특별시 중구 명동길",
      lat: 37.5636,
      lng: 126.9834,
    },
    부산역: {
      name: "부산역",
      address: "부산광역시 동구 중앙대로 206",
      lat: 35.1156,
      lng: 129.0403,
    },
  }

  // 간단한 키워드 매칭
  const normalizedQuery = query.toLowerCase().replace(/\s+/g, "")
  for (const [key, location] of Object.entries(mockLocations)) {
    if (key.includes(normalizedQuery) || normalizedQuery.includes(key)) {
      return location
    }
  }

  return null
}

export function isLocationQuery(message: string): boolean {
  const locationKeywords = ["지도", "위치", "어디", "길찾기", "주소", "가는법", "역", "공항", "대학교"]
  const normalizedMessage = message.toLowerCase()

  return locationKeywords.some((keyword) => normalizedMessage.includes(keyword))
}

export function extractLocationFromMessage(message: string): string {
  // 간단한 위치 추출 로직
  const locationPatterns = [/(.+)역/, /(.+)대학교/, /(.+)공항/, /(.+)에서/, /(.+)까지/, /(.+) 지도/, /(.+) 위치/]

  for (const pattern of locationPatterns) {
    const match = message.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  return message.replace(/지도|위치|어디|길찾기|주소|가는법/g, "").trim()
}
