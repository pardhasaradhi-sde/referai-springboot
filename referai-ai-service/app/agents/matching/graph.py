"""LangGraph StateGraph for the matching pipeline — compiled as singleton."""

from __future__ import annotations

from langgraph.graph import END, StateGraph

from app.agents.matching.nodes import (
    document_intelligence,
    llm_reranking,
    mark_retrieval_broadened,
    semantic_retrieval,
    should_broaden_search,
    synthesis,
)
from app.agents.matching.state import MatchingState
from app.core.logging import get_logger

logger = get_logger(__name__)


def build_matching_graph() -> StateGraph:
    """Build and return the compiled matching pipeline graph."""

    graph = StateGraph(MatchingState)

    # Add nodes
    graph.add_node("document_intelligence", document_intelligence)
    graph.add_node("semantic_retrieval", semantic_retrieval)
    graph.add_node("llm_reranking", llm_reranking)
    graph.add_node("mark_retrieval_broadened", mark_retrieval_broadened)
    graph.add_node("synthesis", synthesis)

    # Set entry point
    graph.set_entry_point("document_intelligence")

    # Linear edges
    graph.add_edge("document_intelligence", "semantic_retrieval")
    graph.add_edge("semantic_retrieval", "llm_reranking")

    # Conditional edge: after reranking, either broaden search or proceed to synthesis
    graph.add_conditional_edges(
        "llm_reranking",
        should_broaden_search,
        {
            "broaden": "mark_retrieval_broadened",
            "proceed": "synthesis",
        },
    )

    graph.add_edge("mark_retrieval_broadened", "semantic_retrieval")

    graph.add_edge("synthesis", END)

    return graph


# Compile once at import time — singleton pattern
_compiled_graph = build_matching_graph().compile()

logger.info("matching.graph.compiled")


def get_matching_graph():
    """Return the pre-compiled matching graph."""
    return _compiled_graph
