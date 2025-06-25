"use client"

import { useEffect, useRef, useCallback } from "react"

// 네이버 지도 API 타입 정의
declare global {
  interface Window {
    naver: {
      maps: {
        LatLng: new (lat: number, lng: number) => any
        Map: new (element: HTMLElement, options: any) => any
        Marker: new (options: any) => any
        InfoWindow: new (options: any) => any
        Polyline: new (options: any) => any
        LatLngBounds: new () => any
        Point: new (x: number, y: number) => any
        Size: new (width: number, height: number) => any
        Event: {
          addListener: (target: any, type: string, listener: () => void) => any
          removeListener: (listener: any) => void
        }
        MapTypeControlStyle: {
          BUTTON: string
        }
        Position: {
          TOP_RIGHT: string
          RIGHT_CENTER: string
          TOP_LEFT: string
        }
        ZoomControlStyle: {
          SMALL: string
        }
      }
    }
  }
}

interface NaverMapProps {
  route?: {
    title: string
    address: string
    mapx: number
    mapy: number
  }[]
  pathOptions?: {
    width?: number
    color?: string
    outlineColor?: string
    outlineWidth?: number
    patternInterval?: number
  }
  width?: string
  height?: string
  location: {
    lat: number
    lng: number
    name: string
    address: string
  }
  walkPath?: {
    lat: number
    lng: number
  }[]
}

interface MapObjects {
  map: any
  markers: any[]
  polylines: any[]
  infoWindows: any[]
  eventListeners: any[]
}

export function NaverMap({ 
  route = [], 
  pathOptions = {
    width: 6,
    color: '#3B82F6',
    outlineColor: '#1E40AF',
    outlineWidth: 2,
    patternInterval: 20
  },
  width = "100%", 
  height = "300px",
  location,
  walkPath = []
}: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapObjectsRef = useRef<MapObjects>({
    map: null,
    markers: [],
    polylines: [],
    infoWindows: [],
    eventListeners: []
  })
  const isInitializedRef = useRef(false)

  // 지도 객체들 정리 함수
  const cleanupMapObjects = useCallback(() => {
    const objects = mapObjectsRef.current
    
    // 이벤트 리스너 제거
    objects.eventListeners.forEach(listener => {
      if (window.naver?.maps?.Event?.removeListener) {
        window.naver.maps.Event.removeListener(listener)
      }
    })
    
    // 정보창 닫기
    objects.infoWindows.forEach(infoWindow => {
      if (infoWindow.close) {
        infoWindow.close()
      }
    })
    
    // 폴리라인 제거
    objects.polylines.forEach(polyline => {
      if (polyline.setMap) {
        polyline.setMap(null)
      }
    })
    
    // 마커 제거
    objects.markers.forEach(marker => {
      if (marker.setMap) {
        marker.setMap(null)
      }
    })
    
    // 배열 초기화
    objects.markers = []
    objects.polylines = []
    objects.infoWindows = []
    objects.eventListeners = []
  }, [])

  // 경로 데이터 fetch 함수
  const fetchRouteData = useCallback(async (routeData: typeof route) => {
    if (routeData.length < 2) return null

    const start = routeData[0]
    const end = routeData[routeData.length - 1]
    const passList = routeData.slice(1, -1)

    const appKey = "ECz1ZwyOcj91pngxWDBFr43NsbF7o2zUhwbQEYf3"
    
    const requestData: Record<string, any> = {
      startX: start.mapx,
      startY: start.mapy,
      endX: end.mapx,
      endY: end.mapy,
      startName: start.title,
      endName: end.title,
      reqCoordType: "WGS84GEO",
      resCoordType: "WGS84GEO",
    }

    if (passList.length > 0) {
      requestData.passList = passList.map(p => `${p.mapx},${p.mapy}`).join("_")
    }

    try {
      const response = await fetch("https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          appKey: appKey,
        },
        body: new URLSearchParams(requestData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const json = await response.json()
      return json.features || []
    } catch (error) {
      console.error("경로 API 오류:", error)
      return null
    }
  }, [])

  // 경로 생성 함수
  const createRoutePolylines = useCallback((features: any[]) => {
    if (!features || !window.naver?.maps) return []

    const seen = new Set<string>()
    const linePath: any[] = []

    features
      .filter((feature: any) => feature.geometry?.type === "LineString")
      .forEach((feature: any) => {
        feature.geometry.coordinates.forEach(([lng, lat]: [number, number]) => {
          const key = `${lat.toFixed(6)},${lng.toFixed(6)}`
          if (!seen.has(key)) {
            seen.add(key)
            linePath.push(new window.naver.maps.LatLng(lat, lng))
          }
        })
      })

    return linePath
  }, [])

  // 폴리라인 생성 함수
  const createPolylines = useCallback((pathCoords: any[]) => {
    if (!window.naver?.maps || pathCoords.length < 2) return []

    const polylines: any[] = []
    const map = mapObjectsRef.current.map

    const {
      width: pathWidth = 6,
      outlineWidth: pathOutlineWidth = 2,
      color: pathColor = '#3B82F6',
      outlineColor: pathOutlineColor = '#1E40AF',
      patternInterval: pathPatternInterval = 20
    } = pathOptions

    // 외곽선 (아웃라인) 경로
    const outlinePath = new window.naver.maps.Polyline({
      map: map,
      path: pathCoords,
      strokeColor: pathOutlineColor,
      strokeWeight: pathWidth + (pathOutlineWidth * 2),
      strokeOpacity: 0.8,
      strokeStyle: 'solid'
    })
    polylines.push(outlinePath)

    // 메인 경로
    const mainPath = new window.naver.maps.Polyline({
      map: map,
      path: pathCoords,
      strokeColor: pathColor,
      strokeWeight: pathWidth,
      strokeOpacity: 1,
      strokeStyle: 'solid'
    })
    polylines.push(mainPath)

    // 패턴 표시를 위한 점선 경로
    if (pathPatternInterval > 0) {
      const patternPath = new window.naver.maps.Polyline({
        map: map,
        path: pathCoords,
        strokeColor: pathOutlineColor,
        strokeWeight: 1,
        strokeOpacity: 0.6,
        strokeStyle: [pathPatternInterval, pathPatternInterval / 2]
      })
      polylines.push(patternPath)
    }

    return polylines
  }, [pathOptions])

  // 지도 초기화 함수
  const initializeMap = useCallback(async () => {
    if (!window.naver?.maps || !mapRef.current || isInitializedRef.current) return

    try {
      // 기존 객체들 정리
      cleanupMapObjects()
      
      const mapOptions = {
        center: new window.naver.maps.LatLng(location.lat, location.lng),
        zoom: 15,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.naver.maps.MapTypeControlStyle.BUTTON,
          position: window.naver.maps.Position.TOP_RIGHT,
        },
        zoomControl: true,
        zoomControlOptions: {
          style: window.naver.maps.ZoomControlStyle.SMALL,
          position: window.naver.maps.Position.TOP_LEFT,
        },
        scaleControl: false,
        logoControl: true,
        mapDataControl: true
      }

      // 지도 생성
      const map = new window.naver.maps.Map(mapRef.current, mapOptions)
      mapObjectsRef.current.map = map

      // 마커 생성
      
      route.forEach((spot) => {
        if (spot.mapx === location.lng && spot.mapy === location.lat) return

        const position = new window.naver.maps.LatLng(spot.mapy, spot.mapx)
        const marker = new window.naver.maps.Marker({
          position,
          map,
          title: spot.title
        })
        mapObjectsRef.current.markers.push(marker)

        const infoWindow = new window.naver.maps.InfoWindow({
          content: `<div style="padding: 5px"><strong>${spot.title}</strong><br/>${spot.address}</div>`
        })
        mapObjectsRef.current.infoWindows.push(infoWindow)

        const clickListener = window.naver.maps.Event.addListener(marker, "click", () => {
          if (infoWindow.getMap()) {
            infoWindow.close()
          } else {
            infoWindow.open(map, marker)
          }
        })
        mapObjectsRef.current.eventListeners.push(clickListener)
      })

      // 경로 처리
      let allPathCoords: any[] = []

      // 기존 walkPath 처리
      if (walkPath.length > 1) {
        const walkPathCoords = walkPath.map(coord => 
          new window.naver.maps.LatLng(coord.lat, coord.lng)
        )
        allPathCoords = [...walkPathCoords]
      }

      // route 데이터로 경로 생성
      if (route.length > 1) {
        const routeFeatures = await fetchRouteData(route)
        if (routeFeatures) {
          const routeCoords = createRoutePolylines(routeFeatures)
          allPathCoords = [...allPathCoords, ...routeCoords]
        }
      }

      // 폴리라인 생성
      if (allPathCoords.length > 1) {
        const polylines = createPolylines(allPathCoords)
        mapObjectsRef.current.polylines.push(...polylines)

        // 경로가 모두 보이도록 지도 영역 조정
        const bounds = new window.naver.maps.LatLngBounds()
        allPathCoords.forEach(coord => bounds.extend(coord))
        bounds.extend(new window.naver.maps.LatLng(location.lat, location.lng))
        
        map.fitBounds(bounds, {
          top: 50,
          right: 50,
          bottom: 50,
          left: 50
        })
      }

      isInitializedRef.current = true
    } catch (error) {
      console.error("지도 초기화 오류:", error)
    }
  }, [location, walkPath, route, pathOptions, cleanupMapObjects, fetchRouteData, createRoutePolylines, createPolylines])

  // 네이버 지도 API 로드
  useEffect(() => {
    const loadNaverMapsAPI = () => {
      if (window.naver?.maps) {
        initializeMap()
        return
      }

      const script = document.createElement("script")
      script.src = "https://openapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=k2473bxptd"
      script.async = true
      script.onload = initializeMap
      script.onerror = () => {
        console.error("네이버 지도 API 로드 실패")
      }
      document.head.appendChild(script)

      return () => {
        document.head.removeChild(script)
      }
    }

    loadNaverMapsAPI()
  }, [initializeMap])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      cleanupMapObjects()
      isInitializedRef.current = false
    }
  }, [cleanupMapObjects])

  // props 변경 시 지도 업데이트
  useEffect(() => {
    if (isInitializedRef.current) {
      isInitializedRef.current = false
      initializeMap()
    }
  }, [location.lat, location.lng, route, walkPath, pathOptions, initializeMap])

  return (
    <div 
      ref={mapRef} 
      style={{ width, height }} 
      className="rounded-lg border border-gray-200 bg-gray-100"
      role="application"
      aria-label="네이버 지도"
    />
  )
}