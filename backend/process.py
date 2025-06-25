import json
from tour_api import get_filtered_tourist_data, get_detailed_tourist_data
from typing import Optional, Tuple
from laas_api import MultiTurnChat
from typing import List, Dict

#1분기 유저 입력에서 지역, 시군구 추출 
def extract_location_from_query(
    user_message: str, 
    chat: MultiTurnChat, 
):
    
    #지역 추출 해쉬 값 적용
    response = chat.send_message(user_message,"9cf7cad215551390ac4363685aac8e0c1c69175e27ca3e09b604f799ba04dd35")
    
    if response is None:
        print("❌ 챗봇 응답 실패")
        return None, None

    try:
        response_data = response.json()
        assistant_message = response_data['choices'][0]['message']['content']
        
        # JSON 파싱
        # function call로 판별할지는 추후 고민
        parsed = json.loads(assistant_message)
        area_name = parsed.get("광역시/도")
        sigungu_name = parsed.get("시/군/구")

        #멀티턴 언제까지 유지할지 보고 추가
        #del chat
        print("****파싱 성공****")
        print(f"광역시/도 = {area_name}, 시/군/구 = {sigungu_name}")
        # ✅ 파싱 성공 : Tour API 호출
        
        tourist_data_select(area_name, sigungu_name,chat)

    except json.JSONDecodeError:
        # ❌ JSON 아님 → 유저 화면에 표시하고 재시도
        print("⚠️ JSON 파싱 실패, 사용자에게 재시도 요청")
        user_input = input().strip()

        extract_location_from_query(user_input, chat)

    except Exception as e:
        print(f"⚠️ 예외 발생: {e}")

#2분기 플로깅 장소 추천
def tourist_data_select(area_name: str, sigungu_name: str, chat):
    candidates = get_filtered_tourist_data(area_name, sigungu_name)
    print(f"📍 디버깅: 후보 관광지 수: {len(candidates)}")

    brief_candidates = []
    for item in candidates:
        if not item['overview']:
            details = get_detailed_tourist_data(item['contentid'])
            if details.get('overview'):
                item['overview'] = details['overview'][:300]
        brief_candidates.append({
            "title": item["title"],
            "overview": item["overview"].split(". ")[0] + "." if item["overview"] else "",
            "address": item["address"]
        })

    print("📍 디버깅: 요약된 관광지 목록 예시:")
    for c in brief_candidates[:3]:
        print(f"- {c['title']}: {c['address']}")

    # ✅ 여기가 핵심: 추천 장소 리스트 포맷팅
    recommended_place_str = "\n".join(
        [f"- {item['title']}: {item['address']}" for item in brief_candidates]
    )

    param = {
        "recommended_place": recommended_place_str
    }

    print("📍 전달될 추천 장소 목록:")
    print(recommended_place_str)

    user_message = f"{area_name} {sigungu_name}"
    response = chat.send_message(
        user_message,
        "2ffd2d2c883494acba2768e9b02b3a8e018117b24480a0d099275485b795ed5e",
        param
    )
    response_data = response.json()
    assistant_message = response_data['choices'][0]['message']['content']
    
    #유저 입력 부분 (번호 입력 or 장소명 입력)
    user_input = input().strip()
    
    flogging_rout_recommend(user_input)
    
    
def flogging_rout_recommend(
    user_message: str, 
    chat: MultiTurnChat, 
):
    """플로깅 투어 추천"""
    
    # 플로깅 투어 추천 해시 값 적용
    response = chat.send_message(user_message, "2ffd2d2c883494acba2768e9b02b3a8e018117b24480a0d099275485b795ed5e")
    
    if response is None:
        print("❌ 챗봇 응답 실패")
        return None

    try:
        response_data = response.json()
        assistant_message = response_data['choices'][0]['message']['content']
        print(f"Assistant: {assistant_message}")
        
    except Exception as e:
        print(f"⚠️ 예외 발생: {e}")



if __name__ == "__main__":
    print("=== 플로깅 투어 ===")
    user_input = input("").strip()

    chat = MultiTurnChat()
    
    extract_location_from_query(user_input,chat)  # 해시 값은 동적으로 설정