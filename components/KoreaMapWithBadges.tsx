import React from "react";
import SouthKoreaSVG from './SouthKoreaSVG';

interface KoreaMapWithBadgesProps {
  completedAreas?: string[];
}

// 지역명 매핑 함수 (백엔드에서 오는 축약된 지역명 -> 정식 지역명)
const mapAreaName = (area: string): string => {
  const areaMapping: { [key: string]: string } = {
    "서울": "서울특별시",
    "부산": "부산광역시", 
    "대구": "대구광역시",
    "인천": "인천광역시",
    "광주": "광주광역시",
    "대전": "대전광역시",
    "울산": "울산광역시",
    "세종": "세종특별자치시",
    "세종특별자치시": "세종특별자치시",
    "경기": "경기도",
    "강원": "강원도",
    "강원특별자치도": "강원도",
    "충북": "충청북도",
    "충남": "충청남도", 
    "전북": "전라북도",
    "전북특별자치도": "전라북도",
    "전남": "전라남도",
    "경북": "경상북도",
    "경남": "경상남도",
    "제주": "제주특별자치도",
    "제주도": "제주특별자치도"
  };
  
  return areaMapping[area] || area;
};

// 각 시/도별 배지 위치
const areaPositions: Record<string, { left: string; top: string }> = {
  "서울특별시": { left: "55%", top: "18%" },
  "부산광역시": { left: "80%", top: "80%" },
  "대구광역시": { left: "75%", top: "65%" },
  "대전광역시": { left: "45%", top: "55%" },
  "강원도": { left: "70%", top: "25%" },
  "광주광역시": { left: "35%", top: "75%" },
  "경기도": { left: "50%", top: "25%" },
  "인천광역시": { left: "45%", top: "20%" },
  "제주특별자치도": { left: "30%", top: "95%" },
  "충청북도": { left: "55%", top: "45%" },
  "경상북도": { left: "75%", top: "50%" },
  "전라북도": { left: "40%", top: "65%" },
  "세종특별자치시": { left: "48%", top: "50%" },
  "충청남도": { left: "40%", top: "50%" },
  "경상남도": { left: "70%", top: "75%" },
  "전라남도": { left: "35%", top: "80%" },
  "울산광역시": { left: "85%", top: "70%" },
};

export default function KoreaMapWithBadges({ completedAreas = [] }: KoreaMapWithBadgesProps) {
  // 완료된 지역명을 정식 지역명으로 변환
  const mappedCompletedAreas = completedAreas.map(area => mapAreaName(area));

  return (
    <div style={{ width: 400, height: 600, position: "relative" }}>
      {/* 완료된 지역 정보를 SouthKoreaSVG에 전달 */}
      <SouthKoreaSVG 
        style={{ width: "100%", height: "100%" }} 
        completedAreas={completedAreas}
      />
      
      {/* 완료된 지역에 배지 표시 */}
      {mappedCompletedAreas.map(area => {
        const pos = areaPositions[area];
        if (!pos) return null;
        return (
          <div
            key={area}
            style={{
              position: "absolute",
              left: pos.left,
              top: pos.top,
              pointerEvents: "none",
              transform: "translate(-50%, -50%)"
            }}
          >
            <span style={{ 
              fontSize: 20, 
              textShadow: "0 0 3px white",
              background: "rgba(16, 185, 129, 0.9)",
              borderRadius: "50%",
              padding: "4px",
              color: "white"
            }}>
              🏆
            </span>
          </div>
        );
      })}
    </div>
  );
} 