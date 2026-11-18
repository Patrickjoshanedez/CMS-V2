"""Regression test for in-process ChromaDB indexing background task."""
from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

from plagiarism_engine.main import _run_inprocess_index
from plagiarism_engine.models import IndexRequest


class InProcessIndexTests(unittest.TestCase):
    def test_run_inprocess_index_passes_index_request(self):
        """_run_inprocess_index must construct an IndexRequest for PlagiarismEngine.index_document."""
        mock_engine = MagicMock()
        with patch("plagiarism_engine.main.PlagiarismEngine", return_value=mock_engine):
            _run_inprocess_index(
                document_id="doc_test_001",
                text="Sample academic capstone manuscript body paragraph.",
                metadata={"title": "Test Title", "year": 2024},
            )

        mock_engine.index_document.assert_called_once()
        arg = mock_engine.index_document.call_args.args[0]
        self.assertIsInstance(arg, IndexRequest)
        self.assertEqual(arg.document_id, "doc_test_001")
        self.assertEqual(arg.text, "Sample academic capstone manuscript body paragraph.")
        self.assertEqual(arg.metadata.title, "Test Title")
        self.assertEqual(arg.metadata.year, 2024)


if __name__ == "__main__":
    unittest.main()
