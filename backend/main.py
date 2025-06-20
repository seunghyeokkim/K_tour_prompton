from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from tour_api import get_filtered_tourist_data, get_detailed_tourist_data
from laas_api import MultiTurnChat
import json
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 전역 챗 설정 (멀티턴 형식)
chat = MultiTurnChat()

# ========================== 모델 정의 ==========================

class UserRequest(BaseModel):
    user_message: str

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

# ========================== 유틸 함수 ==========================

def extract_assistant_response(response) -> str:
    try:
        if response and response.status_code == 200:
            response_data = response.json()
            if 'choices' in response_data and len(response_data['choices']) > 0:
                return response_data['choices'][0]['message']['content']
    except Exception as e:
        print(f"⚠️ 응답 파싱 실패: {e}")
    return None

# ========================== ① 지역 추출 ==========================

@app.post("/location/extract")
def extract_location(data: UserRequest):
    print(f"👤 사용자 메시지: {data.user_message}")
    print(f"📊 현재 대화 기록: {chat.get_conversation_history()}")

    response = chat.send_message(
        data.user_message,
        "9cf7cad215551390ac4363685aac8e0c1c69175e27ca3e09b604f799ba04dd35"
    )

    try:
        content = extract_assistant_response(response)
        print(f"🤖 어시스턴트 응답: {content[:100]}...")
        try:
            parsed = json.loads(content)
            area = parsed.get("광역시/도")
            sigungu = parsed.get("시/군/구")
            print(f"📍 추출된 지역: {area} {sigungu}")
            return {
                "area": area,
                "sigungu": sigungu,
                "raw_response": content,
                "conversation_length": len(chat.get_conversation_history()),
                "success": True
            }
        except json.JSONDecodeError:
            print("⚠️ JSON 파싱 실패")
            return {
                "message": content,
                "warning": "⚠️ JSON 파싱 실패. 텍스트 응답입니다.",
                "conversation_length": len(chat.get_conversation_history()),
                "success": False
            }
    except Exception as e:
        print(f"⚠️ 예외 발생: {e}")
        return {"error": f"⚠️ 예외 발생: {e}"}

# ========================== ② 장소 추천 ==========================

@app.post("/recommend/place")
def recommend_place(data: UserRequest):
    print(f"🏃 장소 추천 요청")
    print(f"👤 사용자 메시지: {data.user_message}")

    location_response = chat.send_message(
        f"지역 추출: {data.user_message}",
        "9cf7cad215551390ac4363685aac8e0c1c69175e27ca3e09b604f799ba04dd35"
    )

    try:
        location_content = extract_assistant_response(location_response)
        parsed = json.loads(location_content)
        area_name = parsed.get("광역시/도")
        sigungu_name = parsed.get("시/군/구")

        print(f"📍 지역 정보 확인: {area_name} {sigungu_name}")

        candidates = get_filtered_tourist_data(area_name, sigungu_name)
        print(f"🔍 찾은 관광지 수: {len(candidates)}")

        if not candidates:
            return {
                "message": f"⚠️ {area_name} {sigungu_name}에서 추천할 수 있는 플로깅 장소를 찾지 못했습니다.",
                "conversation_length": len(chat.get_conversation_history())
            }

        brief_candidates = []
        for item in candidates:
            if not item.get("overview"):
                details = get_detailed_tourist_data(item["contentid"])
                item["overview"] = details.get("overview", "")[:300] if details else ""
            brief_candidates.append({
                "title": item["title"],
                "overview": item["overview"].split(". ")[0] + "." if item.get("overview") else "상세 정보가 없습니다.",
                "address": item.get("address", "주소 정보 없음")
            })

        places_text = "\n".join([f"- {item['title']}: {item['address']}" for item in brief_candidates])

        recommendation_response = chat.send_message(
            f"{area_name} {sigungu_name}의 플로깅 장소 추천 요청",
            "2ffd2d2c883494acba2768e9b02b3a8e018117b24480a0d099275485b795ed5e",
            {"recommended_place": places_text}
        )

        recommendation_content = extract_assistant_response(recommendation_response)

        print(f"✅ 장소 추천 완료: {len(brief_candidates)}개 장소")

        return {
            "recommended_places": brief_candidates,
            "chat_reply": recommendation_content,
            "area": area_name,
            "sigungu": sigungu_name,
            "conversation_length": len(chat.get_conversation_history()),
            "success": True
        }

    except Exception as e:
        print(f"⚠️ 예외 발생: {e}")
        return {"error": f"⚠️ 예외 발생: {e}"}

# ========================== ③ 경로 추천 ==========================

@app.post("/recommend/route")
def recommend_route(data: UserRequest):
    print(f"🗺️ 경로 추천 요청")
    print(f"👤 사용자 메시지: {data.user_message}")

    response = chat.send_message(
        data.user_message,
        "2ffd2d2c883494acba2768e9b02b3a8e018117b24480a0d099275485b795ed5e"
    )

    try:
        content = extract_assistant_response(response)
        print(f"✅ 경로 추천 완료")
        return {
            "route_recommendation": content,
            "conversation_length": len(chat.get_conversation_history()),
            "success": True
        }
    except Exception as e:
        print(f"⚠️ 예외 발생: {e}")
        return {"error": f"⚠️ 예외 발생: {e}"}

# ========================== ④ 일반 대화 ==========================

@app.post("/chat/general")
def general_chat(data: UserRequest):
    print(f"💬 일반 대화 요청")
    print(f"👤 사용자 메시지: {data.user_message}")

    response = chat.send_message(
        data.user_message,
        "2ffd2d2c883494acba2768e9b02b3a8e018117b24480a0d099275485b795ed5e"
    )

    try:
        content = extract_assistant_response(response)
        return {
            "response": content,
            "conversation_length": len(chat.get_conversation_history()),
            "success": True
        }
    except Exception as e:
        return {"error": f"⚠️ 예외 발생: {e}"}

# ========================== 상태 확인 ==========================

@app.get("/")
def root():
    return {
        "message": "🚀 플로깅 추천 API 서버가 정상 작동중입니다!",
        "conversation_length": len(chat.get_conversation_history()),
        "endpoints": {
            "location_extract": "/location/extract",
            "place_recommend": "/recommend/place", 
            "route_recommend": "/recommend/route",
            "general_chat": "/chat/general"
        }
    }

if __name__ == '__main__':
    print("🚀 플로깅 추천 API 서버 시작!")
    print("📝 멀티턴 대화 지원")
    print("🔗 Swagger UI: http://localhost:8000/docs")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, workers=1, limit_concurrency=1000, reload=True)
