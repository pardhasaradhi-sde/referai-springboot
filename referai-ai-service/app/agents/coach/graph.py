"""LangGraph StateGraph for the coach agent — compiled as singleton."""

from __future__ import annotations

from langgraph.graph import END, StateGraph

from app.agents.coach.nodes import (
    analyze_situation,
    generate_suggestion,
    load_context,
    rag_retrieval,
)
from app.agents.coach.state import CoachState
from app.core.logging import get_logger

logger = get_logger(__name__)


def build_coach_graph() -> StateGraph:
    """Build and return the compiled coach agent graph."""

    graph = StateGraph(CoachState)

    # Add nodes
    graph.add_node("load_context", load_context)
    graph.add_node("rag_retrieval", rag_retrieval)
    graph.add_node("analyze_situation", analyze_situation)
    graph.add_node("generate_suggestion", generate_suggestion)

    # Set entry point
    graph.set_entry_point("load_context")

    # Linear edges
    graph.add_edge("load_context", "rag_retrieval")
    graph.add_edge("rag_retrieval", "analyze_situation")
    graph.add_edge("analyze_situation", "generate_suggestion")
    graph.add_edge("generate_suggestion", END)

    return graph


# Compile once at import time — singleton pattern
_compiled_graph = build_coach_graph().compile()

logger.info("coach.graph.compiled")


def get_coach_graph():
    """Return the pre-compiled coach graph."""
    return _compiled_graph
