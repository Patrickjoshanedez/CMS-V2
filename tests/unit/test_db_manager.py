import sqlite3
from pathlib import Path

import pytest

from orchestrator.state.db_manager import StateDatabase


def test_initializes_with_wal_mode(tmp_path: Path) -> None:
    db_path = tmp_path / "state.db"
    state_db = StateDatabase(db_path)

    with state_db._get_connection() as connection:
        journal_mode = connection.execute("PRAGMA journal_mode;").fetchone()[0]
        synchronous = connection.execute("PRAGMA synchronous;").fetchone()[0]

    assert str(journal_mode).lower() == "wal"
    assert int(synchronous) in (1, 2)


def test_upsert_get_delete_and_list_keys(tmp_path: Path) -> None:
    db_path = tmp_path / "state.db"
    state_db = StateDatabase(db_path)

    state_db.upsert("alpha", {"count": 1})
    state_db.upsert("beta", [1, 2, 3])
    state_db.upsert("alpha", {"count": 2})

    assert state_db.get("alpha") == {"count": 2}
    assert state_db.get("beta") == [1, 2, 3]
    assert state_db.get("missing") is None
    assert state_db.list_keys() == ["alpha", "beta"]

    assert state_db.delete("beta") is True
    assert state_db.delete("beta") is False
    assert state_db.list_keys() == ["alpha"]


def test_transaction_rolls_back_on_error(tmp_path: Path) -> None:
    db_path = tmp_path / "state.db"
    state_db = StateDatabase(db_path)

    with pytest.raises(RuntimeError):
        with state_db.transaction() as connection:
            connection.execute(
                """
                INSERT INTO state (key, value) VALUES (?, ?)
                """,
                ("key-1", "{\"ok\": true}"),
            )
            raise RuntimeError("force rollback")

    assert state_db.get("key-1") is None


def test_get_raises_value_error_on_malformed_json(tmp_path: Path) -> None:
    db_path = tmp_path / "state.db"
    state_db = StateDatabase(db_path)

    with state_db._get_connection() as connection:
        connection.execute(
            "INSERT INTO state (key, value) VALUES (?, ?)",
            ("broken", "{not-json"),
        )
        connection.commit()

    with pytest.raises(ValueError, match="Malformed JSON"):
        state_db.get("broken")


def test_transaction_commits_atomically(tmp_path: Path) -> None:
    db_path = tmp_path / "state.db"
    state_db = StateDatabase(db_path)

    with state_db.transaction() as connection:
        connection.execute(
            "INSERT INTO state (key, value) VALUES (?, ?)",
            ("k1", "1"),
        )
        connection.execute(
            "INSERT INTO state (key, value) VALUES (?, ?)",
            ("k2", "2"),
        )

    with state_db._get_connection() as connection:
        count = connection.execute("SELECT COUNT(*) FROM state").fetchone()[0]

    assert count == 2