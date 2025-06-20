import requests

AREA_CODE_DICT = {
    "서울": "1", "인천": "2", "대전": "3", "대구": "4", "광주": "5", "부산": "6", "울산": "7",
    "세종특별자치시": "8", "경기도": "31", "강원특별자치도": "32", "충청북도": "33",
    "충청남도": "34", "경상북도": "35", "경상남도": "36", "전북특별자치도": "37",
    "전라남도": "38", "제주도": "39"
}

SERVICE_KEY = 'OftZ6VfoPjj9qR5M02CdC4pdjXY7G2qMUmKM1EnkYfw1eUXRKuK+/H1S6CUyJUpt1meaQ2uH+KXBnqbfAsx/NA=='

def get_sigungu_code(area_code, sigungu_name):
    url = "http://apis.data.go.kr/B551011/KorService2/areaCode2"
    params = {
        "numOfRows": "100000",
        "serviceKey": SERVICE_KEY,
        "MobileOS": "WEB",
        "MobileApp": "AppTest",
        "areaCode": area_code,
        "_type": "json"
    }
    response = requests.get(url, params=params)
    data = response.json()
    items = data["response"]["body"]["items"]["item"]
    for item in items:
        if sigungu_name in item.get("name", ""):
            return item["code"]
    return None


import random  # 맨 위에 추가

def get_filtered_tourist_data(area_name: str, sigungu_name: str) -> list[dict]:
    area_code = AREA_CODE_DICT.get(area_name)
    sigungu_code = get_sigungu_code(area_code, sigungu_name)
    url = "http://apis.data.go.kr/B551011/KorService2/areaBasedList2"
    params = {
        "serviceKey": SERVICE_KEY,
        "MobileOS": "WEB",
        "MobileApp": "TourWeb",
        "numOfRows": "50000",
        "areaCode": area_code,
        "sigunguCode": sigungu_code,
        "_type": "json"
    }
    response = requests.get(url, params=params)
    data = response.json()
    items = data["response"]["body"]["items"]["item"]
    items = [
        {
            "title": item.get("title"),
            "address": item.get("addr1"),
            "contentid": item.get("contentid"),
            "overview": item.get("overview", "")[:300]
        }
        for item in items
        if item.get("contenttypeid") in {"12", "14", "28"}
    ]
    
    # 아이템이 50개 이상이면 랜덤으로 50개 선택, 아니면 전부 반환
    return random.sample(items, 50) if len(items) >= 50 else items


def get_detailed_tourist_data(content_id: str) -> dict:
    url = "http://apis.data.go.kr/B551011/KorService2/detailCommon2"
    params = {
        "serviceKey": SERVICE_KEY,
        "MobileOS": "WEB",
        "MobileApp": "TourWeb",
        "contentId": content_id,
        "_type": "json"
    }
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        item = data["response"]["body"]["items"]["item"][0]
        return {
            "overview": item.get("overview", "")
        }
    except Exception as e:
        print("❌ 상세 관광지 정보 조회 오류:", e)
        return {}

# def place_recommend_agent(state):
#     user_input = state.get("user_input", "")
#     area_name, sigungu_name = extract_location(user_input)
#     print(f"📍 디버깅: 추출된 지역명: {area_name}, 시군구명: {sigungu_name}")

#     if not area_name or not sigungu_name or area_name not in AREA_CODE_DICT:
#         return {**state, "place_list": []}

#     candidates = get_filtered_tourist_data(area_name, sigungu_name)
#     print(f"📍 디버깅: 후보 관광지 수: {len(candidates)}")

#     brief_candidates = []
#     for item in candidates:
#         if not item['overview']:
#             details = get_detailed_tourist_data(item['contentid'])
#             if details.get('overview'):
#                 item['overview'] = details['overview'][:300]
#         brief_candidates.append({
#             "title": item["title"],
#             "overview": item["overview"].split(". ")[0] + "." if item["overview"] else ""
#         })

#     print("📍 디버깅: 요약된 관광지 목록 예시:")
#     for c in brief_candidates[:3]:
#         print(f"- {c['title']}: {c['overview']}")

#     prompt = ChatPromptTemplate.from_template("""
#     아래는 {area_name} {sigungu_name} 지역의 관광지 목록입니다. 이 중 플로깅 투어에 적합한
#     장소를 3~5곳 골라 추천해 주세요. 플로깅은 조깅을 하면서 길가의 쓰레기를 수거하는, 체육활동과 자연보호활동이 합쳐진 개념을 의미하는 신조어야.
#     각 장소에 대해 간단한 소개를 덧붙여 주세요.

#     관광지 목록:
#     {places}

#     출력 형식:
#     - 장소명: 설명
#     """)

#     chain = prompt | llm
#     response = chain.invoke({
#         "area_name": area_name,
#         "sigungu_name": sigungu_name,
#         "places": str(brief_candidates)
#     }).content

#     results = []
#     for line in response.split("\n"):
#         if ':' in line:
#             title, desc = line.split(":", 1)
#             results.append({
#                 "title": title.strip("- ").strip(),
#                 "description": desc.strip()
#             })

#     return {**state, "place_list": results}
