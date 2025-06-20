from dotenv import load_dotenv
import os

# .env 불러오기 (최초 1회만 실행됨)
load_dotenv()

# 환경 변수 선언
HASH_LOCATION = os.getenv("HASH_LOCATION")
HASH_PLACE = os.getenv("HASH_PLACE")
LAAS_API_KEY = os.getenv("Laas_API_KEY")
PROJECT_CODE = os.getenv("PROJECT_CODE")
LAAS_URL = os.getenv("LAAS_URL")
# (선택) 경로 체크
if not all([HASH_LOCATION, HASH_PLACE, LAAS_API_KEY, PROJECT_CODE, LAAS_URL]):
    print("⚠️ 일부 환경변수가 설정되지 않았습니다.")