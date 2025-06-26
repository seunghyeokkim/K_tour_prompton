import SouthKoreaSVG from './SouthKoreaSVG';

interface KoreaSVGMapProps {
  completedAreas: string[];
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

export default function KoreaSVGMap({ completedAreas }: KoreaSVGMapProps) {
  return (
    <div style={{ width: 400, height: 600, position: "relative" }}>
      {/* 완료된 지역만 색칠된 지도 */}
      <SouthKoreaSVG 
        style={{ width: "100%", height: "100%" }} 
        completedAreas={completedAreas}
      />
    </div>
  );
} 