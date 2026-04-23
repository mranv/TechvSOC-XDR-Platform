from __future__ import annotations

from typing import Any

import requests

from techvsoc_agent.models import EndpointRegistrationPayload
from techvsoc_agent.models import LogBatchPayload
from techvsoc_agent.models import MetricPayload


class TechvSOCClient:
    def __init__(self, *, base_url: str, token: str, timeout: int = 20) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            }
        )

    def _request(self, method: str, path: str, **kwargs: Any) -> requests.Response:
        response = self.session.request(
            method,
            f"{self.base_url}{path}",
            timeout=self.timeout,
            **kwargs,
        )
        response.raise_for_status()
        return response

    def register_endpoint(self, payload: EndpointRegistrationPayload) -> dict[str, Any]:
        return self._request(
            "POST",
            "/monitoring/endpoints/register",
            json=payload.model_dump(mode="json"),
        ).json()

    def send_metric(self, endpoint_id: int, payload: MetricPayload) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/monitoring/endpoints/{endpoint_id}/metrics",
            json=payload.model_dump(mode="json"),
        ).json()

    def send_logs(self, payload: LogBatchPayload) -> list[dict[str, Any]]:
        if not payload.logs:
            return []
        return self._request(
            "POST",
            "/logs/ingest",
            json=payload.model_dump(mode="json"),
        ).json()
