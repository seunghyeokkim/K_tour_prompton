from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from tour_api import get_filtered_tourist_data, get_detailed_tourist_data
from laas_api import MultiTurnChat
import json
import uuid

app = FastAPI()


# CORS 설정 (프론트에서 접근 가능하게)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 운영환경에서는 도메인 명시
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 세션별 채팅 인스턴스를 저장할 딕셔너리
chat_sessions: Dict[str, MultiTurnChat] = {}

class StartRequest(BaseModel):
    user_message: str
    session_id: Optional[str] = None  # 세션 ID 추가

class ChatRequest(BaseModel):
    user_message: str
    session_id: str  # 필수 세션 ID

class RouteRequest(BaseModel):
    user_message: str
    session_id: str  # chat_history 대신 session_id 사용

def get_or_create_chat_session(session_id: str = None) -> tuple[str, MultiTurnChat]:
    """세션 ID로 채팅 인스턴스를 가져오거나 새로 생성"""
    if session_id is None:
        session_id = str(uuid.uuid4())
        print("새로운 세션 생성:", session_id)
    
    if session_id not in chat_sessions:
        chat_sessions[session_id] = MultiTurnChat()
    
    return session_id, chat_sessions[session_id]

@app.post("/start")
def start_recommendation(data: StartRequest):
    """초기 여행지 추천 시작"""
    session_id, chat = get_or_create_chat_session(data.session_id)
    user_message = data.user_message

    response = chat.send_message(
        user_message,
        "9cf7cad215551390ac4363685aac8e0c1c69175e27ca3e09b604f799ba04dd35"
    )

    if response is None:
        return {"error": "❌ 챗봇 응답 실패", "session_id": session_id}

    try:
        assistant_message = response.json()["choices"][0]["message"]["content"]
        
        # JSON 파싱 시도
        try:
            parsed = json.loads(assistant_message)
            area_name = parsed.get("광역시/도")
            sigungu_name = parsed.get("시/군/구")

            if area_name and sigungu_name:
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

                # 후속 응답을 위한 파라미터 설정
                param = {
                    "recommended_place": "\n".join([f"- {item['title']}: {item['address']}" for item in brief_candidates])
                }

                # 추천 장소 정보와 함께 다시 메시지 전송
                response = chat.send_message(
                    f"{area_name} {sigungu_name} 관광지 추천",
                    "9cf7cad215551390ac4363685aac8e0c1c69175e27ca3e09b604f799ba04dd35",  # 실제 해시값으로 교체 필요
                    param
                )

                if response:
                    final_reply = response.json()["choices"][0]["message"]["content"]
                else:
                    final_reply = assistant_message

                return {
                    "chat_reply": final_reply
                    # "recommended_places": brief_candidates,
                    # "session_id": session_id,
                    # "area_info": {"area": area_name, "sigungu": sigungu_name}
                }

        except json.JSONDecodeError:
            # JSON이 아닌 일반 텍스트 응답
            pass

        return {
            "chat_reply": assistant_message,
            "session_id": session_id
        }

    except Exception as e:
        return {"error": f"⚠️ 예외 발생: {e}", "session_id": session_id}

@app.post("/chat")
def continue_chat(data: ChatRequest):
    """일반적인 멀티턴 대화 계속하기"""
    if data.session_id not in chat_sessions:
        return {"error": "❌ 유효하지 않은 세션 ID입니다."}
    
    chat = chat_sessions[data.session_id]
    
    response = chat.send_message(
        data.user_message,
        "9cf7cad215551390ac4363685aac8e0c1c69175e27ca3e09b604f799ba04dd35"  # 기본 해시값
    )

    if response is None:
        return {"error": "❌ 챗봇 응답 실패"}

    try:
        assistant_message = response.json()["choices"][0]["message"]["content"]
        return {
            "chat_reply": assistant_message,
            "session_id": data.session_id
        }

    except Exception as e:
        return {"error": f"⚠️ 예외 발생: {e}"}

@app.post("/route")
def recommend_route(data: RouteRequest):
    """여행 경로 추천"""
    if data.session_id not in chat_sessions:
        return {"error": "❌ 유효하지 않은 세션 ID입니다."}
    
    chat = chat_sessions[data.session_id]
    
    response = chat.send_message(
        data.user_message,
        "2ffd2d2c883494acba2768e9b02b3a8e018117b24480a0d099275485b795ed5e"
    )

    if response is None:
        return {"error": "❌ 챗봇 응답 실패"}

    try:
        assistant_message = response.json()["choices"][0]["message"]["content"]
        return {
            "route_recommendation": assistant_message,
            "session_id": data.session_id
        }

    except Exception as e:
        return {"error": f"⚠️ 예외 발생: {e}"}

@app.get("/chat_history/{session_id}")
def get_chat_history(session_id: str):
    """특정 세션의 대화 히스토리 조회"""
    if session_id not in chat_sessions:
        return {"error": "❌ 유효하지 않은 세션 ID입니다."}
    
    chat = chat_sessions[session_id]
    return {
        "session_id": session_id,
        "history": chat.get_conversation_history()
    }

@app.delete("/session/{session_id}")
def clear_session(session_id: str):
    """특정 세션 삭제"""
    if session_id in chat_sessions:
        del chat_sessions[session_id]
        return {"message": "세션이 삭제되었습니다.", "session_id": session_id}
    else:
        return {"error": "❌ 유효하지 않은 세션 ID입니다."}

@app.post("/reset_session")
def reset_session(data: ChatRequest):
    """특정 세션의 대화 히스토리만 초기화 (세션은 유지)"""
    if data.session_id not in chat_sessions:
        return {"error": "❌ 유효하지 않은 세션 ID입니다."}
    
    chat_sessions[data.session_id].clear_history()
    return {
        "message": "대화 히스토리가 초기화되었습니다.",
        "session_id": data.session_id
    }

@app.get("/sessions")
def list_sessions():
    """활성 세션 목록 조회"""
    return {
        "active_sessions": list(chat_sessions.keys()),
        "total_sessions": len(chat_sessions)
    }
