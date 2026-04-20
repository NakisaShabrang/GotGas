import unittest
import json
import bcrypt
from app import app, users_collection, favorites_collection, favorite_groups_collection
from datetime import datetime


class FlaskAppTest(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        # Clear test data
        users_collection.delete_many({})
        favorites_collection.delete_many({})
        favorite_groups_collection.delete_many({})

    def tearDown(self):
        # Clean up test data
        users_collection.delete_many({})
        favorites_collection.delete_many({})
        favorite_groups_collection.delete_many({})

    def test_home_route(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)

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
            data=json.dumps({"password": "password123"}),
            content_type="application/json",
        )
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

        # Verify user exists
        user_before = users_collection.find_one({"username": "testuser"})
        self.assertIsNotNone(user_before)

        # Delete account
        response = self.client.delete("/delete-account")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["message"], "Account deleted successfully")

        # Verify user is deleted
        user_after = users_collection.find_one({"username": "testuser"})
        self.assertIsNone(user_after)

    def test_delete_account_removes_favorites(self):
        # Register, login, add favorites
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

        # Delete account
        self.client.delete("/delete-account")

        # Verify favorites are deleted
        favorite_after = list(favorites_collection.find({"username": "testuser"}))
        self.assertEqual(len(favorite_after), 0)

    def test_delete_account_removes_favorite_groups(self):
        # Register, login, add favorite group
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

        # Add a favorite group
        self.client.post(
            "/favorite-groups",
            data=json.dumps({"name": "My Stations"}),
            content_type="application/json",
        )

        # Verify group exists
        group_before = favorite_groups_collection.find_one({"username": "testuser"})
        self.assertIsNotNone(group_before)

        # Delete account
        self.client.delete("/delete-account")

        # Verify groups are deleted
        group_after = list(favorite_groups_collection.find({"username": "testuser"}))
        self.assertEqual(len(group_after), 0)

    def test_delete_account_clears_session(self):
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

        # Delete account
        response = self.client.delete("/delete-account")
        self.assertEqual(response.status_code, 200)

        # Try to access profile (should fail because session is cleared)
        profile_response = self.client.get("/profile")
        self.assertEqual(profile_response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
