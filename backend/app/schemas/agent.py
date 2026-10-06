from typing import Optional, List
from pydantic import BaseModel

class AgentPersonality(BaseModel):
    name: str
    description: str
    system_instruction: str
    traits: List[str]

class GroqModelInfo(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    context_window: Optional[int] = None
    is_available: bool = True
