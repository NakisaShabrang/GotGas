import unittest
import json
import bcrypt
from app import app, users_collection, favorites_collection, favorite_groups_collection, _clear_reports, _load_reports, reports_collection, station_reviews_collection
from datetime import datetime


class FlaskAppTest(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        # Clear test data
        users_collection.delete_many({})
        favorites_collection.delete_many({})
        favorite_groups_collection.delete_many({})
        _clear_reports()

    def tearDown(self):
        # Clean up test data
        users_collection.delete_many({})
        favorites_collection.delete_many({})
        favorite_groups_collection.delete_many({})
        _clear_reports()

    def test_home_route(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)

    def _register_and_login(self, username="testuser", password="password123"):
        self.client.post(
            "/register",
            data=json.dumps({"username": username, "password": password}),
            content_type="application/json",
        )
        self.client.post(
            "/login",
            data=json.dumps({"username": username, "password": password}),
            content_type="application/json",
        )

    def _verify_delete_password(self, password="password123"):
        return self.client.post(
            "/verify-password",
            data=json.dumps({"password": password}),
            content_type="application/json",
        )

    # --- Verify Password Tests ---

    def test_verify_password_not_logged_in(self):
        response = self.client.post(
            "/verify-password",
            data=json.dumps({"password": "test123"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        data = json.loads(response.data)
        self.assertIn("error", data)
        self.assertEqual(data["error"], "Please log in first")

    def test_verify_password_missing_password(self):
        # Register and login first
        self.client.post(
            "/register",
            data=json.dumps({"username": "testuser", "password": "password123"}),
            content_type="application/json",
        )
        self.client.post(
            "/login",
            data=json.dumps({"username": "testuser", "password": "password123"}),
            content_type="application/json",
        )

        response = self.client.post(
            "/verify-password",
            data=json.dumps({}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertEqual(data["error"], "Password is required")

    def test_verify_password_incorrect_password(self):
        # Register and login
        self.client.post(
            "/register",
            data=json.dumps({"username": "testuser", "password": "password123"}),
            content_type="application/json",
        )
        self.client.post(
            "/login",
            data=json.dumps({"username": "testuser", "password": "password123"}),
            content_type="application/json",
        )

        response = self.client.post(
            "/verify-password",
            data=json.dumps({"password": "wrongpassword"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        data = json.loads(response.data)
        self.assertEqual(data["error"], "Invalid password")

    def test_verify_password_correct_password(self):
        self._register_and_login()

        response = self._verify_delete_password()
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["message"], "Password verified")

    # --- Delete Account Tests ---

    def test_delete_account_not_logged_in(self):
        response = self.client.delete("/delete-account")
        self.assertEqual(response.status_code, 401)
        data = json.loads(response.data)
        self.assertIn("error", data)
        self.assertEqual(data["error"], "Please log in first")

    def test_delete_account_success(self):
        self._register_and_login()

        # Verify user exists
        user_before = users_collection.find_one({"username": "testuser"})
        self.assertIsNotNone(user_before)

        self._verify_delete_password()
        response = self.client.delete("/delete-account")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["message"], "Account deleted successfully")

        # Verify user is deleted
        user_after = users_collection.find_one({"username": "testuser"})
        self.assertIsNone(user_after)

    def test_delete_account_removes_favorites(self):
        self._register_and_login()

        # Add some favorites
        self.client.post(
            "/favorites",
            data=json.dumps(
                {
                    "id": "station1",
                    "name": "Test Station",
                    "address": "123 Main St",
                }
            ),
            content_type="application/json",
        )

        # Verify favorite exists
        favorite_before = favorites_collection.find_one({"username": "testuser"})
        self.assertIsNotNone(favorite_before)

        self._verify_delete_password()
        self.client.delete("/delete-account")

        # Verify favorites are deleted
        favorite_after = list(favorites_collection.find({"username": "testuser"}))
        self.assertEqual(len(favorite_after), 0)

    def test_delete_account_removes_favorite_groups(self):
        self._register_and_login()

        # Add a favorite group
        self.client.post(
            "/favorite-groups",
            data=json.dumps({"name": "My Stations"}),
            content_type="application/json",
        )

        # Verify group exists
        group_before = favorite_groups_collection.find_one({"username": "testuser"})
        self.assertIsNotNone(group_before)

        self._verify_delete_password()
        self.client.delete("/delete-account")

        # Verify groups are deleted
        group_after = list(favorite_groups_collection.find({"username": "testuser"}))
        self.assertEqual(len(group_after), 0)

    def test_delete_account_clears_session(self):
        self._register_and_login()

        self._verify_delete_password()
        response = self.client.delete("/delete-account")
        self.assertEqual(response.status_code, 200)

        # Try to access profile (should fail because session is cleared)
        profile_response = self.client.get("/profile")
        self.assertEqual(profile_response.status_code, 401)

    def test_delete_account_requires_verified_password(self):
        self._register_and_login()

        response = self.client.delete("/delete-account")

        self.assertEqual(response.status_code, 403)
        data = json.loads(response.data)
        self.assertEqual(data["error"], "Password confirmation required")

    def test_update_email_rejects_invalid_email(self):
        self._register_and_login()

        response = self.client.patch(
            "/profile/email",
            data=json.dumps({"email": "not-an-email"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertEqual(data["message"], "Please enter a valid email address")

    def test_update_email_rejects_duplicate_email_case_insensitive(self):
        self._register_and_login(username="firstuser")
        users_collection.update_one({"username": "firstuser"}, {"$set": {"email": "one@example.com"}})
        self.client.post("/logout")
        self._register_and_login(username="seconduser")

        response = self.client.patch(
            "/profile/email",
            data=json.dumps({"email": "ONE@example.com"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 409)
        data = json.loads(response.data)
        self.assertEqual(data["message"], "Email already in use")

    def test_update_password_requires_confirmation_match(self):
        self._register_and_login()

        response = self.client.patch(
            "/profile/password",
            data=json.dumps({
                "currentPassword": "password123",
                "newPassword": "newpassword123",
                "confirmNewPassword": "different123",
            }),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertEqual(data["error"], "Passwords do not match")

    def test_update_password_success_updates_hash(self):
        self._register_and_login()

        response = self.client.patch(
            "/profile/password",
            data=json.dumps({
                "currentPassword": "password123",
                "newPassword": "newpassword123",
                "confirmNewPassword": "newpassword123",
            }),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        updated_user = users_collection.find_one({"username": "testuser"})
        self.assertTrue(bcrypt.checkpw("newpassword123".encode("utf-8"), updated_user["password"]))


    # --- Report Station Tests ---

    def test_report_station_not_logged_in(self):
        response = self.client.post(
            "/report-station",
            data=json.dumps({"station_id": "osm-node-123"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        data = json.loads(response.data)
        self.assertEqual(data["error"], "Please log in first")

    def test_report_station_missing_station_id(self):
        self._register_and_login()
        response = self.client.post(
            "/report-station",
            data=json.dumps({"station_name": "Test Station"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertEqual(data["error"], "station_id is required")

    def test_report_station_success(self):
        self._register_and_login()
        response = self.client.post(
            "/report-station",
            data=json.dumps({"station_id": "osm-node-123", "station_name": "Gas Co"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data["message"], "Report submitted successfully")
        self.assertEqual(data["report_count"], 1)
        self.assertFalse(data["under_review"])

    def test_report_station_with_suggested_price(self):
        self._register_and_login()
        response = self.client.post(
            "/report-station",
            data=json.dumps({
                "station_id": "osm-node-123",
                "station_name": "Gas Co",
                "suggested_price": "3.49",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        # Verify file
        store = _load_reports()
        report = next((r for r in store["reports"] if r["station_id"] == "osm-node-123"), None)
        self.assertIsNotNone(report)
        self.assertEqual(report["suggested_price"], 3.49)
        # Verify database
        db_report = reports_collection.find_one({"station_id": "osm-node-123"})
        self.assertIsNotNone(db_report)
        self.assertEqual(db_report["suggested_price"], 3.49)

    def test_report_station_invalid_price(self):
        self._register_and_login()
        response = self.client.post(
            "/report-station",
            data=json.dumps({
                "station_id": "osm-node-123",
                "suggested_price": "999",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn("error", data)

    def test_report_station_duplicate_report(self):
        self._register_and_login()
        # First report
        self.client.post(
            "/report-station",
            data=json.dumps({"station_id": "osm-node-123"}),
            content_type="application/json",
        )
        # Second report — should be rejected
        response = self.client.post(
            "/report-station",
            data=json.dumps({"station_id": "osm-node-123"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 409)
        data = json.loads(response.data)
        self.assertEqual(data["error"], "You have already reported this station")

    def test_report_station_different_users_no_duplicate(self):
        # Two different users can both report the same station
        self._register_and_login(username="user1")
        self.client.post(
            "/report-station",
            data=json.dumps({"station_id": "osm-node-123"}),
            content_type="application/json",
        )
        self.client.get("/logout")

        self._register_and_login(username="user2")
        response = self.client.post(
            "/report-station",
            data=json.dumps({"station_id": "osm-node-123"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data["report_count"], 2)

    def test_report_station_marked_for_review_at_threshold(self):
        # Register 5 different users and have each report the same station
        for i in range(5):
            self._register_and_login(username=f"reviewer{i}")
            self.client.post(
                "/report-station",
                data=json.dumps({"station_id": "osm-node-999", "station_name": "Flagged Station"}),
                content_type="application/json",
            )
            self.client.post("/logout")

        # Verify the station is marked for review
        store = _load_reports()
        review = store["station_reviews"].get("osm-node-999")
        self.assertIsNotNone(review)
        self.assertTrue(review["under_review"])
        self.assertGreaterEqual(review["report_count"], 5)

    def test_report_station_not_marked_under_4_reports(self):
        for i in range(4):
            self._register_and_login(username=f"checker{i}")
            response = self.client.post(
                "/report-station",
                data=json.dumps({"station_id": "osm-node-888"}),
                content_type="application/json",
            )
            self.client.post("/logout")

        # Should not be under review yet
        store = _load_reports()
        review = store["station_reviews"].get("osm-node-888")
        self.assertIsNone(review)
        data = json.loads(response.data)
        self.assertFalse(data["under_review"])

    def test_get_station_report_status_not_logged_in(self):
        response = self.client.get("/report-station/osm-node-123")
        self.assertEqual(response.status_code, 401)

    def test_get_station_report_status_not_reported(self):
        self._register_and_login()
        response = self.client.get("/report-station/osm-node-123")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertFalse(data["reported"])
        self.assertEqual(data["report_count"], 0)
        self.assertFalse(data["under_review"])

    def test_get_station_report_status_after_reporting(self):
        self._register_and_login()
        self.client.post(
            "/report-station",
            data=json.dumps({"station_id": "osm-node-123"}),
            content_type="application/json",
        )
        response = self.client.get("/report-station/osm-node-123")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data["reported"])
        self.assertEqual(data["report_count"], 1)


    def test_clear_reports_clears_file_and_database(self):
        # Submit a report so both stores have data
        self._register_and_login()
        self.client.post(
            "/report-station",
            data=json.dumps({"station_id": "osm-node-clear"}),
            content_type="application/json",
        )
        # Confirm data exists in both
        store = _load_reports()
        self.assertTrue(len(store["reports"]) > 0)
        self.assertTrue(reports_collection.count_documents({}) > 0)

        # Clear
        response = self.client.post("/clear-reports")
        self.assertEqual(response.status_code, 200)

        # Confirm both are empty
        store = _load_reports()
        self.assertEqual(store["reports"], [])
        self.assertEqual(store["station_reviews"], {})
        self.assertEqual(reports_collection.count_documents({}), 0)
        self.assertEqual(station_reviews_collection.count_documents({}), 0)


if __name__ == "__main__":
    unittest.main()
