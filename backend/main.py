from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from tour_api import get_filtered_tourist_data, get_detailed_tourist_data
from laas_api import MultiTurnChat
import json
import uuid
import config
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 세션별 MultiTurnChat 인스턴스 저장
chat_sessions: Dict[str, MultiTurnChat] = {}

# ========================== 모델 정의 ==========================

class UserRequest(BaseModel):
    user_message: str
    session_id: Optional[str] = None

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

# ========================== 유틸 함수 ==========================

def get_or_create_chat(session_id: Optional[str]) -> tuple[str, MultiTurnChat]:
    """세션이 존재하면 가져오고, 없으면 새로 생성"""
    if not session_id:
        session_id = str(uuid.uuid4())
        print(f"🆕 새로운 세션 생성: {session_id}")
    
    if session_id not in chat_sessions:
        # MultiTurnChat 인스턴스 생성 (API 키와 프로젝트 코드는 클래스 내부에서 설정됨)
        chat_sessions[session_id] = MultiTurnChat()
        print(f"📝 세션 {session_id}에 새로운 MultiTurnChat 생성")
    
    return session_id, chat_sessions[session_id]

def extract_assistant_response(response) -> str:
    """LaaS API 응답에서 어시스턴트 메시지 추출"""
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
    """유저 메시지에서 지역과 시군구를 추출 (멀티턴 대화 지원)"""
    session_id, chat = get_or_create_chat(data.session_id)
    
    print(f"🔍 지역 추출 요청 - 세션: {session_id}")
    print(f"👤 사용자 메시지: {data.user_message}")

    print(f"📊 현재 대화 기록: {chat.get_conversation_history()}")
    # 지역 추출 프롬프트로 메시지 전송 (대화 기록 자동 관리됨)
    response = chat.send_message(
        data.user_message,
        "9cf7cad215551390ac4363685aac8e0c1c69175e27ca3e09b604f799ba04dd35"
    )

    if not response or response.status_code != 200:
        print("❌ LaaS API 응답 실패")
        return {"error": "❌ 챗봇 응답 실패", "session_id": session_id}

    try:
        content = extract_assistant_response(response)
        if not content:
            return {"error": "❌ 응답 내용이 없습니다", "session_id": session_id}
        
        print(f"🤖 어시스턴트 응답: {content[:100]}...")
        
        # JSON 파싱 시도
        try:
            parsed = json.loads(content)
            area = parsed.get("광역시/도")
            sigungu = parsed.get("시/군/구")
            
            print(f"📍 추출된 지역: {area} {sigungu}")
            
            return {
                "session_id": session_id,
                "area": area,
                "sigungu": sigungu,
                "raw_response": content,
                "conversation_length": len(chat.get_conversation_history()),
                "success": True
            }
        except json.JSONDecodeError:
            print("⚠️ JSON 파싱 실패 - 텍스트 응답 반환")
            return {
                "session_id": session_id,
                "message": content,
                "warning": "⚠️ JSON 파싱 실패. 텍스트 응답입니다.",
                "conversation_length": len(chat.get_conversation_history()),
                "success": False
            }

    except Exception as e:
        print(f"⚠️ 예외 발생: {e}")
        return {"error": f"⚠️ 예외 발생: {e}", "session_id": session_id}

# ========================== ② 장소 추천 ==========================

@app.post("/recommend/place")
def recommend_place(data: UserRequest):
    """지역 정보를 기반으로 플로깅 장소 추천 (멀티턴 대화 지원)"""
    session_id, chat = get_or_create_chat(data.session_id)
    
    print(f"🏃 장소 추천 요청 - 세션: {session_id}")
    print(f"👤 사용자 메시지: {data.user_message}")
    print(f"📊 현재 대화 길이: {len(chat.get_conversation_history())}")

    # 먼저 지역 정보를 추출 (이전 대화 맥락 고려)
    location_response = chat.send_message(
        f"지역 추출: {data.user_message}",
        "9cf7cad215551390ac4363685aac8e0c1c69175e27ca3e09b604f799ba04dd35"
    )

    if not location_response or location_response.status_code != 200:
        print("❌ 지역 추출 실패")
        return {"error": "❌ 지역 추출 실패", "session_id": session_id}

    try:
        location_content = extract_assistant_response(location_response)
        if not location_content:
            return {"error": "❌ 지역 추출 응답이 없습니다", "session_id": session_id}
        
        # 지역 정보 파싱
        try:
            parsed = json.loads(location_content)
            area_name = parsed.get("광역시/도")
            sigungu_name = parsed.get("시/군/구")
        except json.JSONDecodeError:
            print("⚠️ 지역 정보 JSON 파싱 실패")
            return {
                "session_id": session_id,
                "message": "⚠️ 지역 정보를 명확히 파악할 수 없습니다. 구체적인 지역명을 다시 말씀해주세요.",
                "conversation_length": len(chat.get_conversation_history())
            }

        if not area_name or not sigungu_name:
            print(f"⚠️ 불완전한 지역 정보: {area_name}, {sigungu_name}")
            return {
                "session_id": session_id,
                "message": "⚠️ 지역 정보가 충분하지 않습니다. '서울특별시 강남구'와 같이 구체적으로 말씀해주세요.",
                "conversation_length": len(chat.get_conversation_history())
            }

        print(f"📍 지역 정보 확인: {area_name} {sigungu_name}")

        # 관광지 데이터 가져오기
        candidates = get_filtered_tourist_data(area_name, sigungu_name)
        print(f"🔍 찾은 관광지 수: {len(candidates)}")
        
        if not candidates:
            return {
                "session_id": session_id,
                "message": f"⚠️ {area_name} {sigungu_name}에서 추천할 수 있는 플로깅 장소를 찾지 못했습니다.",
                "conversation_length": len(chat.get_conversation_history())
            }

        # 장소 정보 정리
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

        # 추천 메시지 생성
        places_text = "\n".join([f"- {item['title']}: {item['address']}" for item in brief_candidates])
        
        # 장소 추천 프롬프트로 메시지 전송
        recommendation_response = chat.send_message(
            f"{area_name} {sigungu_name}의 플로깅 장소 추천 요청",
            "2ffd2d2c883494acba2768e9b02b3a8e018117b24480a0d099275485b795ed5e",
            {"recommended_place": places_text}
        )

        recommendation_content = extract_assistant_response(recommendation_response) if recommendation_response else "추천 결과를 생성할 수 없습니다."
        
        print(f"✅ 장소 추천 완료: {len(brief_candidates)}개 장소")

        return {
            "session_id": session_id,
            "recommended_places": brief_candidates,
            "chat_reply": recommendation_content,
            "area": area_name,
            "sigungu": sigungu_name,
            "conversation_length": len(chat.get_conversation_history()),
            "success": True
        }

    except Exception as e:
        print(f"⚠️ 예외 발생: {e}")
        return {"error": f"⚠️ 예외 발생: {e}", "session_id": session_id}

# ========================== ③ 경로 추천 ==========================

@app.post("/recommend/route")
def recommend_route(data: UserRequest):
    """추천된 장소를 기반으로 플로깅 경로 추천 (멀티턴 대화 지원)"""
    session_id, chat = get_or_create_chat(data.session_id)
    
    print(f"🗺️ 경로 추천 요청 - 세션: {session_id}")
    print(f"👤 사용자 메시지: {data.user_message}")
    print(f"📊 현재 대화 길이: {len(chat.get_conversation_history())}")

    # 이전 대화 맥락을 고려한 경로 추천 (멀티턴 대화의 핵심!)
    response = chat.send_message(
        data.user_message,
        "2ffd2d2c883494acba2768e9b02b3a8e018117b24480a0d099275485b795ed5e"
    )

    if not response or response.status_code != 200:
        print("❌ 경로 추천 응답 실패")
        return {"error": "❌ 경로 추천 실패", "session_id": session_id}

    try:
        content = extract_assistant_response(response)
        if not content:
            return {"error": "❌ 경로 추천 응답이 없습니다", "session_id": session_id}
        
        print(f"✅ 경로 추천 완료")
        
        return {
            "session_id": session_id,
            "route_recommendation": content,
            "conversation_length": len(chat.get_conversation_history()),
            "success": True
        }

    except Exception as e:
        print(f"⚠️ 예외 발생: {e}")
        return {"error": f"⚠️ 예외 발생: {e}", "session_id": session_id}

# ========================== ④ 일반 대화 ==========================

@app.post("/chat/general")
def general_chat(data: UserRequest):
    """일반적인 대화 처리 (멀티턴 대화 지원)"""
    session_id, chat = get_or_create_chat(data.session_id)
    
    print(f"💬 일반 대화 요청 - 세션: {session_id}")
    print(f"👤 사용자 메시지: {data.user_message}")

    # 범용 프롬프트로 대화 처리 (실제 프롬프트 ID로 교체 필요)
    response = chat.send_message(
        data.user_message,
        "2ffd2d2c883494acba2768e9b02b3a8e018117b24480a0d099275485b795ed5e"  # 기본 프롬프트 사용
    )

    if not response or response.status_code != 200:
        return {"error": "❌ 대화 처리 실패", "session_id": session_id}

    try:
        content = extract_assistant_response(response)
        if not content:
            return {"error": "❌ 응답 내용이 없습니다", "session_id": session_id}
        
        return {
            "session_id": session_id,
            "response": content,
            "conversation_length": len(chat.get_conversation_history()),
            "success": True
        }

    except Exception as e:
        return {"error": f"⚠️ 예외 발생: {e}", "session_id": session_id}

# ========================== 추가 유틸 엔드포인트 ==========================

@app.get("/chat/history/{session_id}")
def get_history(session_id: str):
    """대화 기록 조회"""
    if session_id not in chat_sessions:
        return {"error": "❌ 세션이 존재하지 않습니다", "session_id": session_id}
    
    try:
        history = chat_sessions[session_id].get_conversation_history()
        return {
            "session_id": session_id,
            "history": history,
            "total_messages": len(history),
            "success": True
        }
    except Exception as e:
        return {
            "session_id": session_id,
            "error": f"⚠️ 대화 기록 조회 실패: {e}",
            "history": []
        }

@app.delete("/chat/clear/{session_id}")
def clear_session(session_id: str):
    """세션 및 대화 기록 삭제"""
    if session_id in chat_sessions:
        del chat_sessions[session_id]
        print(f"🗑️ 세션 {session_id} 삭제 완료")
        return {
            "message": "✅ 세션 및 대화 기록 삭제 완료", 
            "session_id": session_id,
            "success": True
        }
    return {"error": "❌ 세션이 존재하지 않습니다", "session_id": session_id}

@app.get("/chat/sessions")
def get_active_sessions():
    """활성 세션 목록 조회"""
    session_info = {}
    for session_id, chat in chat_sessions.items():
        session_info[session_id] = {
            "conversation_length": len(chat.get_conversation_history()),
            "last_message": chat.get_conversation_history()[-1] if chat.get_conversation_history() else None
        }
    
    return {
        "active_sessions": list(chat_sessions.keys()),
        "total_sessions": len(chat_sessions),
        "session_details": session_info,
        "success": True
    }

@app.post("/chat/reset/{session_id}")
def reset_session_history(session_id: str):
    """특정 세션의 대화 기록만 초기화 (세션은 유지)"""
    if session_id not in chat_sessions:
        return {"error": "❌ 세션이 존재하지 않습니다", "session_id": session_id}
    
    try:
        # MultiTurnChat의 clear_history 메서드 사용
        chat_sessions[session_id].clear_history()
        print(f"🔄 세션 {session_id} 대화 기록 초기화 완료")
        
        return {
            "message": "✅ 대화 기록 초기화 완료", 
            "session_id": session_id,
            "success": True
        }
    except Exception as e:
        return {"error": f"⚠️ 대화 기록 초기화 실패: {e}", "session_id": session_id}

@app.get("/")
def root():
    """API 상태 확인"""
    return {
        "message": "🚀 플로깅 추천 API 서버가 정상 작동중입니다!",
        "active_sessions": len(chat_sessions),
        "endpoints": {
            "location_extract": "/location/extract",
            "place_recommend": "/recommend/place", 
            "route_recommend": "/recommend/route",
            "general_chat": "/chat/general",
            "get_history": "/chat/history/{session_id}",
            "clear_session": "/chat/clear/{session_id}",
            "reset_history": "/chat/reset/{session_id}",
            "active_sessions": "/chat/sessions"
        }
    }

if __name__ == '__main__':
    print("🚀 플로깅 추천 API 서버 시작!")
    print("📝 멀티턴 대화 지원")
    print("🔗 Swagger UI: http://localhost:8000/docs")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, workers=1, limit_concurrency=1000, reload=True)