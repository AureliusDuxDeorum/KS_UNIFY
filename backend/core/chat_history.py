import sqlite3
from datetime import datetime
from pathlib import Path


DB_PATH = Path("/home/prometheus/KS_UNIFY/configs/ks_unify.db")


class ChatHistory:
    def __init__(self):
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        self.init_db()

    def connect(self):
        return sqlite3.connect(DB_PATH)

    def init_db(self):
        with self.connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS chat_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    model TEXT NOT NULL,
                    route_rule TEXT,
                    prompt TEXT NOT NULL,
                    response TEXT,
                    success INTEGER NOT NULL,
                    error TEXT,
                    latency_ms INTEGER
                )
                """
            )

    def add_entry(
        self,
        provider: str,
        model: str,
        route_rule: str,
        prompt: str,
        response: str = "",
        success: bool = True,
        error: str = "",
        latency_ms: int = 0
    ):
        timestamp = datetime.now().isoformat(timespec="seconds")

        with self.connect() as conn:
            conn.execute(
                """
                INSERT INTO chat_history (
                    timestamp,
                    provider,
                    model,
                    route_rule,
                    prompt,
                    response,
                    success,
                    error,
                    latency_ms
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    timestamp,
                    provider,
                    model,
                    route_rule,
                    prompt,
                    response,
                    1 if success else 0,
                    error,
                    latency_ms
                )
            )

        return {
            "success": True,
            "timestamp": timestamp
        }

    def list_entries(self, limit: int = 50):
        with self.connect() as conn:
            conn.row_factory = sqlite3.Row

            rows = conn.execute(
                """
                SELECT *
                FROM chat_history
                ORDER BY id DESC
                LIMIT ?
                """,
                (limit,)
            ).fetchall()

        return {
            "success": True,
            "entries": [dict(row) for row in rows]
        }

    def clear_entries(self):
        with self.connect() as conn:
            conn.execute("DELETE FROM chat_history")
            conn.execute("DELETE FROM sqlite_sequence WHERE name='chat_history'")

        return {
            "success": True,
            "message": "chat history cleared"
        }
