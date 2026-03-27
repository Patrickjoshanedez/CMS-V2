import operator
from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

# 1. Provide LLM
llm = ChatOpenAI(model="gpt-4o", temperature=0.2)

# 2. Define State
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    next_agent: str

# 3. Node Definitions
def project_manager_node(state):
    return {"messages": ["PM: Task delegated to Researcher"], "next_agent": "researcher"}

def coder_node(state):
    return {"messages": ["Coder: Code written and tested"], "next_agent": "reviewer"}

def reviewer_node(state):
    return {"messages": ["Reviewer: Code approved"], "next_agent": "end"}

# 4. Initialize LangGraph
workflow = StateGraph(AgentState)
workflow.add_node("project_manager", project_manager_node)
workflow.add_node("coder", coder_node)
workflow.add_node("reviewer", reviewer_node)

def pm_router(state):
    if state.get("next_agent") == "end":
        return END
    return state.get("next_agent", "coder")

workflow.add_conditional_edges("project_manager", pm_router)
workflow.add_edge("coder", "reviewer")
workflow.add_edge("reviewer", "project_manager")
workflow.set_entry_point("project_manager")

# 5. Connect Human-in-the-Loop Memory (Interrupt before reviewer)
memory = MemorySaver()
app = workflow.compile(checkpointer=memory, interrupt_before=["reviewer"])

if __name__ == "__main__":
    prompt = "Build an asynchronous Python script that fetches the current top 10 stories from the official Hacker News API..."
    initial_state = {"messages": [HumanMessage(content=prompt)], "next_agent": "project_manager"}
    config = {"configurable": {"thread_id": "project-123"}}

    # Phase 1: Stream until interruption at the Reviewer Node
    print("--- FIRST RUN (Executing tasks) ---")
    for event in app.stream(initial_state, config=config):
        print(event)

    # Phase 2: Resume execution after Human Approval
    print("\\n--- RESUMING AFTER REVIEW APPROVAL ---")
    for event in app.stream(None, config=config):
        print(event)