from contextvars import ContextVar

# 요청 단위로 현재 사용자 보관
user_context: ContextVar[str] = ContextVar("user_context", default="Anonymous")
