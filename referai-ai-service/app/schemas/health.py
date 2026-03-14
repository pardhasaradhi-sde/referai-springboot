from datetime import datetime

from pydantic import BaseModel, Field


class DependencyStatus(BaseModel):
    status: str = Field(description="ok | degraded")
    detail: str


class HealthResponse(BaseModel):
    service: str = Field(description="ok | degraded")
    db: DependencyStatus
    redis: DependencyStatus
    fallback_used: bool = Field(alias="fallback_used")
    timestamp: datetime
