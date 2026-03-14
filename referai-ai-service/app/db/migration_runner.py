from __future__ import annotations

from hashlib import sha256
from pathlib import Path

from app.core.logging import get_logger
from app.db.postgres import (
    apply_migration_file,
    ensure_migration_table_exists,
    list_applied_migrations,
)


logger = get_logger(__name__)


async def run_startup_migrations(migrations_path: str) -> None:
    path = Path(migrations_path)

    if not path.exists() or not path.is_dir():
        logger.warning("migrations.path.invalid", migrations_path=migrations_path)
        return

    files = sorted([f for f in path.iterdir() if f.is_file() and f.suffix.lower() == ".sql"])
    if not files:
        logger.info("migrations.none_found", migrations_path=migrations_path)
        return

    await ensure_migration_table_exists()
    applied = await list_applied_migrations()

    logger.info("migrations.start", total=len(files), applied=len(applied))

    for file_path in files:
        if file_path.name in applied:
            logger.info("migrations.skip", filename=file_path.name)
            continue

        checksum = sha256(file_path.read_bytes()).hexdigest()
        logger.info("migrations.apply.start", filename=file_path.name)
        await apply_migration_file(file_path, checksum)
        logger.info("migrations.apply.done", filename=file_path.name)

    logger.info("migrations.done")
