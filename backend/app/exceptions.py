"""Custom exception hierarchy.

All application-specific exceptions inherit from CareerAgentError.
"""


class CareerAgentError(Exception):
    """Base exception for all CareerAgent errors."""

    def __init__(self, message: str, *, status_code: int = 500) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class CVParsingError(CareerAgentError):
    """Raised when CV parsing fails."""

    def __init__(self, message: str = "Failed to parse the CV") -> None:
        super().__init__(message, status_code=422)


class LLMError(CareerAgentError):
    """Raised when an LLM call fails."""

    def __init__(self, message: str = "LLM call failed") -> None:
        super().__init__(message, status_code=502)


class PipelineError(CareerAgentError):
    """Raised when the LangGraph pipeline encounters an error."""

    def __init__(self, message: str = "Pipeline execution failed") -> None:
        super().__init__(message, status_code=500)


class TavilyError(CareerAgentError):
    """Raised when a Tavily API call fails."""

    def __init__(self, message: str = "Tavily API call failed") -> None:
        super().__init__(message, status_code=502)


class NotFoundError(CareerAgentError):
    """Raised when a requested resource is not found."""

    def __init__(self, message: str = "Resource not found") -> None:
        super().__init__(message, status_code=404)


class HITLError(CareerAgentError):
    """Raised for HITL-related errors (invalid state, missing data)."""

    def __init__(self, message: str = "HITL operation failed") -> None:
        super().__init__(message, status_code=400)
