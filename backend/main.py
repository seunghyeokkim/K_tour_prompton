from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from tour_api import get_filtered_tourist_data, get_detailed_tourist_data
from laas_api import MultiTurnChat
import json
import uvicorn
import re
from config import HASH_LOCATION, HASH_PLACE, HASH_ROUTE, HASH_IMAGE, HASH_TRASHBAG, HASH_RAG

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

class extract_loaction_UserRequest(BaseModel):
    user_message: str

class recommend_place_UserRequest(BaseModel):
    user_message: str
    area_name: str
    sigungu_name: str
    
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ImageChatRequest(BaseModel):
    user_message: str
    image_url: str    

class TrashbagEvaluateRequest(BaseModel):
    prompt: str
    image_base64: str
class TrashRAG(BaseModel):
    area_name: str
    sigungu_name: str
    
# ========================== 유틸 함수 ==========================
# 1. 어시스턴트 응답 추출
def extract_assistant_response(response) -> str:
    try:
        if response and response.status_code == 200:
            response_data = response.json()
            if 'choices' in response_data and len(response_data['choices']) > 0:
                return response_data['choices'][0]['message']['content']
    except Exception as e:
        print(f"⚠️ 응답 파싱 실패: {e}")
    return None
# 2. 사용자 선택 장소 추출
def extract_user_pick_place(response) -> str:
    """
    LaaS 응답에서 'user_pick_place' 값을 추출합니다.
    (tool_calls 기반 함수 호출 응답을 처리함)
    """
    try:
        if response and response.status_code == 200:
            response_data = response.json()
            choices = response_data.get("choices", [])
            if choices:
                tool_calls = choices[0]["message"].get("tool_calls", [])
                if tool_calls:
                    arguments_str = tool_calls[0]["function"]["arguments"]
                    arguments = json.loads(arguments_str)
                    return arguments.get("user_pick_place")
    except Exception as e:
        print(f"⚠️ user_pick_place 파싱 실패: {e}")
    return None


# 3. 경로 정보 추출
def extract_route_location(response) -> Optional[dict]:
    try:
        if response and response.status_code == 200:
            response_data = response.json()
            if 'route' in response_data:
                route = response_data['route']
                return {
                    "start": route.get("start"),
                    "end": route.get("end"),
                    "distance": route.get("distance"),
                    "time": route.get("time")
                }
    except Exception as e:
        print(f"⚠️ 경로 정보 추출 실패: {e}")
    return None

# 4. 이미지 대화 응답 추출
def extract_image_chat_response(response) -> str:
    """
    이미지 대화 응답에서 어시스턴트 메시지를 추출합니다.
    """
    try:
        if response and response.status_code == 200:
            response_data = response.json()
            if 'choices' in response_data and len(response_data['choices']) > 0:
                return response_data['choices'][0]['message']['content']
    except Exception as e:
        print(f"⚠️ 이미지 대화 응답 파싱 실패: {e}")
    return None

# 5. 이미지 URL 유효성 검사
def validate_image_url(url: str) -> bool:
    """
    이미지 URL의 유효성을 간단히 검증합니다.
    """
    valid_extensions = ('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp')
    valid_schemes = ('http://', 'https://', 'data:image/')
    
    # URL 스키마 확인
    if not any(url.startswith(scheme) for scheme in valid_schemes):
        return False
    
    # data URL인 경우 별도 검증
    if url.startswith('data:image/'):
        return True
    
    # 일반 URL인 경우 확장자 확인
    return any(url.lower().endswith(ext) for ext in valid_extensions)
# ========================== ① 지역 추출 ==========================

@app.post("/location/extract")
def extract_location(data: extract_loaction_UserRequest):
    print(f"👤 사용자 메시지: {data.user_message}")
    print(f"📊 현재 대화 기록: {chat.get_conversation_history()}")

    response = chat.send_message(
        data.user_message,
        HASH_LOCATION
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
def recommend_place(data: recommend_place_UserRequest):
    print(f"🏃 장소 추천 요청")
    print(f"👤 사용자 메시지: {data.user_message}")
    print(f"📊 현재 대화 기록: {chat.get_conversation_history()}")
    
    user_input = data.user_message.strip()

    # ✅ 입력이 명확한 지역명일 경우 바로 처리 (예: "서울특별시 강남구")
    if " " in user_input and any(s in user_input for s in ["시", "도", "군", "구"]):
        # 관광지 검색 및 추천
        try:
            # 지역명에 따라서 Tour API에서 관광지 데이터 추출 (현재 50개)
            candidates = get_filtered_tourist_data(data.area_name, data.sigungu_name)
            chat.set_candidates(candidates)  # 후보 리스트 저장
            print(f"🔍 찾은 관광지 수: {len(candidates)}")

            if not candidates:
                return {
                    "message": f"⚠️ {data.area_name} {data.sigungu_name}에서 추천할 수 있는 플로깅 장소를 찾지 못했습니다.",
                    "conversation_length": len(chat.get_conversation_history())
                }
            places_text = "\n".join([f"- {item['title']}: {item['address']}" for item in candidates])

            recommendation_response = chat.send_message(
                f"{data.area_name} {data.sigungu_name}의 플로깅 장소 추천 요청",
                HASH_PLACE,
                {"recommended_place": places_text}
            )

            recommendation_content = extract_assistant_response(recommendation_response)

            print(f"✅ 장소 추천 완료: {len(candidates)}개 장소")

            return {
                "recommended_places": candidates,
                "chat_reply": recommendation_content,
                "area": data.area_name,
                "sigungu": data.sigungu_name,
                "conversation_length": len(chat.get_conversation_history()),
                "success": True
            }
        
        except Exception as e:
            print(f"⚠️ 예외 발생: {e}")
            return {"error": f"⚠️ 예외 발생: {e}"}
    else:
        # ✅ 복잡한 요청은 LaaS에 지역 추출 요청
        user_pick_response = chat.send_message(
            user_input,
            HASH_PLACE,
            {}
        )
        print("📦 LaaS 응답 내용:")
        user_pick_place = extract_user_pick_place(user_pick_response)
        print(user_pick_response.json())
        
        # ✅ 사용자가 선택한 장소가 존재할 경우 경로 계산
        if user_pick_place:
            print(f"🎯 사용자가 선택한 장소: {user_pick_place}")
            
            candidates = chat.get_candidates()
            # 시작점 정보 추출
            start_point = next((item for item in candidates if item["title"] == user_pick_place), None)
            if not start_point:
                return {"error": f"⚠️ 선택한 장소 '{user_pick_place}'를 후보 목록에서 찾을 수 없습니다."}

            start_x = float(start_point["mapx"])
            start_y = float(start_point["mapy"])

            def euclidean_distance(item):
                try:
                    dx = float(item["mapx"]) - start_x
                    dy = float(item["mapy"]) - start_y
                    return (dx**2 + dy**2) ** 0.5
                except Exception:
                    return float("inf")  # 좌표 오류시 큰 거리 부여

            # 시작점을 제외한 후보 중 거리 가까운 순 4개 선택
            nearby_candidates = sorted(
                [item for item in candidates if item["title"] != user_pick_place],
                key=euclidean_distance
            )[:4]

            # 최종 경로 리스트 (시작점 + 웨이포인트)
            final_route = [start_point] + nearby_candidates

            # 필요한 정보만 추출하여 반환
            route_summary = [
                {
                    "title": item["title"],
                    "mapx": item["mapx"],
                    "mapy": item["mapy"],
                    "address": item["address"]
                } for item in final_route
            ]
            print("📍 최종 추천 경로:")
            for i, item in enumerate(route_summary):
                if i == 0:
                    step = "출발지"
                elif i == len(route_summary) - 1:
                    step = "도착지"
                else:
                    step = f"경유지 {i}"
                print(f"{step}: {item['title']} (x: {item['mapx']}, y: {item['mapy']})")
            
            plain_text_lines = []

            for i, item in enumerate(route_summary):
                step = ""
                if i == 0:
                    step = " (출발지)"
                elif i == len(route_summary) - 1:
                    step = " (도착지)"
                
                line = f"{i+1}.{item['title']}: {item['address']}{step}"
                plain_text_lines.append(line)

            route_text = "\n".join(plain_text_lines)
            
            print(f"📜 추천 경로 요약:\n{route_text}")
            recommendation_response = chat.send_message(
                "플로깅 루트 추천 요청",
                HASH_ROUTE,
                {"recommended_route": route_text}
            )
            
            recommendation_content = extract_assistant_response(recommendation_response)
            print(f"🤖 어시스턴트 응답: \n {recommendation_response}")
            
            return {
                "chat_reply": recommendation_content,
                "user_pick_place": user_pick_place,
                "recommended_route": route_summary,
                "conversation_length": len(chat.get_conversation_history()),
                "success": True
            }
            
        else:
            return {"error": "❌ user_pick_place 값을 추출하지 못했습니다."}

#  ========================== ④ 이미지 대화 ==========================

@app.post("/chat/image")
def image_chat(data: ImageChatRequest):
    """
    이미지와 함께 대화를 진행하는 엔드포인트
    """
    print(f"🖼️ 이미지 대화 요청")
    print(f"👤 사용자 메시지: {data.user_message}")
    print(f"🔗 이미지 URL: {data.image_url[:50]}...")
    print(f"📊 현재 대화 기록: {len(chat.get_conversation_history())}개")

    # 이미지 URL 유효성 검증
    if not validate_image_url(data.image_url):
        return {
            "error": "⚠️ 올바르지 않은 이미지 URL 형식입니다. PNG, JPG, JPEG, GIF, BMP, WEBP 형식만 지원됩니다.",
            "success": False
        }

    try:
        
        # 이미지와 함께 메시지 전송
        response = chat.send_message_with_image(
            hash=HASH_IMAGE,
            user_message=data.user_message,
            image_url=data.image_url
        )

        if response is None:
            return {
                "error": "⚠️ 이미지 대화 API 호출에 실패했습니다.",
                "success": False
            }

        # 응답 추출
        assistant_response = extract_image_chat_response(response)
        
        if assistant_response:
            print(f"🤖 어시스턴트 응답: {assistant_response[:100]}...")
            
            return {
                "chat_reply": assistant_response,
                "conversation_length": len(chat.get_conversation_history()),
                "image_processed": True,
                "success": True
            }
        else:
            return {
                "error": "⚠️ 어시스턴트 응답을 추출할 수 없습니다.",
                "raw_response": response.text if response else "No response",
                "success": False
            }
            
    except Exception as e:
        print(f"⚠️ 이미지 대화 처리 중 예외 발생: {e}")
        return {
            "error": f"⚠️ 이미지 대화 처리 중 오류가 발생했습니다: {str(e)}",
            "success": False
        }

# ========================== ⑤ 쓰봉판단 ==========================

@app.post("/evaluate/trashbag")
def evaluate_trashbag(data: TrashbagEvaluateRequest):
    """
    플로깅 쓰봉판단 요청
    - prompt: 프롬프트(지시문)
    - image_base64: base64 인코딩 이미지
    """
    print(f"🗑️ 쓰봉판단 요청: {data.prompt[:30]}... (이미지 {len(data.image_base64)} bytes)")
    try:
        # LaaS API로 멀티모달 메시지 전송
        message_content = [
            {"type": "image_url", "image_url": {"url": data.image_base64}},
            {"type": "text", "text": data.prompt}
        ]
        chat.conversation_history.append({"role": "user", "content": message_content})
        req_data = {
            "hash": HASH_TRASHBAG,
            "params": {},
            "messages": chat.conversation_history.copy()
        }
        response = chat.send_message(
            user_message=data.prompt,
            hash=HASH_TRASHBAG,
            param=None
        )
        result = extract_assistant_response(response)
        print(f"🤖 쓰봉판단 결과: {result}")
        return {
            "result": result,
            "success": True
        }
    except Exception as e:
        print(f"⚠️ 쓰봉판단 처리 중 예외: {e}")
        return {"error": str(e), "success": False}

# ========================== ⑥ 플로깅 쓰레기통 RAG ==========================
@app.post("/location/trashRAG")
def get_trash_RAG(data: TrashRAG):
    """
    특정 지역의 플로깅 쓰레기통 위치 정보를 요청하고, 위도/경도 추출
    """
    print(f"📍 쓰레기통 RAG 요청: {data.area_name} {data.sigungu_name}")
    print(f"📊 현재 대화 기록: {chat.get_conversation_history()}")
    
    #이전 대화 기록 초기화
    chat.clear_history()
    message_content = f"{data.area_name} {data.sigungu_name} 지역의 쓰레기통 위치 정보 요청"

    response = chat.send_message(
        message_content,
        HASH_RAG
    )

    try:
        content = extract_assistant_response(response)
        print(f"🤖 어시스턴트 응답: {content}")

        try:
            # ✅ 배열 형태로 감싸기 전처리
            if not content.strip().startswith("["):
                # 쉼표로 구분된 다수의 JSON 객체 → 배열로 감싸기
                # (단순히 {} 블록을 찾아 배열 형태로 구성)
                json_objects = re.findall(r'{.*?}', content, re.DOTALL)
                content = "[" + ",".join(json_objects) + "]"

            trash_data = json.loads(content)
            
            if isinstance(trash_data, list):
                locations = []
                for item in trash_data:
                    try:
                        lat = float(item.get("위도"))
                        lng = float(item.get("경도"))
                        locations.append({
                            "name": item.get("설치장소명"),
                            "lat": lat,
                            "lng": lng,
                            "address": item.get("소재지도로명주소")
                        })
                    except Exception as e:
                        print(f"⚠️ 위도/경도 파싱 실패: {e}")
                        continue
                print(f"📍 추출된 쓰레기통 위치 수: {locations}")
                return {
                    "area": data.area_name,
                    "sigungu": data.sigungu_name,
                    "trash_locations": locations,
                    "count": len(locations),
                    "conversation_length": len(chat.get_conversation_history()),
                    "success": True
                }
            else:
                return {
                    "message": content,
                    "warning": "⚠️ 예상한 JSON 배열 형식이 아닙니다.",
                    "conversation_length": len(chat.get_conversation_history()),
                    "success": False
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

#========================== 상태 확인 ==========================

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
