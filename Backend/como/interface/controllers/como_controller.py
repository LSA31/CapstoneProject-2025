from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from dependency_injector.wiring import inject, Provide
from como.application.como_service import ComoService
from containers import Container
from common.context_vars import user_context

router = APIRouter(prefix="/como", tags=["como"])


class ComoCreateRequest(BaseModel):
    device_id: str
    name: str


@router.post("")
@inject
def create_como(
    req: ComoCreateRequest,
    service: ComoService = Depends(Provide[Container.como_service]),
):
    current = user_context.get()
    if current == "Anonymous":
        raise HTTPException(status_code=401, detail="Unauthorized")

    como = service.create(
        owner_id=current.uid,
        device_id=req.device_id,
        name=req.name,
    )
    return como.__dict__


@router.get("")
@inject
def get_como(
    service: ComoService = Depends(Provide[Container.como_service]),
):
    current = user_context.get()
    if current == "Anonymous":
        raise HTTPException(status_code=401, detail="Unauthorized")

    como = service.get(current.uid)
    if not como:
        raise HTTPException(status_code=404, detail="Como not found")

    return como.__dict__
