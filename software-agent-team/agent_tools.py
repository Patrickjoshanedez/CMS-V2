import os
from dotenv import load_dotenv
from e2b_code_interpreter import Sandbox

load_dotenv()

def execute_python_code(code: str) -> str:
    """Executes Python code in a secure E2B microVM."""
    with Sandbox(api_key=os.getenv("E2B_API_KEY")) as sandbox:
        execution = sandbox.run_code(code)
        if execution.error:
            return f"Error: {execution.error.value}"
        return f"Output: {execution.text}"

coder_tools = [execute_python_code]
# Assuming MCP client setup here based on your tools
# research_tools = [mcp_search_tool]