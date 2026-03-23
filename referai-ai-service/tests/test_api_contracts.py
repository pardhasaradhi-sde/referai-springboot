from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app
from app.schemas.matching import MatchResponse


client = TestClient(app)


def _auth_headers() -> dict[str, str]:
    return {"X-Internal-Key": get_settings().internal_api_key}


def test_internal_key_required_for_api_paths() -> None:
    response = client.post(
        "/api/match",
        json={"jobDescription": "jd", "resumeText": "resume", "seekerId": "550e8400-e29b-41d4-a716-446655440000"},
    )
    assert response.status_code == 401


def test_match_endpoint_contract_with_mock(monkeypatch) -> None:
    async def _mock_run_matching_pipeline(job_description: str, resume_text: str, seeker_id: str, target_company: str) -> MatchResponse:
        return MatchResponse(
            success=True,
            matches=[],
            total_candidates_evaluated=0,
            error=None,
        )

    monkeypatch.setattr("app.api.routes.matching.run_matching_pipeline", _mock_run_matching_pipeline)

    response = client.post(
        "/api/match",
        headers=_auth_headers(),
        json={
            "jobDescription": "Senior backend role",
            "resumeText": "5 years Java and distributed systems",
            "seekerId": "550e8400-e29b-41d4-a716-446655440000",
            "targetCompany": "Linear",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "matches" in data
    assert "totalCandidatesEvaluated" in data


def test_coach_non_streaming_contract_with_mock(monkeypatch) -> None:
    async def _mock_run_coach_non_streaming(
        conversation_id: str,
        seeker_id: str,
        referrer_id: str,
        current_message: str | None = None,
        current_stage: str = "first_contact",
    ) -> tuple[bool, str | None, str | None]:
        return True, "Try asking about current team priorities first.", None

    monkeypatch.setattr("app.api.routes.coach.run_coach_non_streaming", _mock_run_coach_non_streaming)

    response = client.post(
        "/api/coach/suggest",
        headers={**_auth_headers(), "Accept": "application/json"},
        json={
            "conversationId": "550e8400-e29b-41d4-a716-446655440011",
            "seekerId": "550e8400-e29b-41d4-a716-446655440000",
            "referrerId": "550e8400-e29b-41d4-a716-446655440001",
            "currentMessage": "Hi, thanks for accepting.",
            "currentStage": "first_contact",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "suggestion" in data


def test_generate_message_contract_with_mock(monkeypatch) -> None:
    async def _mock_generate_outreach_message(
        seeker_id: str,
        referrer_id: str,
        job_context: str | None = None,
    ) -> tuple[bool, str | None, str | None]:
        return True, "Hi Alex, your distributed systems work resonates with my experience.", None

    monkeypatch.setattr("app.api.routes.outreach.generate_outreach_message", _mock_generate_outreach_message)

    response = client.post(
        "/api/generate-message",
        headers=_auth_headers(),
        json={
            "seekerId": "550e8400-e29b-41d4-a716-446655440000",
            "referrerId": "550e8400-e29b-41d4-a716-446655440001",
            "jobContext": "Backend Engineer role",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data.get("message"), str)


def test_index_referrer_contract_with_mock(monkeypatch) -> None:
    async def _mock_index_referrer_profile(
        referrer_id: str,
        bio: str | None,
        skills: list[str],
        job_title: str | None,
        company: str | None,
        department: str | None = None,
        seniority: str | None = None,
        years_of_experience: int | None = None,
    ) -> tuple[bool, int | None, str | None]:
        return True, 768, None

    monkeypatch.setattr("app.api.routes.indexing.index_referrer_profile", _mock_index_referrer_profile)

    response = client.post(
        "/api/index-referrer",
        headers=_auth_headers(),
        json={
            "referrerId": "550e8400-e29b-41d4-a716-446655440001",
            "bio": "Infrastructure engineer",
            "skills": ["Java", "Kafka"],
            "jobTitle": "Senior Engineer",
            "company": "Contoso",
            "seniority": "Senior",
            "yearsOfExperience": 7,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["embeddingDimensions"] == 768


def test_record_outcome_contract_with_mock(monkeypatch) -> None:
    async def _mock_record_outcome(
        request_id: str,
        outcome_type: str,
        reporter_id: str,
    ) -> tuple[bool, str | None, str | None]:
        return True, "550e8400-e29b-41d4-a716-446655440099", None

    monkeypatch.setattr("app.api.routes.outcomes.record_outcome", _mock_record_outcome)

    response = client.post(
        "/api/outcomes/record",
        headers=_auth_headers(),
        json={
            "requestId": "550e8400-e29b-41d4-a716-446655440002",
            "outcomeType": "GOT_REFERRAL",
            "reporterId": "550e8400-e29b-41d4-a716-446655440000",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "outcomeId" in data
