from dotenv import load_dotenv
import os

# .env 불러오기 (최초 1회만 실행됨)
load_dotenv()

# 환경 변수 선언
HASH_LOCATION = os.getenv("HASH_LOCATION")
HASH_PLACE = os.getenv("HASH_PLACE")
HASH_ROUTE = os.getenv("HASH_ROUTE")
HASH_IMAGE = os.getenv("HASH_IMAGE")
LAAS_API_KEY = os.getenv("LAAS_API_KEY")
PROJECT_CODE = os.getenv("PROJECT_CODE")
LAAS_URL = os.getenv("LAAS_URL")
TMAP_API_KEY = os.getenv("TMAP_API_KEY")
HASH_TRASHBAG = os.getenv("HASH_TRASHBAG")
HASH_RAG = os.getenv("HASH_RAG")
TOUR_API_KEY = os.getenv("Tour_API_KEY")
# (선택) 경로 체크
if not all([HASH_LOCATION, HASH_PLACE, HASH_ROUTE,HASH_IMAGE,HASH_TRASHBAG,HASH_RAG, LAAS_API_KEY, PROJECT_CODE, LAAS_URL, TMAP_API_KEY, TOUR_API_KEY]):
    print("⚠️ 일부 환경변수가 설정되지 않았습니다.")
