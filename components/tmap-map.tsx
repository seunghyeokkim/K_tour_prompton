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
    Tmapv2: any;
  }
}

export function TmapMap({ route, width = "100%", height = "400px" }: TmapMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)

  // ✅ 1. 키를 직접 코드에 삽입
  const tmapKey = "ECz1ZwyOcj91pngxWDBFr43NsbF7o2zUhwbQEYf3"

  // ✅ 2. useEffect 내부 전면 수정
  useEffect(() => {
    if (!route || route.length === 0) return;

    const loadScript = (tmapKey: string) => {
      return new Promise<void>((resolve) => {
        if (typeof window === "undefined") return;

        const checkReady = () => {
          if (window.Tmapv2 && window.Tmapv2.LatLng) {
            clearInterval(checkInterval);
            resolve();
          }
        };

        if (window.Tmapv2 && window.Tmapv2.LatLng) {
          resolve();
          return;
        }

        const existingScript = document.getElementById("tmap-script");
        if (existingScript) {
          var checkInterval = setInterval(checkReady, 50);
          return;
        }

        const script = document.createElement("script");
        script.id = "tmap-script";
        script.src = `https://apis.openapi.sk.com/tmap/jsv2?version=1&appKey=${tmapKey}`;
        script.onload = () => {
          var checkInterval = setInterval(checkReady, 50);
        };
        document.head.appendChild(script);
      });
    };

    const initMap = () => {
      if (!window.Tmapv2 || !mapRef.current) return;

      console.log("✅ route:", route)
      console.log("✅ map DOM:", mapRef.current)
      console.log("✅ Tmap SDK:", window.Tmapv2)

      mapInstance.current = new window.Tmapv2.Map(mapRef.current, {
        center: new window.Tmapv2.LatLng(route[0].mapy, route[0].mapx),
        width,
        height,
        zoom: 15,
      });

      const path: any[] = [];
      route.forEach((point, idx) => {
        const latlng = new window.Tmapv2.LatLng(point.mapy, point.mapx);
        path.push(latlng);
        new window.Tmapv2.Marker({
          position: latlng,
          map: mapInstance.current,
          title: point.title,
        });
      });

      new window.Tmapv2.Polyline({
        path,
        strokeColor: "#ff86e1",
        strokeWeight: 4,
        map: mapInstance.current,
      });
    };

    loadScript(tmapKey).then(initMap);
  }, [route, width, height]);

  return (
    <div
      ref={mapRef}
      style={{ width, height }}
      className="bg-gray-100 border border-gray-300 rounded-lg"
    />
  )
}
