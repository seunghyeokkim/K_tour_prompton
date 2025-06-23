// components/TmapMap.tsx
"use client"

import { useEffect, useRef } from "react"

interface TmapMapProps {
  route: {
    title: string
    address: string
    mapx: number
    mapy: number
  }[]
  width?: string
  height?: string
}

declare global {
  interface Window {
    Tmapv2?: any
  }
}

export function TmapMap({
  route,
  width = "100%",
  height = "400px",
}: TmapMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)

  useEffect(() => {
    if (!route?.length) return

    let timerId: number
    const tryInit = () => {
      // 이미 초기화된 맵이 있으면 폴링 중단
      if (mapInstance.current) {
        clearInterval(timerId)
        return
      }

      // SDK와 DOM이 준비되었으면 지도 초기화
      if (window.Tmapv2 && mapRef.current) {
        const map = new window.Tmapv2.Map(mapRef.current, {
          center: new window.Tmapv2.LatLng(route[0].mapy, route[0].mapx),
          width,
          height,
          zoom: 15,
        })

        // 경로에 따라 마커 찍기 및 폴리라인 그리기
        const path = route.map((pt) => {
          const latlng = new window.Tmapv2.LatLng(pt.mapy, pt.mapx)
          new window.Tmapv2.Marker({
            position: latlng,
            map,
            title: pt.title,
          })
          return latlng
        })

        new window.Tmapv2.Polyline({
          path,
          strokeColor: "#ff86e1",
          strokeWeight: 4,
          map,
        })

        mapInstance.current = map
        clearInterval(timerId)
      }
    }

    // 200ms 간격으로 SDK 준비 여부 폴링
    timerId = window.setInterval(tryInit, 200)
    return () => clearInterval(timerId)
  }, [route, width, height])

  return (
    <div
      ref={mapRef}
      style={{ width, height }}
      className="bg-gray-100 border border-gray-300 rounded-lg"
    />
  )
}
