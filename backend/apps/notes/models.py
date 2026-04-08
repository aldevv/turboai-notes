import uuid

from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from django.db import models

hex_color_validator = RegexValidator(
    regex=r"^#[0-9A-Fa-f]{6}$",
    message="Color must be a valid hex color code (e.g., #FFFFFF).",
)


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="categories", db_index=True)
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, validators=[hex_color_validator])  # hex e.g. "#E8B4A8"
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.name} ({self.user.email})"


class Note(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notes", db_index=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notes",
        db_index=True,
    )
    title = models.TextField(blank=True, default="", max_length=500)
    content = models.TextField(blank=True, default="", max_length=50000)
    last_edited_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-last_edited_at"]

    def __str__(self):
        return f"{self.title or '(untitled)'} — {self.user.email}"
