"use client"

import { useEffect, useRef } from "react"

interface NaverMapProps {
  location: {
    name: string
    address: string
    lat: number
    lng: number
  }
  width?: string
  height?: string
}

declare global {
  interface Window {
    naver: any
  }
}

export function NaverMap({ location, width = "100%", height = "300px" }: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)

  useEffect(() => {
    const initMap = () => {
      if (!window.naver || !mapRef.current) return

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
          position: window.naver.maps.Position.RIGHT_CENTER,
        },
      }

      mapInstance.current = new window.naver.maps.Map(mapRef.current, mapOptions)

      // 마커 추가
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(location.lat, location.lng),
        map: mapInstance.current,
        title: location.name,
      })

      // 정보창 추가
      const infoWindow = new window.naver.maps.InfoWindow({
        content: `
          <div style="padding: 10px; min-width: 200px;">
            <h4 style="margin: 0 0 5px 0; font-weight: bold;">${location.name}</h4>
            <p style="margin: 0; font-size: 12px; color: #666;">${location.address}</p>
          </div>
        `,
      })

      // 마커 클릭 시 정보창 표시
      window.naver.maps.Event.addListener(marker, "click", () => {
        if (infoWindow.getMap()) {
          infoWindow.close()
        } else {
          infoWindow.open(mapInstance.current, marker)
        }
      })
    }

    // 네이버 지도 API 로드
    if (!window.naver) {
      const script = document.createElement("script")
      script.src = "https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=YOUR_CLIENT_ID"
      script.onload = initMap
      document.head.appendChild(script)
    } else {
      initMap()
    }
  }, [location])

  return <div ref={mapRef} style={{ width, height }} className="rounded-lg border border-gray-200" />
}
