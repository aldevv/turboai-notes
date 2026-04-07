from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import SignupView, LoginView

urlpatterns = [
    path('signup/',  SignupView.as_view(),       name='auth-signup'),
    path('login/',   LoginView.as_view(),        name='auth-login'),
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
]
