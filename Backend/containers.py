import os
from dependency_injector import containers, providers
from user.application.user_service import UserService
from user.infra.repository.firebase_user_repo import FirebaseUserRepository
from user.infra.auth.firebase_auth_service import FirebaseAuthService
from dotenv import load_dotenv

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
