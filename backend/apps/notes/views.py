import uuid

from django.db.models import Count
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination

from .models import Category, Note
from .serializers import CategorySerializer, NoteSerializer, NoteWriteSerializer


class NotePagination(PageNumberPagination):
    page_size = 50


class CategoryListView(ListAPIView):
    serializer_class = CategorySerializer

    def get_queryset(self):
        return Category.objects.filter(user=self.request.user).annotate(note_count=Count("notes"))


class NoteViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "patch", "delete"]
    pagination_class = NotePagination

    def get_queryset(self):
        qs = Note.objects.select_related("category").filter(user=self.request.user)
        category_id = self.request.query_params.get("category")
        if category_id:
            try:
                uuid.UUID(category_id)
            except ValueError:
                raise ValidationError({"category": "Enter a valid UUID."})
            qs = qs.filter(category_id=category_id)
        return qs

    def get_serializer_class(self):
        if self.action in ("create", "partial_update"):
            return NoteWriteSerializer
        return NoteSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
