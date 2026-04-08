import os

from django.urls import path, include
from django.views.generic import RedirectView

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

urlpatterns = [
    path("", RedirectView.as_view(url=FRONTEND_URL)),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/", include("apps.notes.urls")),
]
