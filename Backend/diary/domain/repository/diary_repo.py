from abc import ABC, abstractmethod
from typing import List, Optional

from diary.domain.diary import Diary


class DiaryRepository(ABC):
    @abstractmethod
    def save(self, diary: Diary) -> Diary:
        raise NotImplementedError

    @abstractmethod
    def get(self, author_id: str, diary_id: str) -> Optional[Diary]:
        raise NotImplementedError

    @abstractmethod
    def list(self, author_id: str) -> List[Diary]:
        raise NotImplementedError

    @abstractmethod
    def delete(self, author_id: str, diary_id: str) -> None:
        raise NotImplementedError
