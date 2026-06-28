def save_log(db, username: str, aksi: str):
    cur = db.cursor()

    cur.execute(
        """
        INSERT INTO activity_log (username, aksi)
        VALUES (%s, %s)
        """,
        (username, aksi)
    )

    db.commit()