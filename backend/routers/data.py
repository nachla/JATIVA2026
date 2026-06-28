from fastapi import APIRouter, Depends
from psycopg2.extras import RealDictCursor
from psycopg2.extensions import connection

from core.database import get_db

router = APIRouter(prefix="/data", tags=["Data"])


# =========================
# HELPER FILTER
# =========================
def apply_filters(query, params, opd, jenis, urusan, tahun):
    if opd:
        query += " AND admin_opd = %s"
        params.append(opd)

    if jenis:
        query += " AND jenis = %s"
        params.append(jenis)

    if urusan:
        query += " AND urusan_utama = %s"
        params.append(urusan)

    if tahun:
        query += """
            AND EXTRACT(YEAR FROM tanggal_input::date) = %s
        """
        params.append(tahun)

    return query, params


# =========================
# FILTERS
# =========================
@router.get("/filters")
def get_filters(db: connection = Depends(get_db)):
    cur = db.cursor(cursor_factory=RealDictCursor)

    filters = {}

    cur.execute("""
        SELECT DISTINCT admin_opd
        FROM data_inovasi
        WHERE admin_opd IS NOT NULL
        ORDER BY admin_opd
    """)
    filters["opd"] = [r["admin_opd"] for r in cur.fetchall()]

    cur.execute("""
        SELECT DISTINCT jenis
        FROM data_inovasi
        WHERE jenis IS NOT NULL
        ORDER BY jenis
    """)
    filters["jenis"] = [r["jenis"] for r in cur.fetchall()]

    cur.execute("""
        SELECT DISTINCT urusan_utama
        FROM data_inovasi
        WHERE urusan_utama IS NOT NULL
        ORDER BY urusan_utama
    """)
    filters["urusan"] = [r["urusan_utama"] for r in cur.fetchall()]

    cur.execute("""
        SELECT DISTINCT kematangan
        FROM data_inovasi
        WHERE kematangan IS NOT NULL
        ORDER BY kematangan
    """)
    filters["kematangan"] = [r["kematangan"] for r in cur.fetchall()]

    cur.execute("""
        SELECT DISTINCT
            EXTRACT(YEAR FROM tanggal_input::date) AS tahun
        FROM data_inovasi
        WHERE tanggal_input IS NOT NULL
        ORDER BY tahun
    """)
    filters["tahun"] = [r["tahun"] for r in cur.fetchall()]

    cur.close()

    return filters


# =========================
# STATS
# =========================
@router.get("/stats")
def get_stats(db: connection = Depends(get_db)):
    cur = db.cursor(cursor_factory=RealDictCursor)

    query = """
        SELECT
            COUNT(*) AS total_inovasi,

            COUNT(DISTINCT admin_opd)
                AS total_opd,

            COUNT(DISTINCT urusan_utama)
                AS total_urusan,

            ROUND(
                AVG(kematangan)::numeric,
                2
            ) AS rata_kematangan

        FROM data_inovasi
    """

    cur.execute(query)

    row = cur.fetchone()

    cur.close()

    return row


# =========================
# TIMELINE
# =========================
@router.get("/chart/timeline")
def chart_timeline(
    opd: str | None = None,
    jenis: str | None = None,
    urusan: str | None = None,
    tahun: int | None = None,
    db: connection = Depends(get_db)
):
    cur = db.cursor(cursor_factory=RealDictCursor)

    query = """
        SELECT
            EXTRACT(YEAR FROM tanggal_input::date) AS tahun,
            COUNT(*) AS total
        FROM data_inovasi
        WHERE tanggal_input IS NOT NULL
    """

    params = []

    query, params = apply_filters(
        query,
        params,
        opd,
        jenis,
        urusan,
        tahun
    )

    query += """
        GROUP BY tahun
        ORDER BY tahun
    """

    cur.execute(query, params)

    rows = cur.fetchall()

    cur.close()

    return rows


# =========================
# KEMATANGAN PER URUSAN
# =========================
@router.get("/chart/kematangan-urusan")
def chart_kematangan_urusan(
    opd: str | None = None,
    jenis: str | None = None,
    urusan: str | None = None,
    tahun: int | None = None,
    db: connection = Depends(get_db)
):
    cur = db.cursor(cursor_factory=RealDictCursor)

    query = """
        SELECT
            urusan_utama AS urusan,

            ROUND(
                AVG(kematangan)::numeric,
                2
            ) AS rata_rata,

            COUNT(*) AS jumlah

        FROM data_inovasi

        WHERE
            urusan_utama IS NOT NULL
            AND kematangan IS NOT NULL
    """

    params = []

    query, params = apply_filters(
        query,
        params,
        opd,
        jenis,
        urusan,
        tahun
    )

    query += """
        GROUP BY urusan_utama
        ORDER BY rata_rata DESC
    """

    cur.execute(query, params)

    rows = cur.fetchall()

    cur.close()

    return rows


# =========================
# ANALISIS - JENIS
# =========================
@router.get("/chart/jenis")
def chart_jenis(
    opd: str | None = None,
    jenis: str | None = None,
    urusan: str | None = None,
    tahun: int | None = None,
    db: connection = Depends(get_db)
):
    cur = db.cursor(cursor_factory=RealDictCursor)

    query = """
        SELECT
            jenis AS name,
            COUNT(*) AS value
        FROM data_inovasi
        WHERE jenis IS NOT NULL
    """

    params = []

    query, params = apply_filters(
        query,
        params,
        opd,
        jenis,
        urusan,
        tahun
    )

    query += """
        GROUP BY jenis
        ORDER BY value DESC
    """

    cur.execute(query, params)

    rows = cur.fetchall()

    cur.close()

    return rows


# =========================
# ANALISIS - TOP OPD
# =========================
@router.get("/chart/opd")
def chart_opd(
    opd: str | None = None,
    jenis: str | None = None,
    urusan: str | None = None,
    tahun: int | None = None,
    db: connection = Depends(get_db)
):
    cur = db.cursor(cursor_factory=RealDictCursor)

    query = """
        SELECT
            admin_opd AS name,
            COUNT(*) AS value
        FROM data_inovasi
        WHERE admin_opd IS NOT NULL
    """

    params = []

    query, params = apply_filters(
        query,
        params,
        opd,
        jenis,
        urusan,
        tahun
    )

    query += """
        GROUP BY admin_opd
        ORDER BY value DESC
        LIMIT 10
    """

    cur.execute(query, params)

    rows = cur.fetchall()

    cur.close()

    return rows


# =========================
# ANALISIS - URUSAN
# =========================
@router.get("/chart/urusan")
def chart_urusan(
    opd: str | None = None,
    jenis: str | None = None,
    urusan: str | None = None,
    tahun: int | None = None,
    db: connection = Depends(get_db)
):
    cur = db.cursor(cursor_factory=RealDictCursor)

    query = """
        SELECT
            urusan_utama AS name,
            COUNT(*) AS value
        FROM data_inovasi
        WHERE urusan_utama IS NOT NULL
    """

    params = []

    query, params = apply_filters(
        query,
        params,
        opd,
        jenis,
        urusan,
        tahun
    )

    query += """
        GROUP BY urusan_utama
        ORDER BY value DESC
    """

    cur.execute(query, params)

    rows = cur.fetchall()

    cur.close()

    return rows


# =========================
# LIST DATA
# =========================
@router.get("/list")
def get_list(
    limit: int = 100,
    offset: int = 0,
    opd: str | None = None,
    jenis: str | None = None,
    urusan: str | None = None,
    tahun: int | None = None,
    db: connection = Depends(get_db)
):
    cur = db.cursor(cursor_factory=RealDictCursor)

    query = """
        SELECT
            id,
            judul_inovasi AS judul,
            jenis,
            urusan_utama AS urusan,
            kematangan,
            admin_opd AS kabupaten,
            tanggal_input
        FROM data_inovasi
        WHERE 1=1
    """

    params = []

    query, params = apply_filters(
        query,
        params,
        opd,
        jenis,
        urusan,
        tahun
    )

    query += """
        ORDER BY id DESC
        LIMIT %s OFFSET %s
    """

    params.extend([limit, offset])

    cur.execute(query, params)

    rows = cur.fetchall()

    cur.close()

    return {
        "data": rows,
        "total": len(rows)
    }

# =========================
# DETAIL INOVASI PER URUSAN
# =========================
@router.get("/detail-inovasi")
def detail_inovasi(
    urusan: str,
    db: connection = Depends(get_db)
):
    cur = db.cursor(cursor_factory=RealDictCursor)

    query = """
        SELECT
            judul_inovasi AS nama_inovasi,
            admin_opd AS opd,
            kematangan
        FROM data_inovasi
        WHERE urusan_utama = %s
        ORDER BY kematangan DESC
    """

    cur.execute(query, [urusan])

    rows = cur.fetchall()

    cur.close()

    return rows

# =========================
# TOP INOVASI
# =========================
@router.get("/top-inovasi")
def top_inovasi(
    db: connection = Depends(get_db)
):
    cur = db.cursor(cursor_factory=RealDictCursor)

    query = """
        SELECT
            judul_inovasi AS nama,
            admin_opd AS instansi
        FROM data_inovasi
        WHERE judul_inovasi IS NOT NULL
        LIMIT 5
    """

    cur.execute(query)

    rows = cur.fetchall()

    cur.close()

    return rows

# =========================
# PETA INOVASI WILAYAH
# =========================
@router.get("/map-inovasi")
def map_inovasi(
    db: connection = Depends(get_db)
):
    cur = db.cursor(cursor_factory=RealDictCursor)

    query = """
        SELECT
            admin_opd AS nama,
            COUNT(*) AS total,

            json_agg(
                json_build_object(
                    'nama', judul_inovasi,
                    'instansi', admin_opd,
                    'jenis', jenis,
                    'kematangan', kematangan
                )
            ) AS inovasi

        FROM data_inovasi

        WHERE admin_opd IS NOT NULL

        GROUP BY admin_opd

        ORDER BY total DESC
    """

    cur.execute(query)

    rows = cur.fetchall()

    cur.close()

    return rows