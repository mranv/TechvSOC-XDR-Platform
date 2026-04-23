from pydantic import BaseModel


class DatabaseStatusResponse(BaseModel):
    status: str
    database: str
