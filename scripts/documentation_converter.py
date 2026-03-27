"""
Orchestrator Documentation Converter

Converts Markdown documentation files to multiple formats:
- JSON Schema (structured, queryable)
- Python dataclasses (type-safe, IDE-friendly)
- Catalog format (for discovery and navigation)

Supports:
- Instruction files (.github/instructions/*.md)
- Agent definitions (.github/agents/*.md)
- Documentation files (documentation/*.md)
- Context catalogs (context/*.json)
"""

from __future__ import annotations

import re
import json
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Optional, Any
from enum import Enum


class DocumentType(str, Enum):
    """Document classification"""
    INSTRUCTION = "instruction"
    AGENT = "agent"
    SKILL = "skill"
    DOCUMENTATION = "documentation"
    GUIDE = "guide"
    MANIFEST = "manifest"


@dataclass
class Section:
    """Parsed section from markdown"""
    title: str
    level: int
    content: str
    subsections: list[Section] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class DocumentMetadata:
    """Document-level metadata"""
    title: str
    doc_type: DocumentType
    description: str
    author: Optional[str] = None
    version: Optional[str] = None
    tags: list[str] = field(default_factory=list)
    last_updated: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "type": self.doc_type.value,
            "description": self.description,
            "author": self.author,
            "version": self.version,
            "tags": self.tags,
            "last_updated": self.last_updated,
        }


class MarkdownParser:
    """Parse markdown files into structured data"""
    
    def __init__(self, file_path: Path):
        self.file_path = file_path
        self.content = file_path.read_text(encoding="utf-8")
        self.lines = self.content.split("\n")
    
    def extract_metadata(self) -> DocumentMetadata:
        """Extract document metadata from frontmatter and title"""
        title = self._extract_title()
        description = self._extract_description()
        doc_type = self._infer_doc_type()
        
        return DocumentMetadata(
            title=title,
            doc_type=doc_type,
            description=description,
            author=self._extract_author(),
            version=self._extract_version(),
            tags=self._extract_tags(),
        )
    
    def _extract_title(self) -> str:
        """Extract title from first H1"""
        for line in self.lines:
            if line.startswith("# "):
                return line[2:].strip()
        return self.file_path.stem.replace("-", " ").title()
    
    def _extract_description(self) -> str:
        """Extract description from content"""
        # Get first meaningful paragraph
        for i, line in enumerate(self.lines):
            if line.strip() and not line.startswith("#") and i > 0:
                text = line.strip()[:200]
                return text
        return ""
    
    def _infer_doc_type(self) -> DocumentType:
        """Infer document type from filename and content"""
        filename = self.file_path.name
        content_lower = self.content.lower()
        
        if "instruction" in filename.lower():
            return DocumentType.INSTRUCTION
        elif "agent" in filename.lower():
            return DocumentType.AGENT
        elif "skill" in filename.lower():
            return DocumentType.SKILL
        elif "guide" in filename.lower():
            return DocumentType.GUIDE
        elif "manifest" in filename.lower():
            return DocumentType.MANIFEST
        else:
            return DocumentType.DOCUMENTATION
    
    def _extract_author(self) -> Optional[str]:
        """Extract author from metadata or content"""
        for line in self.lines[:20]:
            if "author" in line.lower():
                match = re.search(r"[Aa]uthor[:\s]+([^\n]+)", line)
                if match:
                    return match.group(1).strip()
        return None
    
    def _extract_version(self) -> Optional[str]:
        """Extract version from metadata"""
        for line in self.lines[:20]:
            if "version" in line.lower():
                match = re.search(r"[Vv]ersion[:\s]+([^\n]+)", line)
                if match:
                    return match.group(1).strip()
        return None
    
    def _extract_tags(self) -> list[str]:
        """Extract tags from content"""
        tags = []
        for line in self.lines[:20]:
            if "tags" in line.lower():
                match = re.search(r"[Tt]ags?[:\s]+([^\n]+)", line)
                if match:
                    tag_text = match.group(1)
                    tags = [t.strip() for t in tag_text.split(",")]
        return tags
    
    def extract_sections(self) -> list[Section]:
        """Parse sections from markdown"""
        sections = []
        current_section = None
        
        for line in self.lines:
            # Check for headings
            match = re.match(r"^(#+)\s+(.+)$", line)
            if match:
                level = len(match.group(1))
                title = match.group(2)
                
                if level <= 2:
                    if current_section:
                        sections.append(current_section)
                    current_section = Section(title=title, level=level, content="")
                elif current_section:
                    current_section.subsections.append(
                        Section(title=title, level=level, content="")
                    )
            elif current_section:
                current_section.content += line + "\n"
        
        if current_section:
            sections.append(current_section)
        
        return sections
    
    def extract_codeblocks(self) -> list[dict]:
        """Extract code blocks with language"""
        blocks = []
        i = 0
        while i < len(self.lines):
            line = self.lines[i]
            match = re.match(r"^```(\w+)?$", line)
            if match:
                language = match.group(1) or "text"
                code_lines = []
                i += 1
                while i < len(self.lines) and not self.lines[i].startswith("```"):
                    code_lines.append(self.lines[i])
                    i += 1
                
                blocks.append({
                    "language": language,
                    "code": "\n".join(code_lines).strip(),
                })
            i += 1
        
        return blocks


class DocumentConverter:
    """Convert parsed documents to target formats"""
    
    @staticmethod
    def to_json_schema(metadata: DocumentMetadata, sections: list[Section]) -> dict:
        """Convert to JSON Schema format"""
        return {
            "schema_version": "1.0",
            "metadata": metadata.to_dict(),
            "structure": {
                "sections": [s.to_dict() for s in sections]
            }
        }
    
    @staticmethod
    def to_python_dataclass(metadata: DocumentMetadata, sections: list[Section]) -> str:
        """Generate Python dataclass definition"""
        class_name = metadata.title.replace(" ", "").replace("-", "")
        
        python_code = f'''"""
{metadata.description}

Generated from: {metadata.title}
Type: {metadata.doc_type.value}
"""

from dataclasses import dataclass, field
from typing import Optional, List


@dataclass
class {class_name}:
    """
    {metadata.title}
    
    Type: {metadata.doc_type.value}
    Description: {metadata.description}
    """
    
    title: str = "{metadata.title}"
    doc_type: str = "{metadata.doc_type.value}"
    version: Optional[str] = {repr(metadata.version)}
    author: Optional[str] = {repr(metadata.author)}
    tags: List[str] = field(default_factory=lambda: {metadata.tags!r})
    
    # Sections
'''
        
        for section in sections:
            section_name = section.title.lower().replace(" ", "_").replace("-", "_")
            sanitized_content = section.content.replace("\"", "\\\"")[:200]
            python_code += f'\n    {section_name}: str = """{sanitized_content}"""'
        
        python_code += "\n"
        
        return python_code
    
    @staticmethod
    def to_catalog_entry(file_path: Path, metadata: DocumentMetadata) -> dict:
        """Create catalog entry for discovery"""
        return {
            "id": file_path.stem,
            "path": str(file_path),
            "title": metadata.title,
            "type": metadata.doc_type.value,
            "description": metadata.description,
            "author": metadata.author,
            "version": metadata.version,
            "tags": metadata.tags,
            "searchable": " ".join([
                metadata.title,
                metadata.description,
                " ".join(metadata.tags),
            ]).lower(),
        }


class ProductionDocumentationConverter:
    """High-level orchestration for documentation conversion"""
    
    def __init__(self, source_dir: Path, output_dir: Path):
        self.source_dir = source_dir
        self.output_dir = output_dir
        self.catalog = []
    
    def convert_all(self, force: bool = False) -> dict:
        """Convert all markdown files in source"""
        print("📚 PRODUCTION DOCUMENTATION CONVERSION")
        print("=" * 60)
        
        results = {
            "converted": 0,
            "json_files": [],
            "python_files": [],
            "catalog": [],
            "errors": [],
        }
        
        # Find all markdown files
        md_files = list(self.source_dir.rglob("*.md"))
        print(f"Found {len(md_files)} markdown files")
        
        for md_file in md_files:
            try:
                print(f"\n  📄 Converting {md_file.name}...")
                
                # Parse
                parser = MarkdownParser(md_file)
                metadata = parser.extract_metadata()
                sections = parser.extract_sections()
                
                # Convert to JSON
                json_schema = DocumentConverter.to_json_schema(metadata, sections)
                json_path = self.output_dir / f"{md_file.stem}.json"
                json_path.parent.mkdir(parents=True, exist_ok=True)
                
                with open(json_path, "w") as f:
                    json.dump(json_schema, f, indent=2)
                results["json_files"].append(str(json_path))
                print(f"    ✅ JSON: {json_path}")
                
                # Convert to Python dataclass
                python_code = DocumentConverter.to_python_dataclass(metadata, sections)
                python_path = self.output_dir / f"{md_file.stem}_model.py"
                
                with open(python_path, "w") as f:
                    f.write(python_code)
                results["python_files"].append(str(python_path))
                print(f"    ✅ Python: {python_path}")
                
                # Add to catalog
                catalog_entry = DocumentConverter.to_catalog_entry(md_file, metadata)
                results["catalog"].append(catalog_entry)
                
                results["converted"] += 1
                
            except Exception as e:
                error_msg = f"{md_file.name}: {str(e)}"
                results["errors"].append(error_msg)
                print(f"    ❌ Error: {e}")
        
        # Save catalog
        catalog_path = self.output_dir / "documentation_catalog.json"
        with open(catalog_path, "w") as f:
            json.dump(results["catalog"], f, indent=2)
        
        print(f"\n✅ Conversion complete:")
        print(f"  - Converted: {results['converted']} files")
        print(f"  - JSON schemas: {len(results['json_files'])}")
        print(f"  - Python models: {len(results['python_files'])}")
        print(f"  - Catalog: {catalog_path}")
        
        return results


def main(argv: list[str] | None = None) -> int:
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Production Documentation Converter",
    )
    parser.add_argument(
        "--source",
        default=".",
        help="Source directory with markdown files",
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Output directory for converted files",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing files",
    )
    
    args = parser.parse_args(argv)
    
    source = Path(args.source)
    output = Path(args.output)
    
    converter = ProductionDocumentationConverter(source, output)
    results = converter.convert_all(args.force)
    
    return 0 if results["errors"] == [] else 1


if __name__ == "__main__":
    raise SystemExit(main())
