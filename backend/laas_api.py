import requests
import config
from config import LAAS_URL, PROJECT_CODE, LAAS_API_KEY
from typing import List, Dict, Any

class MultiTurnChat:
    def __init__(self, api_key: str = None, project_code: str = None):
        self.api_key = LAAS_API_KEY
        self.project_code = PROJECT_CODE
        self.conversation_history = []  # 대화 히스토리 저장
        self.candidates = []
        self.laas_chat_url = LAAS_URL  # LaaS API URL
        self.headers = {
            "project": self.project_code,
            "apiKey": self.api_key,
            "Content-Type": "application/json; charset=utf-8"
        }

    def add_message(self, role: str, content: str):
        if content is None:
            print(f"⚠️ Skipped adding message because content is None (role: {role})")
            return
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

    
    def send_message_with_image(self, hash:str,user_message: str, image_url: str) -> requests.Response:
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
            "hash": hash,
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
        
    def set_candidates(self, items: List[Dict[str, Any]]):
        self.candidates = items

    def get_candidates(self) -> List[Dict[str, Any]]:
        return self.candidates
    
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
            
def find_similar_documents_by_text(collection_code: str, api_key: str, project_code: str, text: str, limit: int, offset: int):
    url = f"https://api-laas.wanted.co.kr/api/document/{collection_code}/similar/text"
    headers = {
        "Content-Type": "application/json",
        "apiKey": api_key,
        "project": project_code
    }
    data = {
        "text": text,
        "limit": limit,
        "offset": offset
    }
    return requests.post(url, headers=headers, json=data)

# if __name__ == '__main__':
#     requsets_trash = find_similar_documents_by_text(
#         collection_code="RAG",
#         api_key=LAAS_API_KEY,
#         project_code=PROJECT_CODE,
#         text="서울 구로구 쓰레기통 위치",
#         limit=20,
#         offset=0
#     )
    
#     print(requsets_trash.status_code)
#     print(requsets_trash.json())