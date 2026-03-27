#!/usr/bin/env python3
"""Debug script to check validate_setup structure"""

from orchestrator_reference import validate_setup
import json

result = validate_setup(".")
print("Result structure:")
print(json.dumps(result, indent=2, default=str)[:1500])
