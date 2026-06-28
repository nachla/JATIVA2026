from pydantic import BaseModel
from typing import Any

class FilterOptions(BaseModel):
    opd: list[str] = []
    jenis: list[str] = []
    urusan: list[str] = []
    kematangan: list[Any] = []
    tahun: list[Any] = []

class StatsResponse(BaseModel):
    total_inovasi: int
    total_opd: int
    rata_kematangan: float | None
    total_urusan: int

class InovasiItem(BaseModel):
    judul: str | None
    opd: str | None
    jenis: str | None
    urusan: str | None
    kematangan: Any
    tahapan: str | None
    bentuk: str | None
    asta: str | None
    inisiator: str | None
    urusan_lain: str | None
    rancang: str | None
    kabupaten: str | None
    tahun: Any

class DataResponse(BaseModel):
    total: int
    data: list[InovasiItem]
