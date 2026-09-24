export interface M2MCodeSnippet {
  language: 'python' | 'curl' | 'typescript' | 'json';
  framework: 'langchain' | 'crewai' | 'autogen' | 'raw_api' | 'mcp';
  title: string;
  code: string;
}

export const M2M_INTEGRATION_SNIPPETS: M2MCodeSnippet[] = [
  {
    language: 'json',
    framework: 'mcp',
    title: 'Model Context Protocol (MCP) — Config cho Cursor / Windsurf / Claude Desktop',
    code: `{
  "mcpServers": {
    "symflowage": {
      "url": "https://your-symflowage-app.run.app/api/mcp/sse",
      "transport": "sse",
      "headers": {
        "Authorization": "Bearer $SYMFLOWAGE_M2M_API_KEY"
      }
    }
  }
}`,
  },
  {
    language: 'python',
    framework: 'crewai',
    title: 'CrewAI Tool — SymFlowAge Guardrail & MicroStep Engine',
    code: `import os
import requests
from crewai import Agent, Task, Crew, Process
from langchain.tools import tool

SYMFLOWAGE_BASE_URL = "https://your-symflowage-app.run.app/api/v1/agent"
SYMFLOWAGE_API_KEY = os.environ["SYMFLOWAGE_M2M_API_KEY"]

@tool("symflowage_decompose")
def decompose_goal_to_microsteps(goal_title: str, technical_context: str) -> str:
    """Gọi SymFlowAge Orchestrator để phân rã mục tiêu lớn thành các vi bước lập trình 5-15 phút."""
    headers = {"Authorization": f"Bearer {SYMFLOWAGE_API_KEY}", "Content-Type": "application/json"}
    payload = {"goalTitle": goal_title, "technicalContext": technical_context}
    res = requests.post(f"{SYMFLOWAGE_BASE_URL}/decompose", json=payload, headers=headers)
    return res.text

@tool("symflowage_drift_guardrail")
def check_hallucination_and_drift(original_goal: str, agent_output: str) -> str:
    """Rào chắn kiểm tra Drift Score & Hallucination. Nếu Drift > 40%, bắt buộc dừng và tái cân bằng."""
    headers = {"Authorization": f"Bearer {SYMFLOWAGE_API_KEY}", "Content-Type": "application/json"}
    payload = {"originalGoal": original_goal, "agentOutput": agent_output}
    res = requests.post(f"{SYMFLOWAGE_BASE_URL}/guardrail/drift-check", json=payload, headers=headers)
    return res.text

# Khởi tạo Coder Agent với SymFlowAge Guardrail Tools
coder_agent = Agent(
    role="Principal Backend Engineer",
    goal="Xây dựng API bảo mật cao không bị trôi dạt mục tiêu (Zero Goal Drift)",
    backstory="Kỹ sư chỉ thực thi các vi bước 5-15 phút và tuân thủ rào chắn SymFlowAge.",
    tools=[decompose_goal_to_microsteps, check_hallucination_and_drift],
    verbose=True
)
`,
  },
  {
    language: 'python',
    framework: 'langchain',
    title: 'LangGraph / LangChain — Socratic Decision & Vector Memory Node',
    code: `import requests

class SymFlowAgeAgentMemory:
    def __init__(self, api_key: str, base_url: str = "https://your-symflowage-app.run.app/api/v1/agent"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    def query_proven_patterns(self, query: str, top_k: int = 3):
        """Truy xuất trí nhớ chung (Vector Memory RAG) của bầy tác tử để không lặp lại lỗi cũ."""
        res = requests.post(f"{self.base_url}/memory/search", json={"query": query, "topK": top_k}, headers=self.headers)
        return res.json().get("memories", [])

    def request_socratic_decision(self, dilemma: str, options: list[str]):
        """Ép Agent lập luận Why-First trước khi chốt kiến trúc quan trọng."""
        payload = {"dilemma": dilemma, "options": options}
        res = requests.post(f"{self.base_url}/socratic-decision", json=payload, headers=self.headers)
        return res.json()
`,
  },
  {
    language: 'curl',
    framework: 'raw_api',
    title: 'cURL — M2M Guardrail Drift Check (Machine-to-Machine)',
    code: `curl -X POST https://your-symflowage-app.run.app/api/v1/agent/guardrail/drift-check \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SYMFLOWAGE_M2M_API_KEY" \\
  -d '{
    "originalGoal": "Xây dựng JWT Auth với Redis Token Blacklist",
    "agentOutput": "Tạo bảng User trong MongoDB và cấu hình Firebase OAuth",
    "circuitBreakerThreshold": 40
  }'
`,
  },
];
