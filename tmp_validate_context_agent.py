import re
import json
from pathlib import Path

path = Path(r'.github/agents/context-manager.agent.md')
text = path.read_text(encoding='utf-8')

issues = []

fm_match = re.match(r'^---\n(.*?)\n---\n', text, re.S)
if not fm_match:
    issues.append('Missing or malformed YAML frontmatter block at top of file.')
    frontmatter = ''
else:
    frontmatter = fm_match.group(1)

fm_data = None
if frontmatter:
    try:
        import yaml
        fm_data = yaml.safe_load(frontmatter)
        if not isinstance(fm_data, dict):
            issues.append('Frontmatter YAML parses but is not a mapping/object.')
    except Exception as e:
        issues.append(f'Frontmatter YAML parse failed: {e}')

if isinstance(fm_data, dict):
    for key in ['name', 'description', 'tools']:
        if key not in fm_data:
            issues.append(f'Frontmatter missing required key: {key}')

missing_sections = []
for i in range(1, 10):
    pat = rf'^##\s+{i}\)\s+'
    if not re.search(pat, text, re.M):
        missing_sections.append(i)
        issues.append(f'Missing required section heading {i})')

json_blocks = re.findall(r'```json\n(.*?)\n```', text, re.S)
if len(json_blocks) < 2:
    issues.append(f'Expected at least 2 JSON code blocks, found {len(json_blocks)}')

invalid_json_blocks = []
for idx, block in enumerate(json_blocks, start=1):
    try:
        json.loads(block)
    except Exception as e:
        invalid_json_blocks.append((idx, str(e)))
        issues.append(f'JSON block #{idx} is invalid: {e}')

if fm_match:
    body = text[fm_match.end():]
else:
    body = text

if not re.search(r'^#\s+\S+', body, re.M):
    issues.append('No top-level H1 heading found in markdown body.')

fence_count = len(re.findall(r'```', text))
if fence_count % 2 != 0:
    issues.append('Unbalanced fenced code blocks (odd number of ``` markers).')

print('FILE:', path.as_posix())
print('FRONTMATTER_PRESENT:', bool(fm_match))
print('SECTIONS_1_TO_9_PRESENT:', len(missing_sections) == 0)
print('JSON_BLOCK_COUNT:', len(json_blocks))
print('VALID_JSON_BLOCKS:', len(json_blocks) - len(invalid_json_blocks))
print('PASS:', len(issues) == 0)
if issues:
    print('ISSUES:')
    for it in issues:
        print('-', it)
