from .database import Base, engine
from .models.user import User
from .models.diary import Diary

def reset_database():
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ DB 초기화 완료")

if __name__ == "__main__":
    reset_database()
