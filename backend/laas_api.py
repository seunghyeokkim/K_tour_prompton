import requests
from typing import List, Dict, Any

class MultiTurnChat:
    def __init__(self, api_key: str = None, project_code: str = None):
        self.api_key = "5f4c07f58cf66be3a43d3808e287c22b2f9e4a8c7f7611c40160367a808e4f13"
        self.project_code = "KNTO-PROMPTON-118"
        self.conversation_history = []  # 대화 히스토리 저장
        self.laas_chat_url = "https://api-laas.wanted.co.kr/api/preset/v2/chat/completions"
        self.headers = {
            "project": self.project_code,
            "apiKey": self.api_key,
            "Content-Type": "application/json; charset=utf-8"
        }

    def add_message(self, role: str, content: str):
        self.conversation_history.append({
            "role": role,
            "content": content
        })

    def send_message(self, user_message: str, hash: str, param: str=None) -> requests.Response:
        """동적으로 해시 값을 받아 메시지 전송"""
        self.add_message("user", user_message)
        
        data = {
            "hash": hash,  # 동적 해시
            "params": param,
            "messages": self.conversation_history.copy()
        }

        try:
            response = requests.post(self.laas_chat_url, headers=self.headers, json=data)
            if response.status_code == 200:
                response_data = response.json()
                if 'choices' in response_data and len(response_data['choices']) > 0:
                    assistant_message = response_data['choices'][0]['message']['content']
                    self.add_message("assistant", assistant_message)
                else:
                    print("No assistant message received.")
            else:
                print(f"Error: {response.status_code}, {response.text}")
            return response
        except Exception as e:
            print(f"An error occurred: {e}")
            return None

    
    def send_message_with_image(self, user_message: str, image_url: str) -> requests.Response:
        """이미지와 함께 메시지 보내기"""
        # 이미지와 텍스트를 포함한 메시지 구성
        message_content = [
            {
                "type": "image_url",
                "image_url": {
                    "url": image_url
                }
            },
            {
                "type": "text",
                "text": user_message
            }
        ]
        
        # 사용자 메시지를 히스토리에 추가
        self.conversation_history.append({
            "role": "user",
            "content": message_content
        })
        
        # 요청 데이터 구성
        data = {
            "hash": self.hash,
            "params": {},
            "messages": self.conversation_history.copy()
        }
        
        try:
            response = requests.post(self.laas_chat_url, headers=self.headers, json=data)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'choices' in response_data and len(response_data['choices']) > 0:
                    assistant_message = response_data['choices'][0]['message']['content']
                    self.add_message("assistant", assistant_message)
                else:
                    print("No response from assistant")
            else:
                print(f"Error: {response.status_code}, {response.text}")
                
            return response
            
        except Exception as e:
            print(f"An error occurred: {e}")
            return None
    
    def get_conversation_history(self) -> List[Dict[str, Any]]:
        """현재 대화 히스토리 반환"""
        return self.conversation_history.copy()
    
    def clear_history(self):
        """대화 히스토리 초기화"""
        self.conversation_history = []
        print("Conversation history cleared.")
    
    def save_conversation(self, filename: str):
        """대화 히스토리를 파일로 저장"""
        import json
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(self.conversation_history, f, ensure_ascii=False, indent=2)
        print(f"Conversation saved to {filename}")
    
    def load_conversation(self, filename: str):
        """파일에서 대화 히스토리 불러오기"""
        import json
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                self.conversation_history = json.load(f)
            print(f"Conversation loaded from {filename}")
        except FileNotFoundError:
            print(f"File {filename} not found.")
        except json.JSONDecodeError:
            print(f"Invalid JSON in {filename}")

# # 사용 예시
# if __name__ == "__main__":
#     # 멀티턴 채팅 인스턴스 생성
#     chat = MultiTurnChat(hash="your_hash_here")
    
#     # 대화 시작
#     print("=== 멀티턴 대화 시작 ===")
    
#     # 첫 번째 메시지
#     chat.send_message("안녕하세요! 파이썬에 대해 질문이 있습니다.")
    
#     # 두 번째 메시지 (이전 대화 맥락 유지)
#     chat.send_message("리스트와 튜플의 차이점을 설명해주세요.")
    
#     # 세 번째 메시지 (계속해서 맥락 유지)
#     chat.send_message("그럼 언제 리스트를 사용하고 언제 튜플을 사용하는게 좋나요?")
    
#     # 대화 히스토리 확인
#     print("\n=== 대화 히스토리 ===")
#     for i, message in enumerate(chat.get_conversation_history()):
#         print(f"{i+1}. {message['role']}: {message['content']}")
    
#     # 이미지와 함께 메시지 보내기
#     print("\n=== 이미지와 함께 메시지 ===")
#     chat.send_message_with_image(
#         "이 이미지에 대해 설명해주세요.",
#         "https://static.wanted.co.kr/images/wdes/0_4.d217341b.jpg"
#     )
    
#     # 대화 저장
#     chat.save_conversation("conversation_history.json")

# 간단한 사용을 위한 함수들

def create_chat_session(hash: str) -> MultiTurnChat:
    """새로운 채팅 세션 생성"""
    return MultiTurnChat(hash)

def continue_conversation(chat: MultiTurnChat, message: str):
    """기존 대화 세션에서 메시지 보내기"""
    return chat.send_message(message)