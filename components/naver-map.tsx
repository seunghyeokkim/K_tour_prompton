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

interface MapObjects {
  map: any
  markers: any[]
  polylines: any[]
  infoWindows: any[]
  eventListeners: any[]
}

// 경로 표시용 지도 컴포넌트
interface RouteMapProps {
  route: {
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
  location?: {
    name: string
    address: string
    lat: number
    lng: number
  }
}

export function RouteMap({ 
  route = [], 
  pathOptions = {
    width: 6,
    color: '#ff86e1',
    outlineColor: '#89bcff',
    outlineWidth: 2,
    patternInterval: 20
  },
  width = "100%", 
  height = "300px",
  location
}: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapObjectsRef = useRef<MapObjects>({
    map: null,
    markers: [],
    polylines: [],
    infoWindows: [],
    eventListeners: []
  })
  const isInitializedRef = useRef(false)

  // 마커 이미지 URL 정의
  const getRouteMarkerIcon = useCallback((type: 'start' | 'end' | 'waypoint') => {
    switch (type) {
      case 'start':
        return {
          content: '<div style="width: 20px; height: 20px; background: #ef4444; border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">S</div>',
          size: new window.naver.maps.Size(24, 24),
          anchor: new window.naver.maps.Point(12, 12)
        }
      case 'end':
        return {
          content: '<div style="width: 20px; height: 20px; background: #3b82f6; border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">E</div>',
          size: new window.naver.maps.Size(24, 24),
          anchor: new window.naver.maps.Point(12, 12)
        }
      case 'waypoint':
        return {
          content: '<div style="width: 16px; height: 16px; background: #f59e0b; border: 2px solid white; border-radius: 50%;"></div>',
          size: new window.naver.maps.Size(20, 20),
          anchor: new window.naver.maps.Point(10, 10)
        }
      default:
        return null
    }
  }, [])

  // 지도 객체들 정리 함수
  const cleanupMapObjects = useCallback(() => {
    const objects = mapObjectsRef.current
    
    objects.eventListeners.forEach(listener => {
      if (window.naver?.maps?.Event?.removeListener) {
        window.naver.maps.Event.removeListener(listener)
      }
    })
    
    objects.infoWindows.forEach(infoWindow => {
      if (infoWindow.close) {
        infoWindow.close()
      }
    })
    
    objects.polylines.forEach(polyline => {
      if (polyline.setMap) {
        polyline.setMap(null)
      }
    })
    
    objects.markers.forEach(marker => {
      if (marker.setMap) {
        marker.setMap(null)
      }
    })
    
    objects.markers = []
    objects.polylines = []
    objects.infoWindows = []
    objects.eventListeners = []
  }, [])

  // 경로 데이터 fetch 함수 (수정된 버전)
  const fetchRouteData = useCallback(async (routeData: typeof route) => {
    if (routeData.length < 2) return null

    const start = routeData[0]
    const end = routeData[routeData.length - 1]
    const passList = routeData.slice(1, -1)

    
    const appKey = process.env.NEXT_PUBLIC_APP_KEY ?? "";
    
    // URLSearchParams를 사용하여 올바른 형식으로 요청 데이터 구성
    const formData = new URLSearchParams()
    formData.append('startX', start.mapx.toString())
    formData.append('startY', start.mapy.toString())
    formData.append('endX', end.mapx.toString())
    formData.append('endY', end.mapy.toString())
    formData.append('startName', start.title)
    formData.append('endName', end.title)
    formData.append('reqCoordType', 'WGS84GEO')
    formData.append('resCoordType', 'WGS84GEO')

    if (passList.length > 0) {
      formData.append('passList', passList.map(p => `${p.mapx},${p.mapy}`).join('_'))
    }

    try {
      const response = await fetch("https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "appKey": appKey,
        },
        body: formData
      })

      if (!response.ok) {
        console.warn(`경로 API 응답 오류: ${response.status}`)
        return null
      }

      const json = await response.json()
      return json.features || []
    } catch (error) {
      console.warn("경로 API 호출 실패, 직선 경로로 대체:", error)
      return null
    }
  }, [])

  // 경로 생성 함수
  const createRoutePolylines = useCallback((features: any[]) => {
    if (!features || !window.naver?.maps) return []

    const linePath: any[] = []

    features
      .filter((feature: any) => feature.geometry?.type === "LineString")
      .forEach((feature: any) => {
        feature.geometry.coordinates.forEach(([lng, lat]: [number, number]) => {
          linePath.push(new window.naver.maps.LatLng(lat, lng))
        })
      })

    return linePath
  }, [])

  // 직선 경로 생성 함수 (API 실패 시 대체용)
  const createStraightPath = useCallback((routeData: typeof route) => {
    if (!window.naver?.maps || routeData.length < 2) return []
    
    return routeData.map(spot => 
      new window.naver.maps.LatLng(spot.mapy, spot.mapx)
    )
  }, [])

  // 폴리라인 생성 함수
  const createPolylines = useCallback((pathCoords: any[]) => {
    if (!window.naver?.maps || pathCoords.length < 2) return []

    const polylines: any[] = []
    const map = mapObjectsRef.current.map

    const {
      width: pathWidth = 6,
      outlineWidth: pathOutlineWidth = 2,
      color: pathColor = '#ff86e1',
      outlineColor: pathOutlineColor = '#89bcff',
      patternInterval: pathPatternInterval = 20
    } = pathOptions

    // 외곽선 경로
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

    return polylines
  }, [pathOptions])

  // 지도 초기화 함수
  const initializeMap = useCallback(async () => {
    if (!window.naver?.maps || !mapRef.current || isInitializedRef.current) return

    try {
      cleanupMapObjects()
      
      const center = route.length > 0 
        ? new window.naver.maps.LatLng(route[0].mapy, route[0].mapx)
        : location 
          ? new window.naver.maps.LatLng(location.lat, location.lng)
          : new window.naver.maps.LatLng(37.5665, 126.9780)

      const mapOptions = {
        center,
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

      const map = new window.naver.maps.Map(mapRef.current, mapOptions)
      mapObjectsRef.current.map = map

      const bounds = new window.naver.maps.LatLngBounds()
      let hasBounds = false

      // 경로 마커 생성
      if (route.length > 0) {
        route.forEach((spot, index) => {
          const position = new window.naver.maps.LatLng(spot.mapy, spot.mapx)
          const isStart = index === 0
          const isEnd = index === route.length - 1
          
          let markerIcon
          if (isStart) {
            markerIcon = getRouteMarkerIcon('start')
          } else if (isEnd) {
            markerIcon = getRouteMarkerIcon('end')
          } else {
            markerIcon = getRouteMarkerIcon('waypoint')
          }

          const marker = new window.naver.maps.Marker({
            position,
            map,
            title: spot.title,
            icon: markerIcon
          })
          mapObjectsRef.current.markers.push(marker)

          const infoWindow = new window.naver.maps.InfoWindow({
            content: `<div style="padding: 10px; max-width: 200px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <div style="font-weight: bold; margin-bottom: 6px; font-size: 14px; color: ${isStart ? '#ef4444' : isEnd ? '#3b82f6' : '#f59e0b'};">
                ${isStart ? '🚩 출발지' : isEnd ? '🏁 도착지' : `📍 경유지 ${index}`}
              </div>
              <div style="font-weight: 600; margin-bottom: 4px; font-size: 13px;">${spot.title}</div>
              <div style="font-size: 12px; color: #666; line-height: 1.4;">${spot.address}</div>
            </div>`
          })
          mapObjectsRef.current.infoWindows.push(infoWindow)

          const clickListener = window.naver.maps.Event.addListener(marker, "click", () => {
            mapObjectsRef.current.infoWindows.forEach(iw => {
              if (iw !== infoWindow && iw.getMap()) {
                iw.close()
              }
            })
            
            if (infoWindow.getMap()) {
              infoWindow.close()
            } else {
              infoWindow.open(map, marker)
            }
          })
          mapObjectsRef.current.eventListeners.push(clickListener)
          
          bounds.extend(position)
          hasBounds = true
        })

        // 경로 그리기
        if (route.length > 1) {
          try {
            const routeFeatures = await fetchRouteData(route)
            let routeCoords: any[] = []
            
            if (routeFeatures && routeFeatures.length > 0) {
              routeCoords = createRoutePolylines(routeFeatures)
            }
            
            // API 경로가 없으면 직선 경로 사용
            if (routeCoords.length === 0) {
              routeCoords = createStraightPath(route)
            }
            
            if (routeCoords.length > 1) {
              const polylines = createPolylines(routeCoords)
              mapObjectsRef.current.polylines.push(...polylines)
              
              routeCoords.forEach(coord => bounds.extend(coord))
            }
          } catch (error) {
            console.warn("경로 생성 실패, 마커만 표시:", error)
          }
        }
      }

      // 지도 영역 조정
      if (hasBounds) {
        map.fitBounds(bounds, {
          top: 50,
          right: 50,
          bottom: 50,
          left: 50
        })
      }

      isInitializedRef.current = true
    } catch (error) {
      console.error("경로 지도 초기화 오류:", error)
    }
  }, [route, location, pathOptions, cleanupMapObjects, fetchRouteData, createRoutePolylines, createStraightPath, createPolylines, getRouteMarkerIcon])
 
  naver_key: process.env.NEXT_PUBLIC_NAVER_MAP_KEY ?? ""

  // 네이버 지도 API 로드
  useEffect(() => {
  const naver_key = process.env.NEXT_PUBLIC_NAVER_MAP_KEY ?? "";

  const loadNaverMapsAPI = () => {
    if (window.naver?.maps) {
      initializeMap();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${naver_key}`;
    script.async = true;
    script.onload = initializeMap;
    script.onerror = () => {
      console.error("네이버 지도 API 로드 실패");
    };
    document.head.appendChild(script);
  };

    loadNaverMapsAPI();
  }, [initializeMap]);


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
  }, [route, pathOptions, initializeMap])

  return (
    <div 
      ref={mapRef} 
      style={{ width, height }} 
      className="rounded-lg border border-gray-200 bg-gray-100"
      role="application"
      aria-label="경로 표시 지도"
    />
  )
}

// 쓰레기통 위치 표시용 지도 컴포넌트 (수정된 버전)
interface TrashMapProps {
  trash_location: {
    lat: number
    lng: number
    name: string
    address: string
  }[]
  width?: string
  height?: string
  location?: {
    name: string
    address: string
    lat: number
    lng: number
  }
}

export function TrashMap({ 
  trash_location = [],
  width = "100%", 
  height = "300px",
  location
}: TrashMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapObjectsRef = useRef<MapObjects>({
    map: null,
    markers: [],
    polylines: [],
    infoWindows: [],
    eventListeners: []
  })
  const isInitializedRef = useRef(false)
  const mapIdRef = useRef(`trash-map-${Date.now()}-${Math.random()}`)

    // 쓰레기통 마커 아이콘
  const getTrashMarkerIcon = useCallback(() => {
    return {
      content: '<div style="width: 24px; height: 24px; background:rgb(134, 227, 168); border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px;">🗑️</div>',
      size: new window.naver.maps.Size(28, 28),
      anchor: new window.naver.maps.Point(14, 14)
    }
  }, [])
  
  // 지도 객체들 정리 함수
  const cleanupMapObjects = useCallback(() => {
    const objects = mapObjectsRef.current
    
    objects.eventListeners.forEach(listener => {
      if (window.naver?.maps?.Event?.removeListener) {
        window.naver.maps.Event.removeListener(listener)
      }
    })
    
    objects.infoWindows.forEach(infoWindow => {
      if (infoWindow.close) {
        infoWindow.close()
      }
    })
    
    objects.markers.forEach(marker => {
      if (marker.setMap) {
        marker.setMap(null)
      }
    })
    
    objects.markers = []
    objects.polylines = []
    objects.infoWindows = []
    objects.eventListeners = []
  }, [])

  // 지도 초기화 함수 (수정된 버전)
  const initializeMap = useCallback(() => {
    if (!window.naver?.maps || !mapRef.current || isInitializedRef.current) return

    // 지도 로드를 위한 약간의 지연
    const initMap = () => {
      try {
        cleanupMapObjects()
        
        // 기본 중심점 설정
        let center
        if (trash_location.length > 0) {
          center = new window.naver.maps.LatLng(trash_location[0].lat, trash_location[0].lng)
        } else if (location) {
          center = new window.naver.maps.LatLng(location.lat, location.lng)
        } else {
          center = new window.naver.maps.LatLng(37.5665, 126.9780)
        }

        const mapOptions = {
          center,
          zoom: 14,
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

        const map = new window.naver.maps.Map(mapRef.current!, mapOptions)
        mapObjectsRef.current.map = map

        // 지도가 완전히 로드된 후 마커 추가
        const onMapLoad = () => {
          const bounds = new window.naver.maps.LatLngBounds()
          let hasBounds = false

          // 쓰레기통 위치 마커 생성
          trash_location.forEach((trash, index) => {
            const position = new window.naver.maps.LatLng(trash.lat, trash.lng)
            const trashIcon = getTrashMarkerIcon()
            
            const marker = new window.naver.maps.Marker({
              position,
              map,
              title: trash.name || `쓰레기통 ${index + 1}`,
              icon: trashIcon
            })
            mapObjectsRef.current.markers.push(marker)

            const infoWindow = new window.naver.maps.InfoWindow({
              content: `<div style="padding: 10px; max-width: 200px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <div style="font-weight: bold; color: #22c55e; margin-bottom: 6px; font-size: 14px;">
                  🗑️ ${trash.name || `쓰레기통 ${index + 1}`}
                </div>
                <div style="font-size: 12px; color: #666; line-height: 1.4;">
                  ${trash.address || '주소 정보 없음'}
                </div>
              </div>`
            })
            mapObjectsRef.current.infoWindows.push(infoWindow)

            const clickListener = window.naver.maps.Event.addListener(marker, "click", () => {
              mapObjectsRef.current.infoWindows.forEach(iw => {
                if (iw !== infoWindow && iw.getMap()) {
                  iw.close()
                }
              })
              
              if (infoWindow.getMap()) {
                infoWindow.close()
              } else {
                infoWindow.open(map, marker)
              }
            })
            mapObjectsRef.current.eventListeners.push(clickListener)
            
            bounds.extend(position)
            hasBounds = true
          })

          // 지도 영역 조정
          if (hasBounds) {
            setTimeout(() => {
              map.fitBounds(bounds, {
                top: 50,
                right: 50,
                bottom: 50,
                left: 50
              })
            }, 100)
          }
        }

        // 지도 로드 완료 이벤트 리스너
        const idleListener = window.naver.maps.Event.addListener(map, 'idle', () => {
          window.naver.maps.Event.removeListener(idleListener)
          onMapLoad()
        })

        isInitializedRef.current = true
      } catch (error) {
        console.error("쓰레기통 지도 초기화 오류:", error)
      }
    }

    // 약간의 지연 후 초기화 (다른 지도와의 충돌 방지)
    setTimeout(initMap, 100)
  }, [trash_location, location, cleanupMapObjects, getTrashMarkerIcon])

  // 네이버 지도 API 로드
  useEffect(() => {
    const loadNaverMapsAPI = () => {
      const naverKey = process.env.NEXT_PUBLIC_NAVER_MAP_KEY ?? "";

      if (window.naver?.maps) {
        // 약간의 지연을 두어 이전 지도가 완전히 로드된 후 초기화
        setTimeout(initializeMap, 200)
        return
      }

      const script = document.createElement("script")
      script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${naverKey}`;
      script.async = true
      script.onload = () => {
        setTimeout(initializeMap, 200)
      }
      script.onerror = () => {
        console.error("네이버 지도 API 로드 실패")
      }
      
      // 스크립트가 이미 로드되어 있는지 확인
      if (!document.querySelector(`script[src="${script.src}"]`)) {
        document.head.appendChild(script)
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
    if (isInitializedRef.current && trash_location.length > 0) {
      isInitializedRef.current = false
      setTimeout(initializeMap, 100)
    }
  }, [trash_location, initializeMap])

  return (
    <div 
      id={mapIdRef.current}
      ref={mapRef} 
      style={{ width, height, minHeight: height }} 
      className="rounded-lg border border-gray-200 bg-gray-100"
      role="application"
      aria-label="쓰레기통 위치 지도"
    />
  )
}