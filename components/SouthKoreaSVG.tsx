import { SimpleSouthKoreaMapChart } from "react-simple-south-korea-map-chart";

type SouthKoreaSVGProps = {
  style?: React.CSSProperties;
  completedAreas?: string[];
};

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

export default function SouthKoreaSVG({ style, completedAreas = [] }: SouthKoreaSVGProps) {
  // 모든 지역 리스트 (완료/미완료 구분용)
  const allAreas = [
    "부산광역시", "대구광역시", "대전광역시", "강원도", "광주광역시", 
    "경기도", "인천광역시", "제주특별자치도", "충청북도", "경상북도", 
    "전라북도", "세종특별자치시", "충청남도", "경상남도", "전라남도", 
    "울산광역시", "서울특별시"
  ];

  // 완료된 지역명을 정식 지역명으로 변환
  const mappedCompletedAreas = completedAreas.map(area => mapAreaName(area));

  // 플로깅 완료 여부에 따라 데이터 생성
  const data = allAreas.map(area => ({
    locale: area,
    count: mappedCompletedAreas.includes(area) ? 1 : 0 // 완료: 1, 미완료: 0
  }));

  // 완료/미완료에 따른 색상 설정
  const setColorByCount = (count: number) => {
    if (count === 1) return "#10b981"; // 완료된 지역: 초록색
    return "#f3f4f6"; // 미완료 지역: 연한 회색
  };

  return (
    <SimpleSouthKoreaMapChart
      data={data}
      setColorByCount={setColorByCount}
      unit="✅"
      style={style}
    />
  );
}