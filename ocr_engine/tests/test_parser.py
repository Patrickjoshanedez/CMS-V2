"""
Tests for PaddleOCR-VL / PyMuPDF Hybrid Document Parser Microservice.
"""
from __future__ import annotations

import io
import pytest
from fastapi.testclient import TestClient

from app import app, extract_metadata_from_text


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_health_check(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "cms-ocr-engine"
    assert "PaddleOCR-VL" in data["model"]


def test_metadata_extraction_heuristic() -> None:
    sample_text = """
    Bukidnon State University
    College of Technologies
    Information Technology Department

    INTELLIGENT CAPSTONE MANAGEMENT SYSTEM WITH PLAGIARISM VALIDATION
    A Capstone Project Submitted to the Faculty of the College of Technologies

    By:
    Patrick Josh Añedez, Throylan Antipuesto, Steven Joe Bautista, Chijay Canoy

    2026

    ABSTRACT
    This study develops an enterprise-grade Capstone Management System V2 (CMS-V2) designed to streamline manuscript submissions, multi-tier Action Done Matrix sign-offs, and automated defense scheduling. Integrated with advanced natural language processing and computer vision engines, the platform delivers high-accuracy plagiarism detection and document structure recovery.

    Keywords: Capstone Management, Plagiarism, PaddleOCR, BGE-M3
    """
    meta = extract_metadata_from_text(sample_text)
    assert meta["year"] == 2026
    assert meta["title"] is not None
    assert "CAPSTONE MANAGEMENT SYSTEM" in meta["title"].upper()
    assert meta["abstract"] is not None
    assert "enterprise-grade Capstone Management System" in meta["abstract"]
    assert len(meta["authors"]) >= 2
    assert any("Añedez" in a or "Anedez" in a for a in meta["authors"])


def test_parse_document_endpoint_with_synthetic_pdf(client: TestClient) -> None:
    import fitz

    # Create an in-memory dual-column academic sample PDF
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4

    # Title & Front matter
    page.insert_text((50, 60), "BukSU Capstone Research Paper", fontsize=14)
    page.insert_text((50, 90), "Hybrid Architecture for Academic Integrity", fontsize=18)
    page.insert_text((50, 120), "By: Patrick Josh Añedez and Throylan Antipuesto", fontsize=11)
    page.insert_text((50, 140), "2026", fontsize=11)

    # Abstract
    page.insert_text(
        (50, 170),
        "ABSTRACT: An integrated evaluation system employing deep learning representations and vector similarity.",
        fontsize=10,
    )

    # Column 1 (Left: x in [50, 260])
    page.insert_text((50, 240), "1. Introduction\nAcademic institutions require robust systems.", fontsize=10)
    page.insert_text((50, 270), "The proposed system accelerates evaluation.", fontsize=10)
    page.insert_text((50, 300), "Formula: $$E = mc^2$$ represents energy equivalence.", fontsize=10)

    # Column 2 (Right: x in [320, 540])
    page.insert_text((320, 240), "2. Methodology\nWe evaluate performance metrics.", fontsize=10)
    page.insert_text((320, 270), "Testing against historical datasets.", fontsize=10)
    page.insert_text((320, 300), "Formula: $$\\sum_{i=1}^{n} x_i$$ computes total sum.", fontsize=10)

    pdf_bytes = doc.write()
    doc.close()

    # Upload to endpoint
    files = {"file": ("academic_sample.pdf", pdf_bytes, "application/pdf")}
    response = client.post("/api/v1/parse-document", files=files)

    assert response.status_code == 200
    data = response.json()

    assert "full_text" in data
    assert len(data["full_text"]) > 100
    assert "metadata" in data
    assert data["metadata"]["page_count"] == 1
    assert data["metadata"]["year"] == 2026
    assert len(data["metadata"]["authors"]) >= 1

    # Verify formula extraction
    formulas = data.get("formulas", [])
    assert any("mc^2" in f["latex"] or "\\sum" in f["latex"] for f in formulas)
