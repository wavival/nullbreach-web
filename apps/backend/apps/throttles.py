from rest_framework.settings import api_settings
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle, UserRateThrottle


class _LiveRateMixin:
    """Re-read the rate from `api_settings` on every instantiation.

    DRF's SimpleRateThrottle caches `THROTTLE_RATES` as a class attribute at
    import time, so `@override_settings` in tests does not propagate. Re-reading
    in `get_rate` keeps the throttle in sync with the current settings.
    """

    def get_rate(self) -> str:
        return api_settings.DEFAULT_THROTTLE_RATES[self.scope]


class ClaudeChatThrottle(_LiveRateMixin, UserRateThrottle):
    scope = "claude_chat"


class ClaudeScanThrottle(_LiveRateMixin, UserRateThrottle):
    scope = "claude_scan"


class AuthAnonThrottle(_LiveRateMixin, AnonRateThrottle):
    """Per-IP throttle for unauthenticated auth endpoints (login, register).

    Mitigates credential-stuffing and registration enumeration; rate lives in
    the `auth` scope (see DEFAULT_THROTTLE_RATES).
    """

    scope = "auth"


class AuthLoginThrottle(_LiveRateMixin, SimpleRateThrottle):
    """Per-account throttle on login, keyed by the submitted email.

    Complements the per-IP `AuthAnonThrottle`: caps repeated failed logins
    against one account from many IPs (distributed credential stuffing). Falls
    back to the client IP when no email is supplied.
    """

    scope = "auth_login"

    def get_rate(self) -> str | None:
        # Tolerant lookup (unlike the strict mixin): if the scope is unset the
        # throttle disables rather than erroring, so the per-IP AuthAnonThrottle
        # still governs. Production settings define the rate.
        return api_settings.DEFAULT_THROTTLE_RATES.get(self.scope)

    def get_cache_key(self, request, view):
        email = (request.data.get("email") or "").strip().lower()
        ident = email or self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}
