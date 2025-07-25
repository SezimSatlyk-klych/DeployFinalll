from fastapi import APIRouter, Body, HTTPException
from typing import List, Optional
from .db import SessionLocal, ChatSession, ChatMessage
from openai import AzureOpenAI
import os
import datetime
from pydantic import BaseModel

router = APIRouter()

# ---------- OpenAI client ----------
client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-02-15-preview"
)
DEPLOY = os.environ["AZURE_OPENAI_DEPLOYMENT"]

# ---------- модели ----------
class Msg(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Msg]
    session_id: Optional[int] = None

class AnalysisRequest(BaseModel):
    text: str

# ---------- endpoints ----------
@router.post("/ai/chat", tags=["AI"])
def chat(request: ChatRequest):
    db = SessionLocal()
    try:
        # 1. создаём / подбираем сессию
        if request.session_id is None:
            session = ChatSession(created_at=datetime.datetime.utcnow())
            db.add(session)
            db.commit()
            db.refresh(session)
            session_id = session.id
        else:
            session = db.query(ChatSession).get(request.session_id)
            if session is None:
                raise HTTPException(404, "session not found")
            session_id = request.session_id

        # 2. сохраняем сообщения пользователя
        for msg in request.messages:
            if msg.role == "user":
                db.add(ChatMessage(
                    session_id=session_id,
                    role="user",
                    content=msg.content
                ))
        
        # 3. отправляем в OpenAI
        resp = client.chat.completions.create(
            model=DEPLOY,
            messages=[m.dict() for m in request.messages],
        )
        answer = resp.choices[0].message.content

        # 4. сохраняем ответ ассистента
        db.add(ChatMessage(
            session_id=session_id,
            role="assistant",
            content=answer
        ))
        db.commit()

        return {"session_id": session_id, "response": answer}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error: {str(e)}")
    finally:
        db.close()

@router.post("/ai/analyze", tags=["AI"])
def analyze_text(request: AnalysisRequest):
    try:
        # Отправляем текст для анализа
        resp = client.chat.completions.create(
            model=DEPLOY,
            messages=[
                {"role": "system", "content": "Ты - аналитик. Проанализируй предоставленный текст и дай краткий анализ."},
                {"role": "user", "content": request.text}
            ],
        )
        analysis = resp.choices[0].message.content
        return {"analysis": analysis}
    except Exception as e:
        raise HTTPException(500, f"Error: {str(e)}")

@router.get("/ai/sessions", tags=["AI"])
def get_sessions():
    db = SessionLocal()
    try:
        sessions = db.query(ChatSession).all()
        return [{"id": s.id, "created_at": s.created_at} for s in sessions]
    finally:
        db.close()

@router.get("/ai/sessions/{session_id}/messages", tags=["AI"])
def get_session_messages(session_id: int):
    db = SessionLocal()
    try:
        session = db.query(ChatSession).get(session_id)
        if session is None:
            raise HTTPException(404, "session not found")
        
        messages = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.timestamp).all()
        
        return [{"role": m.role, "content": m.content, "timestamp": m.timestamp} for m in messages]
    finally:
        db.close() 