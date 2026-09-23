"""
scripts/audit_data/__init__.py
Exposes the complete inventory of 22 audited algorithms and academic synthesis data.
"""
from .domain1_plagiarism import DOMAIN_1_ALGORITHMS
from .domain2_title_proposal import DOMAIN_2_ALGORITHMS
from .domain3_ocr_visual import DOMAIN_3_ALGORITHMS
from .domain4_diffing import DOMAIN_4_ALGORITHMS
from .domain5_evaluation import DOMAIN_5_ALGORITHMS
from .domain6_governance import DOMAIN_6_ALGORITHMS
from .synthesis import SYNTHESIS_DATA

ALL_ALGORITHMS = (
    DOMAIN_1_ALGORITHMS +
    DOMAIN_2_ALGORITHMS +
    DOMAIN_3_ALGORITHMS +
    DOMAIN_4_ALGORITHMS +
    DOMAIN_5_ALGORITHMS +
    DOMAIN_6_ALGORITHMS
)
