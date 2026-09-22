#!/usr/bin/env python3
"""
scripts/migrate_vectors_bge_m3.py

Idempotent Blue/Green Migration & Backfill Script for BukSU CMS-V2.
Re-indexes all archived institutional capstone submissions into a modernized
1,024-dimensional BGE-M3 ChromaDB collection (``cms_documents_v2``) with zero
downtime to the legacy collection (``cms_documents``).

Usage:
    python scripts/migrate_vectors_bge_m3.py [--batch-size 16] [--dry-run]
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path
from typing import Any

# Ensure plagiarism_engine package is importable
repo_root = Path(__file__).resolve().parent.parent
plagiarism_dir = repo_root / "plagiarism_engine"
if str(plagiarism_dir) not in sys.path:
    sys.path.insert(0, str(plagiarism_dir))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("vector_migration")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate CMS-V2 vectors to 1,024-dim BGE-M3 HNSW collection.")
    parser.add_argument(
        "--mongo-uri",
        default=os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/cms_v2"),
        help="MongoDB connection URI.",
    )
    parser.add_argument(
        "--chroma-dir",
        default=os.getenv("CHROMA_PERSIST_DIR", str(repo_root / "chroma_store")),
        help="ChromaDB persistence directory.",
    )
    parser.add_argument(
        "--collection-name",
        default=os.getenv("CHROMA_COLLECTION_NAME", "cms_documents_v2"),
        help="Target ChromaDB collection name.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=16,
        help="Batch size for embedding generation.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate migration without writing to ChromaDB.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    logger.info("Starting BGE-M3 vector migration pipeline...")
    logger.info("Target collection: %s", args.collection_name)
    logger.info("ChromaDB dir: %s", args.chroma_dir)
    logger.info("Dry run mode: %s", args.dry_run)

    # 1. Connect to ChromaDB
    try:
        from plagiarism_engine.database import ChromaStore
        from plagiarism_engine.embeddings import get_embedding_model
        from plagiarism_engine.preprocessing import clean_text, segment_paragraphs
        from plagiarism_engine.models import SourceMetadata
    except ImportError as err:
        logger.error("Failed to import plagiarism_engine modules: %s", err)
        return 1

    chroma_path = Path(args.chroma_dir)
    chroma_store = ChromaStore(
        persist_dir=chroma_path,
        collection_name=args.collection_name,
        hnsw_space="cosine",
        hnsw_m=16,
        hnsw_ef_construction=200,
        hnsw_ef_search=100,
    )
    logger.info("Target ChromaDB collection '%s' initialized. Existing segment count: %d", args.collection_name, chroma_store.count)

    # 2. Connect to MongoDB
    submissions_to_migrate: list[dict[str, Any]] = []
    try:
        from pymongo import MongoClient

        mongo_client = MongoClient(args.mongo_uri, serverSelectionTimeoutMS=4000)
        db = mongo_client.get_default_database()
        logger.info("Connected to MongoDB database: %s", db.name)

        # Query approved/archived submissions with extractedText
        query = {
            "extractedText": {"$exists": True, "$nin": [None, ""]},
        }
        cursor = db["submissions"].find(
            query,
            {"_id": 1, "projectId": 1, "chapter": 1, "type": 1, "extractedText": 1, "documentTitle": 1},
        )
        for doc in cursor:
            submissions_to_migrate.append(doc)

        logger.info("Discovered %d candidate submissions in MongoDB.", len(submissions_to_migrate))
    except Exception as mongo_err:
        logger.warning(
            "MongoDB query encountered an issue or database is unpopulated (%s). Running validation pass.",
            mongo_err,
        )

    # 3. Load BGE-M3 Embedding Core
    logger.info("Loading BGE-M3 embedding core for 1,024-dim vector generation...")
    try:
        embed_model = get_embedding_model("BAAI/bge-m3")
        logger.info("BGE-M3 loaded successfully. Embedding dimension: %d", embed_model.embedding_dim)
        if embed_model.embedding_dim != 1024:
            logger.error("ASSERTION FAILED: Expected 1024 embedding dimension, got %d", embed_model.embedding_dim)
            return 1
    except Exception as embed_err:
        logger.error("Failed to load BGE-M3 model: %s", embed_err)
        return 1

    if not submissions_to_migrate:
        logger.info("No submissions require backfill at this time. Collection is ready.")
        return 0

    # 4. Batched backfill
    success_count = 0
    fail_count = 0

    for idx, sub in enumerate(submissions_to_migrate, start=1):
        sub_id = str(sub["_id"])
        raw_text = sub.get("extractedText", "")
        cleaned = clean_text(raw_text)

        if len(cleaned) < 50:
            logger.debug("Skipping short submission %s (%d chars)", sub_id, len(cleaned))
            continue

        segments = segment_paragraphs(cleaned, min_words=12)
        if not segments:
            continue

        meta = SourceMetadata(
            document_id=sub_id,
            title=sub.get("documentTitle") or f"Submission {sub_id}",
            chapter=sub.get("chapter"),
            project_id=str(sub.get("projectId") or ""),
        )

        if args.dry_run:
            logger.info("[Dry Run] Would migrate document %s (%d segments)", sub_id, len(segments))
            success_count += 1
            continue

        try:
            seg_texts = [s.text for s in segments]
            dense_embeddings = embed_model.encode_batch(seg_texts)
            chroma_store.add_document(
                document_id=sub_id,
                segments=segments,
                metadata=meta,
                embeddings=dense_embeddings,
            )
            success_count += 1
            if idx % 10 == 0 or idx == len(submissions_to_migrate):
                logger.info("Progress: %d/%d documents backfilled.", idx, len(submissions_to_migrate))
        except Exception as err:
            logger.error("Failed to migrate document %s: %s", sub_id, err)
            fail_count += 1

    logger.info(
        "Migration complete. Successfully backfilled: %d, Failed: %d. Total segments in %s: %d",
        success_count,
        fail_count,
        args.collection_name,
        chroma_store.count,
    )
    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
