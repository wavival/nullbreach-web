from django.conf import settings

import anthropic

SYSTEM_PROMPT = (
    "You are NullBreach, an expert AI cybersecurity assistant. "
    "You help developers identify vulnerabilities, understand security concepts, "
    "review code for weaknesses, and apply best practices based on OWASP, NIST, "
    "and industry standards. Be precise, technical, and actionable in your responses."
)

# Cap on the number of past messages replayed to Claude per turn. Bounds
# per-request token cost and prevents O(n²) growth as conversations get long.
MAX_HISTORY_MESSAGES = 40

# Module-level singleton — the Anthropic SDK client is thread-safe and reusing
# a single instance saves the per-request TCP/TLS setup cost.
_client: anthropic.Anthropic | None = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        key = settings.ANTHROPIC_API_KEY
        if not key:
            raise ValueError("ANTHROPIC_API_KEY is not configured.")
        _client = anthropic.Anthropic(api_key=key)
    return _client


def chat_completion(history: list[dict]) -> str:
    """Send conversation history to Claude and return the assistant reply.

    history: list of {"role": "user"|"assistant", "content": str}.
    """
    client = get_client()
    response = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=history,
    )
    # A refusal/stop block (or any non-text first block) leaves content without
    # a `.text`; guard so it surfaces as a clean 502 instead of an IndexError 500.
    blocks = getattr(response, "content", None) or []
    text = getattr(blocks[0], "text", None) if blocks else None
    if not text:
        raise ValueError("Claude returned no text content.")
    return text
