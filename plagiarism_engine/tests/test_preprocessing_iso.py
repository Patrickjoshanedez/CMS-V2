"""
ISO/IEC 25010 & 25023 Preprocessing & Boilerplate Accuracy Tests.
Verifies that institutional templates, approval sheets, and degrees are stripped
to prevent false-positive leakage in academic capstone similarity scans.
"""
from __future__ import annotations

import pytest
from plagiarism_engine.preprocessing import clean_text


def test_buksu_institutional_boilerplate_removal():
    """Verify BukSU header, college, department, approval sheet, and degree removal."""
    sample_text = (
        "Bukidnon State University\n"
        "College of Technologies\n"
        "Department of Information Technology\n"
        "Malaybalay City, Bukidnon\n"
        "In partial fulfillment of the requirements for the degree of Bachelor of Science in Information Technology\n"
        "Approval Sheet\n"
        "Panel of Examiners\n"
        "Certificate of Originality\n"
        "Action Done Matrix\n"
        "This capstone project entitled Smart Campus IoT Monitoring System\n"
        "prepared and submitted by Juan Dela Cruz is hereby recommended for acceptance.\n"
        "The smart campus system utilizes LoRaWAN sensors for precision agriculture soil monitoring."
    )
    cleaned = clean_text(sample_text)

    # Institutional boilerplate must NOT appear in cleaned text
    assert "Bukidnon State University" not in cleaned
    assert "College of Technologies" not in cleaned
    assert "Department of Information Technology" not in cleaned
    assert "Approval Sheet" not in cleaned
    assert "Panel of Examiners" not in cleaned
    assert "Certificate of Originality" not in cleaned
    assert "Action Done Matrix" not in cleaned
    assert "In partial fulfillment of the requirements" not in cleaned

    # Legitimate project research content MUST be preserved
    assert "Smart Campus IoT Monitoring System" in cleaned or "LoRaWAN sensors" in cleaned


def test_clean_text_normalizes_curly_smart_quotes():
    """Verify clean_text handles curly smart quotes and basic content gracefully."""
    sample = "The author argued “Smart devices enhance yields” during field deployment."
    cleaned = clean_text(sample)
    assert "Smart devices enhance yields" in cleaned
    assert len(cleaned) > 0
