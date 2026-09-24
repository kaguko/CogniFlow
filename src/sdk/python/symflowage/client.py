import json
import time
import urllib.request
import urllib.error
from typing import Dict, Any, Optional, List
from dataclasses import dataclass


@dataclass
class GuardrailDecision:
    contract_version: str
    request_id: str
    agent_id: str
    drift_score: float
    guardrail_threshold: float
    guardrail_status: str  # "ALLOW", "WARN", "BLOCK"
    decision: str
    circuit_breaker_triggered: bool
    circuit_status: str
    reason: str


@dataclass
class DecomposeResult:
    contract_version: str
    request_id: str
    goal_title: str
    micro_steps: List[Dict[str, Any]]
    lean_advice: str


@dataclass
class OutcomeResult:
    contract_version: str
    status: str
    outcome_id: str
    request_id: str
    prediction_id: str
    updated_precision_score: float


class SymFlowAgeClient:
    """Synchronous Python client for SymFlowAge M2M Guardrail & Contextual Planner Engine."""

    def __init__(
        self,
        api_key: str,
        base_url: str = "http://localhost:3000",
        timeout_sec: int = 8,
        max_retries: int = 3,
    ):
        if not api_key:
            raise ValueError("api_key is required to initialize SymFlowAgeClient")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout_sec = timeout_sec
        self.max_retries = max_retries

    def _request(
        self, endpoint: str, method: str = "GET", data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
            "User-Agent": "symflowage-python-sdk/1.0.0",
        }

        body_bytes = json.dumps(data).encode("utf-8") if data else None
        req = urllib.request.Request(url, data=body_bytes, headers=headers, method=method)

        for attempt in range(1, self.max_retries + 1):
            try:
                with urllib.request.urlopen(req, timeout=self.timeout_sec) as response:
                    res_text = response.read().decode("utf-8")
                    return json.loads(res_text)
            except urllib.error.HTTPError as e:
                error_body = e.read().decode("utf-8")
                raise RuntimeError(f"SymFlowAge HTTP {e.code} Error: {error_body}") from e
            except Exception as e:
                if attempt == self.max_retries:
                    raise RuntimeError(f"SymFlowAge request failed after {self.max_retries} retries: {str(e)}") from e
                time.sleep(2 ** attempt * 0.2)

        raise RuntimeError("Request failed")

    def decompose_task(
        self, goal_title: str, technical_context: Optional[str] = None, agent_id: str = "agent_python"
    ) -> DecomposeResult:
        """Decompose a software goal into 5-15 minute micro-steps."""
        payload = {
            "goalTitle": goal_title,
            "technicalContext": technical_context or "",
            "agentId": agent_id,
        }
        res = self._request("/api/v1/agent/decompose", method="POST", data=payload)
        return DecomposeResult(
            contract_version=res.get("contractVersion", "1.0"),
            request_id=res.get("requestId", ""),
            goal_title=res.get("goalTitle", goal_title),
            micro_steps=res.get("microSteps", []),
            lean_advice=res.get("leanAdvice", ""),
        )

    def check_guardrail(
        self,
        original_goal: str,
        agent_output: str,
        circuit_breaker_threshold: float = 40.0,
        agent_id: str = "agent_python",
    ) -> GuardrailDecision:
        """Check proposed agent action against core goal for semantic drift and technical traps."""
        payload = {
            "originalGoal": original_goal,
            "agentOutput": agent_output,
            "circuitBreakerThreshold": circuit_breaker_threshold,
            "agentId": agent_id,
        }
        res = self._request("/api/v1/agent/guardrail/drift-check", method="POST", data=payload)
        cb = res.get("circuitBreaker", {})
        return GuardrailDecision(
            contract_version=res.get("contractVersion", "semantic-drift.v1"),
            request_id=res.get("requestId", ""),
            agent_id=res.get("agentId", agent_id),
            drift_score=float(res.get("driftScore", 0.0)),
            guardrail_threshold=float(res.get("guardrailThreshold", 40.0)),
            guardrail_status=res.get("guardrailStatus", "ALLOW"),
            decision=res.get("decision", "ALLOW"),
            circuit_breaker_triggered=bool(cb.get("triggered", False)),
            circuit_status=cb.get("circuitStatus", "CLOSED"),
            reason=cb.get("reason", res.get("reason", "")),
        )

    def report_outcome(
        self,
        outcome_status: str,  # "SUCCESS", "DRIFT", "CRASH", "ABANDONED"
        request_id: Optional[str] = None,
        prediction_id: Optional[str] = None,
        agent_id: str = "agent_python",
        is_false_positive_drift: bool = False,
        notes: Optional[str] = None,
    ) -> OutcomeResult:
        """Report actual outcome (Feedback Loop) to continuously improve AI Accuracy Score."""
        payload = {
            "requestId": request_id,
            "predictionId": prediction_id,
            "agentId": agent_id,
            "outcomeStatus": outcome_status,
            "userFeedback": {
                "isFalsePositiveDrift": is_false_positive_drift,
                "notes": notes or "",
            },
        }
        res = self._request("/api/v1/agent/outcomes", method="POST", data=payload)
        delta = res.get("accuracyDelta", {})
        return OutcomeResult(
            contract_version=res.get("contractVersion", "1.0"),
            status=res.get("status", "RECORDED"),
            outcome_id=res.get("outcomeId", ""),
            request_id=res.get("requestId", ""),
            prediction_id=res.get("predictionId", ""),
            updated_precision_score=float(delta.get("updatedAgentPrecisionScore", 0.0)),
        )


class AsyncSymFlowAgeClient(SymFlowAgeClient):
    """Async wrapper placeholder for asyncio Python applications."""
    pass
