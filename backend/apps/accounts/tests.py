from unittest.mock import patch

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from apps.notes.models import Category

# AuthRateThrottle is applied directly on SignupView and LoginView.
# Patch allow_request to always return True so throttle does not affect tests.
_throttle_patch = patch(
    "apps.accounts.throttles.AuthRateThrottle.allow_request",
    return_value=True,
)


class SignupViewTests(APITestCase):
    URL = "/api/auth/signup/"

    def setUp(self):
        _throttle_patch.start()

    def tearDown(self):
        _throttle_patch.stop()

    def test_signup_happy_path(self):
        """Valid signup returns 201 with access/refresh tokens and user object."""
        payload = {"email": "alice@example.com", "password": "Str0ng!Pass99"}
        response = self.client.post(self.URL, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertIn("access", data)
        self.assertIn("refresh", data)
        self.assertIn("user", data)
        self.assertEqual(data["user"]["email"], "alice@example.com")
        self.assertIn("id", data["user"])

    def test_signup_creates_user_in_db(self):
        """After successful signup the user exists in the database."""
        payload = {"email": "bob@example.com", "password": "Str0ng!Pass99"}
        self.client.post(self.URL, payload, format="json")

        self.assertTrue(User.objects.filter(email="bob@example.com").exists())

    def test_signup_creates_default_categories(self):
        """Signup creates 3 default categories for the new user."""
        payload = {"email": "carol@example.com", "password": "Str0ng!Pass99"}
        self.client.post(self.URL, payload, format="json")

        user = User.objects.get(email="carol@example.com")
        cats = list(Category.objects.filter(user=user).values_list("name", flat=True))
        self.assertEqual(len(cats), 3)
        for expected in ("Random Thoughts", "School", "Personal"):
            self.assertIn(expected, cats)

    def test_signup_duplicate_email_returns_400(self):
        """Signing up with an already-registered email returns 400."""
        payload = {"email": "dave@example.com", "password": "Str0ng!Pass99"}
        self.client.post(self.URL, payload, format="json")

        response = self.client.post(self.URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.json())

    def test_signup_missing_email_returns_400(self):
        """Signup without email returns 400."""
        response = self.client.post(self.URL, {"password": "Str0ng!Pass99"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_signup_invalid_email_returns_400(self):
        """Signup with a malformed email returns 400."""
        response = self.client.post(
            self.URL,
            {"email": "not-an-email", "password": "Str0ng!Pass99"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_signup_missing_password_returns_400(self):
        """Signup without password returns 400."""
        response = self.client.post(self.URL, {"email": "eve@example.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_signup_weak_password_returns_400(self):
        """Django's password validators reject a too-short/common password."""
        response = self.client.post(self.URL, {"email": "frank@example.com", "password": "123"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.json())

    def test_signup_tokens_are_strings(self):
        """Returned access and refresh tokens are non-empty strings."""
        payload = {"email": "grace@example.com", "password": "Str0ng!Pass99"}
        response = self.client.post(self.URL, payload, format="json")
        data = response.json()
        self.assertIsInstance(data["access"], str)
        self.assertGreater(len(data["access"]), 0)
        self.assertIsInstance(data["refresh"], str)
        self.assertGreater(len(data["refresh"]), 0)


class LoginViewTests(APITestCase):
    URL = "/api/auth/login/"

    def setUp(self):
        _throttle_patch.start()
        self.user = User.objects.create_user(
            username="heidi@example.com",
            email="heidi@example.com",
            password="Str0ng!Pass99",
        )

    def tearDown(self):
        _throttle_patch.stop()

    def test_login_happy_path(self):
        """Valid credentials return 200 with access/refresh tokens and user object."""
        response = self.client.post(
            self.URL,
            {
                "email": "heidi@example.com",
                "password": "Str0ng!Pass99",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("access", data)
        self.assertIn("refresh", data)
        self.assertIn("user", data)
        self.assertEqual(data["user"]["email"], "heidi@example.com")
        self.assertEqual(data["user"]["id"], self.user.id)

    def test_login_wrong_password_returns_401(self):
        """Wrong password returns 401."""
        response = self.client.post(
            self.URL,
            {
                "email": "heidi@example.com",
                "password": "WrongPass999",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_unknown_email_returns_401(self):
        """Non-existent email returns 401."""
        response = self.client.post(
            self.URL,
            {
                "email": "nobody@example.com",
                "password": "Str0ng!Pass99",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_missing_email_returns_400(self):
        """Login without email field returns 400."""
        response = self.client.post(self.URL, {"password": "Str0ng!Pass99"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_missing_password_returns_400(self):
        """Login without password field returns 400."""
        response = self.client.post(self.URL, {"email": "heidi@example.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_tokens_are_usable(self):
        """The access token returned by login can authenticate subsequent requests."""
        response = self.client.post(
            self.URL,
            {
                "email": "heidi@example.com",
                "password": "Str0ng!Pass99",
            },
            format="json",
        )
        token = response.json()["access"]

        # Use the token against a protected endpoint (categories list)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        cats_response = self.client.get("/api/categories/")
        self.assertEqual(cats_response.status_code, status.HTTP_200_OK)


class TokenRefreshTests(APITestCase):
    URL = "/api/auth/refresh/"

    def setUp(self):
        _throttle_patch.start()
        User.objects.create_user(
            username="refresh@example.com",
            email="refresh@example.com",
            password="Str0ng!Pass99",
        )
        # Obtain a real refresh token via the login endpoint.
        response = self.client.post(
            "/api/auth/login/",
            {
                "email": "refresh@example.com",
                "password": "Str0ng!Pass99",
            },
            format="json",
        )
        self.refresh_token = response.json()["refresh"]

    def tearDown(self):
        _throttle_patch.stop()

    def test_valid_refresh_returns_200_with_new_access_token(self):
        """POST /api/auth/refresh/ with a valid refresh token returns 200 and an access token."""
        response = self.client.post(self.URL, {"refresh": self.refresh_token}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("access", data)
        self.assertIsInstance(data["access"], str)
        self.assertGreater(len(data["access"]), 0)

    def test_new_access_token_is_usable(self):
        """The refreshed access token can authenticate protected endpoints."""
        response = self.client.post(self.URL, {"refresh": self.refresh_token}, format="json")
        new_access = response.json()["access"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {new_access}")
        cats_response = self.client.get("/api/categories/")
        self.assertEqual(cats_response.status_code, status.HTTP_200_OK)

    def test_invalid_refresh_token_returns_401(self):
        """A tampered or invalid refresh token is rejected with 401."""
        response = self.client.post(self.URL, {"refresh": "totally.invalid.token"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_missing_refresh_token_returns_400(self):
        """Request body without a refresh field returns 400."""
        response = self.client.post(self.URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
