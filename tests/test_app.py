import copy
import urllib.parse

import pytest
from fastapi.testclient import TestClient

from src import app as app_module

client = TestClient(app_module.app)

# Keep a fresh copy of original activities to reset state between tests
ORIGINAL_ACTIVITIES = copy.deepcopy(app_module.activities)


@pytest.fixture(autouse=True)
def reset_activities():
    # Reset in-memory activities before each test
    app_module.activities = copy.deepcopy(ORIGINAL_ACTIVITIES)
    yield


def test_get_activities():
    r = client.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data
    assert isinstance(data["Chess Club"]["participants"], list)


def test_signup_and_duplicate():
    activity = "Basketball Team"
    email = "test.student@example.com"

    r = client.post(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 200
    assert "Signed up" in r.json().get("message", "")

    # Duplicate signup should return 400
    r2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert r2.status_code == 400
    assert "already signed up" in r2.json().get("detail", "")


def test_delete_participant():
    activity = "Soccer Club"
    email = "delete.me@example.com"

    # Sign up, then delete
    r = client.post(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 200

    rdel = client.delete(f"/activities/{activity}/participants?email={email}")
    assert rdel.status_code == 200
    assert "Removed" in rdel.json().get("message", "")

    # Verify not present
    rget = client.get("/activities")
    assert email not in rget.json()[activity]["participants"]


def test_delete_nonexistent_participant():
    activity = "Drama Club"
    email = "i.dont.exist@example.com"

    rdel = client.delete(f"/activities/{activity}/participants?email={email}")
    assert rdel.status_code == 404
    assert "Participant not found" in rdel.json().get("detail", "")
