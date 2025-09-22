import os

from dependency_injector import containers, providers
from dotenv import load_dotenv

from como.application.como_service import ComoService
from como.infra.repository.firebase_como_repo import FirebaseComoRepository
from diary.application.diary_service import DiaryService
from diary.infra.repository.firebase_diary_repo import FirebaseDiaryRepository
from user.application.user_service import UserService
from user.infra.auth.firebase_auth_service import FirebaseAuthService
from user.infra.repository.firebase_user_repo import FirebaseUserRepository

load_dotenv()


class Container(containers.DeclarativeContainer):
    wiring_config = containers.WiringConfiguration(
        modules=["user.interface.controllers.user_controller"]
    )

    user_repo = providers.Singleton(FirebaseUserRepository)

    auth_service = providers.Singleton(
        FirebaseAuthService,
        cred_path=os.getenv("FIREBASE_CREDENTIALS"),
    )

    user_service = providers.Factory(
        UserService,
        repo=user_repo,
        auth_service=auth_service,
    )

    diary_repo = providers.Singleton(FirebaseDiaryRepository)

    diary_service = providers.Factory(
        DiaryService,
        repo=diary_repo,
    )

    como_repo = providers.Singleton(FirebaseComoRepository)
    como_service = providers.Factory(
        ComoService,
        repo=como_repo,
    )
