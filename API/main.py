from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional
from tour_api import get_filtered_tourist_data, get_detailed_tourist_data
from laas_api import MultiTurnChat
import json
import uuid
import config

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

chat_sessions: Dict[str, MultiTurnChat] = {}

# ========================== 모델 정의 ==========================

class UserRequest(BaseModel):
    user_message: str
    session_id: Optional[str] = None

# ========================== 유틸 함수 ==========================

def get_or_create_chat(session_id: Optional[str]) -> tuple[str, MultiTurnChat]:
    """세션이 존재하면 가져오고, 없으면 새로 생성"""
    if not session_id:
        session_id = str(uuid.uuid4())
        print(f"🆕 새로운 세션 생성: {session_id}")
    if session_id not in chat_sessions:
        chat_sessions[session_id] = MultiTurnChat()
    return session_id, chat_sessions[session_id]

# ========================== ① 지역 추출 ==========================

@app.post("/location/extract")
def extract_location(data: UserRequest):
    """유저 메시지에서 지역과 시군구를 추출"""
    session_id, chat = get_or_create_chat(data.session_id)

    response = chat.send_message(
        data.user_message,
        "9cf7cad215551390ac4363685aac8e0c1c69175e27ca3e09b604f799ba04dd35"
    )

    if not response:
        return {"error": "❌ 챗봇 응답 실패", "session_id": session_id}

    try:
        content = response.json()["choices"][0]["message"]["content"]
        try:
            parsed = json.loads(content)
            return {
                "session_id": session_id,
                "area": parsed.get("광역시/도"),
                "sigungu": parsed.get("시/군/구"),
                "raw_response": content
            }
        except json.JSONDecodeError:
            return {
                "session_id": session_id,
                "message": content,
                "warning": "⚠️ JSON 파싱 실패. 수동 입력 필요"
            }

    except Exception as e:
        return {"error": f"⚠️ 예외 발생: {e}", "session_id": session_id}

# ========================== ② 장소 추천 ==========================

@app.post("/recommend/place")
def recommend_place(data: UserRequest):
    """추출된 지역과 시군구를 기반으로 플로깅 장소 추천"""
    session_id, chat = get_or_create_chat(data.session_id)

    # 먼저 지역 추출
    response = chat.send_message(
        data.user_message,
        "9cf7cad215551390ac4363685aac8e0c1c69175e27ca3e09b604f799ba04dd35"
    )

    if not response:
        return {"error": "❌ 챗봇 응답 실패", "session_id": session_id}

    try:
        parsed = json.loads(response.json()["choices"][0]["message"]["content"])
        area_name = parsed.get("광역시/도")
        sigungu_name = parsed.get("시/군/구")

        if not area_name or not sigungu_name:
            return {
                "session_id": session_id,
                "message": "⚠️ 지역 정보가 충분하지 않습니다."
            }

        # 관광지 데이터 가져오기
        candidates = get_filtered_tourist_data(area_name, sigungu_name)
        brief_candidates = []

        for item in candidates:
            if not item["overview"]:
                details = get_detailed_tourist_data(item["contentid"])
                item["overview"] = details.get("overview", "")[:300]
            brief_candidates.append({
                "title": item["title"],
                "overview": item["overview"].split(". ")[0] + "." if item["overview"] else "",
                "address": item["address"]
            })

        # 추천 응답
        param = {
            "recommended_place": "\n".join([f"- {item['title']}: {item['address']}" for item in brief_candidates])
        }

        followup = chat.send_message(
            f"{area_name} {sigungu_name} 관광지 추천",
            "2ffd2d2c883494acba2768e9b02b3a8e018117b24480a0d099275485b795ed5e",
            param
        )

        final_reply = followup.json()["choices"][0]["message"]["content"] if followup else "추천 결과 없음"

        return {
            "session_id": session_id,
            "recommended_places": brief_candidates,
            "chat_reply": final_reply
        }

    except Exception as e:
        return {"error": f"⚠️ 예외 발생: {e}", "session_id": session_id}

# ========================== ③ 경로 추천 ==========================

@app.post("/recommend/route")
def recommend_route(data: UserRequest):
    """추천된 장소를 기반으로 플로깅 경로 추천"""
    session_id, chat = get_or_create_chat(data.session_id)

    response = chat.send_message(
        data.user_message,
        "2ffd2d2c883494acba2768e9b02b3a8e018117b24480a0d099275485b795ed5e"
    )

    if not response:
        return {"error": "❌ 챗봇 응답 실패", "session_id": session_id}

    try:
        content = response.json()["choices"][0]["message"]["content"]
        return {
            "session_id": session_id,
            "route_recommendation": content
        }

    except Exception as e:
        return {"error": f"⚠️ 예외 발생: {e}", "session_id": session_id}

# ========================== 추가 유틸 엔드포인트 ==========================

@app.get("/chat/history/{session_id}")
def get_history(session_id: str):
    if session_id not in chat_sessions:
        return {"error": "❌ 세션이 존재하지 않습니다"}
    return {
        "session_id": session_id,
        "history": chat_sessions[session_id].get_conversation_history()
    }

@app.delete("/chat/clear/{session_id}")
def clear_session(session_id: str):
    if session_id in chat_sessions:
        del chat_sessions[session_id]
        return {"message": "세션 삭제 완료", "session_id": session_id}
    return {"error": "❌ 세션이 존재하지 않습니다"}
