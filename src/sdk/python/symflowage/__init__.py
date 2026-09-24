"""
SymFlowAge Python SDK
~~~~~~~~~~~~~~~~~~~~~

Official Python Helper SDK for SymFlowAge M2M Guardrail & Contextual Planner Engine.
Integrates seamlessly with LangChain, CrewAI, AutoGen, LlamaIndex, and custom Python AI Agents.
"""

from .client import SymFlowAgeClient, AsyncSymFlowAgeClient, GuardrailDecision, DecomposeResult, OutcomeResult

__all__ = [
    "SymFlowAgeClient",
    "AsyncSymFlowAgeClient",
    "GuardrailDecision",
    "DecomposeResult",
    "OutcomeResult",
]
__version__ = "1.0.0"
