# tmap_pedestrian.py
import requests
from urllib.parse import quote
from config import TMAP_API_KEY

def get_pedestrian_route(
    start_coords: tuple,
    end_coords: tuple,
    pass_list: list = [],
    start_name: str = "출발지",
    end_name: str = "도착지",
    coord_type: str = "WGS84GEO",
    search_option: int = 0
) -> dict:
    """
    Tmap 도보 경로 요청 함수

    Parameters:
        app_key (str): Tmap API AppKey
        start_coords (tuple): (startX, startY)
        end_coords (tuple): (endX, endY)
        pass_list (list): [(x1, y1), (x2, y2), ...] 형태의 경유지 리스트
        start_name (str): 출발지 명칭
        end_name (str): 도착지 명칭
        coord_type (str): 좌표계 (기본값: "WGS84GEO")
        search_option (int): 경로 탐색 옵션 (0: 추천, 10: 최단 등)

    Returns:
        dict: API 응답 JSON
    """

    url = "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1"

    # 경유지 리스트 문자열 생성
    pass_str = "_".join([f"{x},{y}" for x, y in pass_list]) if pass_list else ""

    # 파라미터 구성
    data = {
        "startX": start_coords[0],
        "startY": start_coords[1],
        "endX": end_coords[0],
        "endY": end_coords[1],
        "startName": quote(start_name),
        "endName": quote(end_name),
        "reqCoordType": coord_type,
        "resCoordType": coord_type,
        "searchOption": str(search_option)
    }

    if pass_str:
        data["passList"] = pass_str

    # 헤더 구성
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "appKey": TMAP_API_KEY,
        "Accept-Language": "ko"
    }

    # API 요청
    response = requests.post(url, headers=headers, data=data)

    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Tmap API 오류 {response.status_code}: {response.text}")