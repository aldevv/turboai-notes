from rest_framework import serializers

from .models import Category, Note


class CategorySerializer(serializers.ModelSerializer):
    note_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "color", "note_count"]


class CategoryInNoteSerializer(serializers.ModelSerializer):
    """Nested read-only category inside a note — no note_count."""

    class Meta:
        model = Category
        fields = ["id", "name", "color"]


class NoteSerializer(serializers.ModelSerializer):
    """Read serializer — category is fully nested."""

    category = CategoryInNoteSerializer(read_only=True)

    class Meta:
        model = Note
        fields = ["id", "title", "content", "category", "last_edited_at", "created_at"]


class NoteWriteSerializer(serializers.ModelSerializer):
    """Write serializer — category accepted as UUID or null."""

    # allow_null=True: PATCH with {"category": null} clears the note's category.
    # required=False: notes can be created without specifying a category.
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Note
        fields = ["title", "content", "category"]

    def validate_category(self, value):
        if value is not None and value.user != self.context["request"].user:
            raise serializers.ValidationError("Category not found.")
        return value

    def to_representation(self, instance):
        """After write, return the full nested representation."""
        return NoteSerializer(instance, context=self.context).data
