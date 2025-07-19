import requests
from config import TOUR_API_KEY

AREA_CODE_DICT = {
    "서울": "1", "인천": "2", "대전": "3", "대구": "4", "광주": "5", "부산": "6", "울산": "7",
    "세종특별자치시": "8", "경기도": "31", "강원특별자치도": "32", "충청북도": "33",
    "충청남도": "34", "경상북도": "35", "경상남도": "36", "전북특별자치도": "37",
    "전라남도": "38", "제주도": "39"
}

SERVICE_KEY = TOUR_API_KEY

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
            "overview": item.get("overview", "")[:300],
            "mapx": item.get("mapx", ""),
            "mapy": item.get("mapy", "")
        }
        for item in items
        if item.get("contenttypeid") in {"12", "14", "28"}
    ]
    
    # 아이템이 50개 이상이면 랜덤으로 50개 선택, 아니면 전부 반환
    return random.sample(items, 50) if len(items) >= 50 else items


# 상세 관광지 정보 조회 함수 --> 필요 없을 것 같지만, 나중에 필요할 수도 있으니 남겨둠
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

