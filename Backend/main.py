from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from containers import Container
from user.interface.controllers.user_controller import router as user_router
from common.auth_middleware import create_middlewares

app = FastAPI(title="NAVI Backend", version="0.1.0")
create_middlewares(app)

container = Container()
container.wire(modules=["user.interface.controllers.user_controller"])


@app.get("/")
def health():
    return {"ok": True}


# 유저 관련 API 라우터 등록
app.include_router(user_router)


# Swagger에 BearerAuth 추가
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    openapi_schema["security"] = [{"BearerAuth": []}]  # 전체 엔드포인트 적용
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi
