from abc import ABC, abstractmethod
from typing import Optional, List
from como.domain.como import Como


class ComoRepository(ABC):
    @abstractmethod
    def save(self, como: Como) -> Como:
        raise NotImplementedError

    @abstractmethod
    def get(self, owner_id: str) -> Optional[Como]:
        raise NotImplementedError

    @abstractmethod
    def delete(self, device_id: str) -> None:
        raise NotImplementedError
