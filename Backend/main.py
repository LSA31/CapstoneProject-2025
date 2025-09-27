from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

from common.auth_middleware import create_middlewares
from como.interface.controllers.como_controller import router as como_router
from como.interface.controllers.como_ws_controller import router as como_ws_router
from diary.interface.controllers.diary_controller import router as diary_router
from user.interface.controllers.user_controller import router as user_router
from containers import Container

app = FastAPI(title="COMO Backend", version="0.1.0")
create_middlewares(app)

container = Container()
container.wire(
    modules=[
        "user.interface.controllers.user_controller",
        "diary.interface.controllers.diary_controller",
    ]
)


@app.get("/")
def health():
    return {"ok": True}


app.include_router(user_router)
app.include_router(diary_router)
app.include_router(como_router)
app.include_router(como_ws_router)


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
    openapi_schema["security"] = [{"BearerAuth": []}]

    for path, methods in openapi_schema["paths"].items():
        if path not in ["/users/register", "/users/login"]:
            for method in methods:
                openapi_schema["paths"][path][method]["security"] = [{"BearerAuth": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi
