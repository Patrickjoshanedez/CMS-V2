import re

path = 'client/src/pages/projects/CreateProjectPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace lucide-react imports
text = re.sub(
    r"import \{.*?\} from 'lucide-react';",
    "import { AlertTriangle, X, Plus, Loader2, ChevronDown, ChevronUp, Search, RefreshCw, Download } from 'lucide-react';",
    text
)

# Add Badge import if not there
if "import { Badge }" not in text:
    text = text.replace("import { Alert, AlertDescription } from '@/components/ui/Alert';",
                        "import { Alert, AlertDescription } from '@/components/ui/Alert';\nimport { Badge } from '@/components/ui/Badge';")

# Add cn import since we might use it
if "import { cn } from '@/lib/utils';" not in text:
    text = text.replace("import { TagInput }", "import { cn } from '@/lib/utils';\nimport { TagInput }")

# Change state variables
text = text.replace(
    "const [expandedProposalIndex, setExpandedProposalIndex] = useState(0);",
    "const [activeProposalIndex, setActiveProposalIndex] = useState(0);\n  const [activeSubTab, setActiveSubTab] = useState('write');"
)

# Inside removeTitleProposal
text = text.replace("if (expandedProposalIndex >=", "if (activeProposalIndex >=")
text = text.replace("setExpandedProposalIndex(next.length - 1);", "setActiveProposalIndex(next.length - 1);")

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Headers modified successfully.")
