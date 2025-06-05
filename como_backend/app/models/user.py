# models/userModel.py
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base
from sqlalchemy.sql import expression

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True)
    password = Column(String(255))
    name = Column(String(255))
    intimacy = Column(Integer, server_default=expression.text("0"))  
    level = Column(Integer, server_default=expression.text("1"))
    nickname = Column(String(255), server_default=expression.text("'como'"))
    # 관계는 정의하지만, 응답에 포함되지 않음
    diaries = relationship("Diary", back_populates="user", cascade="all, delete")