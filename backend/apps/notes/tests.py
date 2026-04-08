from datetime import timedelta

from django.contrib.auth.models import User
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.notes.models import Category, Note

# Disable throttling for all tests in this module.
THROTTLE_OVERRIDE = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_THROTTLE_RATES": {},
}

CATEGORIES_URL = "/api/categories/"
NOTES_URL = "/api/notes/"


def note_url(pk):
    return f"/api/notes/{pk}/"


def _make_user(email, password="Str0ng!Pass99"):
    return User.objects.create_user(username=email, email=email, password=password)


def _make_category(user, name="Work", color="#AABBCC"):
    return Category.objects.create(user=user, name=name, color=color)


def _make_note(user, category=None, title="Test note", content="Hello"):
    return Note.objects.create(user=user, category=category, title=title, content=content)


@override_settings(REST_FRAMEWORK=THROTTLE_OVERRIDE)
class CategoryListViewTests(APITestCase):

    def setUp(self):
        self.user = _make_user("alice@example.com")
        self.client.force_authenticate(user=self.user)
        self.cat1 = _make_category(self.user, name="Alpha", color="#111111")
        self.cat2 = _make_category(self.user, name="Beta", color="#222222")

    # --- happy paths ---

    def test_list_returns_200(self):
        response = self.client.get(CATEGORIES_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_returns_only_own_categories(self):
        """User sees only their own categories, not another user's."""
        other = _make_user("other@example.com")
        _make_category(other, name="OtherCat")

        response = self.client.get(CATEGORIES_URL)
        names = [c["name"] for c in response.json()]
        self.assertIn("Alpha", names)
        self.assertIn("Beta", names)
        self.assertNotIn("OtherCat", names)

    def test_list_includes_note_count(self):
        """Each category in the list includes a note_count field."""
        _make_note(self.user, category=self.cat1)
        _make_note(self.user, category=self.cat1)

        response = self.client.get(CATEGORIES_URL)
        data = {c["name"]: c for c in response.json()}
        self.assertEqual(data["Alpha"]["note_count"], 2)
        self.assertEqual(data["Beta"]["note_count"], 0)

    def test_list_fields(self):
        """Category objects expose id, name, color, note_count."""
        response = self.client.get(CATEGORIES_URL)
        first = response.json()[0]
        for field in ("id", "name", "color", "note_count"):
            self.assertIn(field, first)

    # --- auth ---

    def test_unauthenticated_returns_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(CATEGORIES_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- read-only (no POST/PATCH/DELETE) ---

    def test_post_not_allowed(self):
        response = self.client.post(CATEGORIES_URL, {"name": "New", "color": "#FFFFFF"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


@override_settings(REST_FRAMEWORK=THROTTLE_OVERRIDE)
class NoteListCreateTests(APITestCase):

    def setUp(self):
        self.user = _make_user("alice@example.com")
        self.client.force_authenticate(user=self.user)
        self.cat = _make_category(self.user, name="Work")

    # --- list ---

    def test_list_returns_200(self):
        response = self.client.get(NOTES_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_empty_for_new_user(self):
        response = self.client.get(NOTES_URL)
        self.assertEqual(response.json()["results"], [])

    def test_list_returns_own_notes(self):
        _make_note(self.user, title="My note")
        response = self.client.get(NOTES_URL)
        titles = [n["title"] for n in response.json()["results"]]
        self.assertIn("My note", titles)

    def test_list_does_not_return_other_users_notes(self):
        """User isolation: notes belonging to another user are never returned."""
        other = _make_user("other@example.com")
        _make_note(other, title="Other note")

        response = self.client.get(NOTES_URL)
        titles = [n["title"] for n in response.json()["results"]]
        self.assertNotIn("Other note", titles)

    def test_list_filter_by_category(self):
        """?category=<uuid> returns only notes in that category."""
        cat2 = _make_category(self.user, name="Personal")
        _make_note(self.user, category=self.cat, title="Work note")
        _make_note(self.user, category=cat2, title="Personal note")

        response = self.client.get(NOTES_URL, {"category": str(self.cat.id)})
        titles = [n["title"] for n in response.json()["results"]]
        self.assertIn("Work note", titles)
        self.assertNotIn("Personal note", titles)

    def test_list_note_fields(self):
        """Listed notes expose expected fields."""
        _make_note(self.user, category=self.cat)
        response = self.client.get(NOTES_URL)
        note = response.json()["results"][0]
        for field in (
            "id",
            "title",
            "content",
            "category",
            "last_edited_at",
            "created_at",
        ):
            self.assertIn(field, note)

    def test_list_category_is_nested_object(self):
        """Category inside a note is a nested object (id/name/color), not a bare UUID."""
        _make_note(self.user, category=self.cat)
        response = self.client.get(NOTES_URL)
        cat_field = response.json()["results"][0]["category"]
        self.assertIsInstance(cat_field, dict)
        for field in ("id", "name", "color"):
            self.assertIn(field, cat_field)

    def test_list_unauthenticated_returns_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(NOTES_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_pagination_present(self):
        """Response is paginated (has count/results keys)."""
        response = self.client.get(NOTES_URL)
        data = response.json()
        self.assertIn("count", data)
        self.assertIn("results", data)

    # --- create ---

    def test_create_note_returns_201(self):
        payload = {"title": "New note", "content": "Hello world"}
        response = self.client.post(NOTES_URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_note_persists(self):
        payload = {"title": "Persisted", "content": "Body"}
        self.client.post(NOTES_URL, payload, format="json")
        self.assertTrue(Note.objects.filter(user=self.user, title="Persisted").exists())

    def test_create_note_response_has_full_nested_category(self):
        """Create response uses the read serializer (nested category object)."""
        payload = {"title": "With cat", "content": "", "category": str(self.cat.id)}
        response = self.client.post(NOTES_URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        cat_field = response.json()["category"]
        self.assertIsInstance(cat_field, dict)
        self.assertEqual(cat_field["id"], str(self.cat.id))

    def test_create_note_without_category(self):
        """Notes can be created without a category; category field will be null."""
        payload = {"title": "No cat", "content": ""}
        response = self.client.post(NOTES_URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.json()["category"])

    def test_create_note_with_another_users_category_returns_400(self):
        """Assigning another user's category to a note should return 400."""
        other = _make_user("other@example.com")
        other_cat = _make_category(other, name="Private")

        payload = {"title": "Steal cat", "content": "", "category": str(other_cat.id)}
        response = self.client.post(NOTES_URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_note_unauthenticated_returns_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(NOTES_URL, {"title": "x", "content": "y"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_notes_ordered_by_last_edited_at_descending(self):
        """Notes are returned newest-edited first (Meta.ordering = ['-last_edited_at'])."""
        note_a = _make_note(self.user, title="Oldest")
        note_b = _make_note(self.user, title="Middle")
        note_c = _make_note(self.user, title="Newest")

        now = timezone.now()
        Note.objects.filter(pk=note_a.pk).update(last_edited_at=now - timedelta(hours=2))
        Note.objects.filter(pk=note_b.pk).update(last_edited_at=now - timedelta(hours=1))
        Note.objects.filter(pk=note_c.pk).update(last_edited_at=now)

        response = self.client.get(NOTES_URL)
        titles = [n["title"] for n in response.json()["results"]]
        self.assertEqual(titles, ["Newest", "Middle", "Oldest"])

    def test_list_filter_by_invalid_category_uuid_returns_400(self):
        """An invalid UUID in ?category= returns 400 rather than crashing."""
        response = self.client.get(NOTES_URL, {"category": "not-a-uuid"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_note_last_edited_at_not_writable(self):
        """Clients cannot set last_edited_at; the server always controls it."""
        payload = {
            "title": "Time test",
            "content": "",
            "last_edited_at": "2000-01-01T00:00:00Z",
        }
        response = self.client.post(NOTES_URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        returned_ts = response.json()["last_edited_at"]
        self.assertNotEqual(returned_ts, "2000-01-01T00:00:00Z")


@override_settings(REST_FRAMEWORK=THROTTLE_OVERRIDE)
class NoteRetrieveTests(APITestCase):

    def setUp(self):
        self.user = _make_user("alice@example.com")
        self.client.force_authenticate(user=self.user)
        self.note = _make_note(self.user, title="Alice note")

    def test_retrieve_own_note_returns_200(self):
        response = self.client.get(note_url(self.note.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["title"], "Alice note")

    def test_retrieve_returns_expected_fields(self):
        response = self.client.get(note_url(self.note.id))
        data = response.json()
        for field in (
            "id",
            "title",
            "content",
            "category",
            "last_edited_at",
            "created_at",
        ):
            self.assertIn(field, data)

    def test_retrieve_other_users_note_returns_404(self):
        """User isolation: retrieving another user's note returns 404, not 403."""
        other = _make_user("other@example.com")
        other_note = _make_note(other, title="Secret")

        response = self.client.get(note_url(other_note.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_retrieve_nonexistent_returns_404(self):
        response = self.client.get("/api/notes/00000000-0000-0000-0000-000000000000/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_retrieve_unauthenticated_returns_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(note_url(self.note.id))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


@override_settings(REST_FRAMEWORK=THROTTLE_OVERRIDE)
class NoteUpdateTests(APITestCase):

    def setUp(self):
        self.user = _make_user("alice@example.com")
        self.client.force_authenticate(user=self.user)
        self.cat = _make_category(self.user, name="Work")
        self.note = _make_note(self.user, title="Original", content="Old body")

    def test_patch_title_returns_200(self):
        response = self.client.patch(note_url(self.note.id), {"title": "Updated"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["title"], "Updated")

    def test_patch_persists_to_db(self):
        self.client.patch(note_url(self.note.id), {"content": "New body"}, format="json")
        self.note.refresh_from_db()
        self.assertEqual(self.note.content, "New body")

    def test_patch_category_assigns_correctly(self):
        response = self.client.patch(note_url(self.note.id), {"category": str(self.cat.id)}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cat_field = response.json()["category"]
        self.assertEqual(cat_field["id"], str(self.cat.id))

    def test_patch_category_null_clears_category(self):
        """PATCH with category=null detaches the category from the note."""
        self.note.category = self.cat
        self.note.save()

        response = self.client.patch(note_url(self.note.id), {"category": None}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.json()["category"])

    def test_patch_response_uses_read_serializer(self):
        """PATCH response always returns the full nested representation."""
        _make_note(self.user, category=self.cat, title="Other")
        response = self.client.patch(note_url(self.note.id), {"category": str(self.cat.id)}, format="json")
        cat_field = response.json()["category"]
        self.assertIsInstance(cat_field, dict)
        for field in ("id", "name", "color"):
            self.assertIn(field, cat_field)

    def test_patch_other_users_note_returns_404(self):
        other = _make_user("other@example.com")
        other_note = _make_note(other, title="Not mine")

        response = self.client.patch(note_url(other_note.id), {"title": "Hacked"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patch_with_other_users_category_returns_400(self):
        other = _make_user("other@example.com")
        other_cat = _make_category(other, name="Stolen cat")

        response = self.client.patch(note_url(self.note.id), {"category": str(other_cat.id)}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_put_not_allowed(self):
        """Full PUT is disabled; only PATCH is allowed."""
        response = self.client.put(note_url(self.note.id), {"title": "x", "content": "y"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_patch_unauthenticated_returns_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.patch(note_url(self.note.id), {"title": "x"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


@override_settings(REST_FRAMEWORK=THROTTLE_OVERRIDE)
class NoteDeleteTests(APITestCase):

    def setUp(self):
        self.user = _make_user("alice@example.com")
        self.client.force_authenticate(user=self.user)
        self.note = _make_note(self.user, title="To delete")

    def test_delete_own_note_returns_204(self):
        response = self.client.delete(note_url(self.note.id))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_removes_from_db(self):
        note_id = self.note.id
        self.client.delete(note_url(note_id))
        self.assertFalse(Note.objects.filter(id=note_id).exists())

    def test_delete_other_users_note_returns_404(self):
        other = _make_user("other@example.com")
        other_note = _make_note(other, title="Not mine")

        response = self.client.delete(note_url(other_note.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        # Verify the note still exists in DB
        self.assertTrue(Note.objects.filter(id=other_note.id).exists())

    def test_delete_nonexistent_returns_404(self):
        response = self.client.delete("/api/notes/00000000-0000-0000-0000-000000000000/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_unauthenticated_returns_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.delete(note_url(self.note.id))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


@override_settings(REST_FRAMEWORK=THROTTLE_OVERRIDE)
class UserIsolationTests(APITestCase):
    """
    Explicit cross-user isolation tests — user A cannot read, modify,
    or delete user B's data in any way.
    """

    def setUp(self):
        self.alice = _make_user("alice@example.com")
        self.bob = _make_user("bob@example.com")
        self.alice_cat = _make_category(self.alice, name="Alice cat")
        self.bob_cat = _make_category(self.bob, name="Bob cat")
        self.alice_note = _make_note(self.alice, category=self.alice_cat, title="Alice note")
        self.bob_note = _make_note(self.bob, category=self.bob_cat, title="Bob note")

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_alice_cannot_see_bobs_notes_in_list(self):
        self._auth(self.alice)
        response = self.client.get(NOTES_URL)
        ids = [n["id"] for n in response.json()["results"]]
        self.assertIn(str(self.alice_note.id), ids)
        self.assertNotIn(str(self.bob_note.id), ids)

    def test_bob_cannot_see_alices_notes_in_list(self):
        self._auth(self.bob)
        response = self.client.get(NOTES_URL)
        ids = [n["id"] for n in response.json()["results"]]
        self.assertNotIn(str(self.alice_note.id), ids)

    def test_alice_cannot_retrieve_bobs_note(self):
        self._auth(self.alice)
        response = self.client.get(note_url(self.bob_note.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_alice_cannot_patch_bobs_note(self):
        self._auth(self.alice)
        response = self.client.patch(note_url(self.bob_note.id), {"title": "Hijacked"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.bob_note.refresh_from_db()
        self.assertEqual(self.bob_note.title, "Bob note")

    def test_alice_cannot_delete_bobs_note(self):
        self._auth(self.alice)
        response = self.client.delete(note_url(self.bob_note.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Note.objects.filter(id=self.bob_note.id).exists())

    def test_alice_cannot_see_bobs_categories(self):
        self._auth(self.alice)
        response = self.client.get(CATEGORIES_URL)
        names = [c["name"] for c in response.json()]
        self.assertIn("Alice cat", names)
        self.assertNotIn("Bob cat", names)

    def test_alice_cannot_assign_bobs_category_to_her_note(self):
        """Using Bob's category UUID in a create/patch must be rejected."""
        self._auth(self.alice)
        response = self.client.patch(
            note_url(self.alice_note.id),
            {"category": str(self.bob_cat.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.alice_note.refresh_from_db()
        # Category on Alice's note must still be her own category
        self.assertEqual(self.alice_note.category, self.alice_cat)
