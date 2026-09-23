#!/usr/bin/env python3
"""
BukSU CMS-V2: PaddleOCR-VL Evaluation Metric Suite

Implements the multi-task mathematical evaluation metrics and the
PaddleOCR-VL-1.6 Valid-Struct-Sim composite reward function:
    R_t(y, y*) = Valid_t(y) * Struct_t(phi_t(y)) * Sim_t(phi_t(y), phi_t(y*))
"""

import json
import re
import sys
from typing import Dict, Any, Tuple, List

def levenshtein_distance(s1: str, s2: str) -> int:
    """Compute standard Wagner-Fischer Levenshtein distance."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]

def normalized_edit_distance(pred: str, target: str) -> float:
    """Compute Normalized Edit Distance (NED in [0, 1])."""
    max_len = max(len(pred), len(target))
    if max_len == 0:
        return 0.0
    dist = levenshtein_distance(pred, target)
    return dist / max_len

def field_similarity_ned(pred: str, target: str) -> float:
    """Compute 1 - NED similarity."""
    return max(0.0, 1.0 - normalized_edit_distance(pred, target))

def compute_valid_gate(pred_raw: str) -> Tuple[bool, Dict[str, Any]]:
    """Binary Gate: Valid_t(y) in {0, 1}."""
    try:
        data = json.loads(pred_raw)
        if isinstance(data, dict):
            return True, data
        return False, {}
    except Exception:
        return False, {}

def compute_struct_cost(data: Dict[str, Any]) -> float:
    """Struct_t(phi_t(y)): Penalize malformed arrays or dirty scalar values."""
    cost = 1.0
    # Check authors array
    authors = data.get("authors")
    if not isinstance(authors, list) or len(authors) == 0:
        cost *= 0.5
    elif any(not isinstance(a, str) or len(a) < 2 for a in authors):
        cost *= 0.8
        
    # Check year format
    year = str(data.get("publication_year", ""))
    if not re.match(r"^(19|20)\d{2}$", year):
        cost *= 0.7
        
    # Check DOI format if present
    doi = data.get("doi")
    if doi and not re.match(r"^10\.\d{4,9}/", str(doi)):
        cost *= 0.8
        
    return cost

def compute_sim_metric(pred: Dict[str, Any], ground_truth: Dict[str, Any]) -> float:
    """Sim_t(phi_t(y), phi_t(y*)): Multi-objective weighted field similarity."""
    weights = {
        "title": 0.25,
        "abstract": 0.25,
        "authors": 0.20,
        "keywords": 0.15,
        "publication_year": 0.05,
        "doi": 0.05,
        "publication_venue": 0.05,
    }
    
    total_score = 0.0
    
    # Title (1 - NED)
    pred_title = str(pred.get("title", "")).strip().lower()
    gt_title = str(ground_truth.get("title", "")).strip().lower()
    total_score += weights["title"] * field_similarity_ned(pred_title, gt_title)
    
    # Abstract (1 - NED)
    pred_abs = str(pred.get("abstract", "")).strip().lower()
    gt_abs = str(ground_truth.get("abstract", "")).strip().lower()
    total_score += weights["abstract"] * field_similarity_ned(pred_abs, gt_abs)
    
    # Authors (Set F1)
    p_authors = set(a.strip().lower() for a in pred.get("authors", []) if isinstance(a, str))
    gt_authors = set(a.strip().lower() for a in ground_truth.get("authors", []) if isinstance(a, str))
    if p_authors or gt_authors:
        intersect = len(p_authors.intersection(gt_authors))
        f1 = (2.0 * intersect) / (len(p_authors) + len(gt_authors))
        total_score += weights["authors"] * f1
        
    # Keywords (Jaccard)
    p_kw = set(k.strip().lower() for k in pred.get("keywords", []) if isinstance(k, str))
    gt_kw = set(k.strip().lower() for k in ground_truth.get("keywords", []) if isinstance(k, str))
    if p_kw or gt_kw:
        union = len(p_kw.union(gt_kw))
        total_score += weights["keywords"] * (len(p_kw.intersection(gt_kw)) / union if union > 0 else 0.0)
        
    # Publication Year (Exact)
    p_yr = str(pred.get("publication_year", "")).strip()
    gt_yr = str(ground_truth.get("publication_year", "")).strip()
    if p_yr == gt_yr and p_yr:
        total_score += weights["publication_year"] * 1.0
        
    # DOI (Exact/Normalized)
    p_doi = str(pred.get("doi", "")).strip().lower()
    gt_doi = str(ground_truth.get("doi", "")).strip().lower()
    if p_doi == gt_doi and p_doi not in ("", "null", "none"):
        total_score += weights["doi"] * 1.0
        
    # Publication Venue (Token overlap)
    p_ven = str(pred.get("publication_venue", "")).strip().lower()
    gt_ven = str(ground_truth.get("publication_venue", "")).strip().lower()
    if p_ven and gt_ven:
        p_tokens = set(p_ven.split())
        gt_tokens = set(gt_ven.split())
        overlap = len(p_tokens.intersection(gt_tokens)) / max(len(gt_tokens), 1)
        total_score += weights["publication_venue"] * overlap
        
    return total_score

def evaluate_prediction(pred_raw: str, ground_truth: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate the complete reward and diagnostic sub-metrics."""
    is_valid, parsed_data = compute_valid_gate(pred_raw)
    if not is_valid:
        return {
            "valid": 0.0,
            "struct": 0.0,
            "sim": 0.0,
            "reward": 0.0,
            "error": "SyntaxError: Failed to parse output JSON.",
        }
        
    struct_score = compute_struct_cost(parsed_data)
    sim_score = compute_sim_metric(parsed_data, ground_truth)
    reward = 1.0 * struct_score * sim_score
    
    return {
        "valid": 1.0,
        "struct": round(struct_score, 4),
        "sim": round(sim_score, 4),
        "reward": round(reward, 4),
        "parsed": parsed_data,
    }

if __name__ == "__main__":
    # Self-test demonstration
    sample_gt = {
        "title": "Elevation-Aware Domain Adaptation for Semantic Segmentation of Aerial Images",
        "authors": ["Z. Sun", "P. Guo", "Z. Li", "X. Chen", "X. Liu"],
        "publication_year": "2025",
        "doi": "10.3390/rs17142529",
        "publication_venue": "Remote Sensing",
        "keywords": ["unsupervised domain adaptation", "semantic segmentation", "remote sensing image"]
    }
    
    sample_pred_raw = json.dumps(sample_gt, indent=2)
    result = evaluate_prediction(sample_pred_raw, sample_gt)
    print("Self-Test Exact Match Benchmark Evaluation:")
    print(json.dumps(result, indent=2))
    assert result["reward"] > 0.99, "Expected near-perfect reward on ground-truth identity."
