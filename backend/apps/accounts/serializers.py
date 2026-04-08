from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password as dj_validate
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import exceptions, serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.settings import api_settings

from apps.notes.models import Category

DEFAULT_CATEGORIES = [
    {"name": "Random Thoughts", "color": "#E8B4A8"},
    {"name": "School", "color": "#F5E6C8"},
    {"name": "Personal", "color": "#B8D9D1"},
]


class SignupSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_password(self, value):
        try:
            dj_validate(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        for cat in DEFAULT_CATEGORIES:
            Category.objects.create(user=user, **cat)
        return user


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Accept 'email' in the login request.

    Django's default auth backend authenticates by `username`.
    At signup we set username=email, so we pass the email value
    as the `username` kwarg to authenticate().
    """

    username_field = "email"

    def validate(self, attrs):
        # Re-key 'email' -> 'username' so Django's auth backend can find the user.
        email = attrs["email"]
        password = attrs["password"]

        user = authenticate(
            request=self.context.get("request"),
            username=email,
            password=password,
        )

        if not api_settings.USER_AUTHENTICATION_RULE(user):
            raise exceptions.AuthenticationFailed(
                self.error_messages["no_active_account"],
                "no_active_account",
            )

        self.user = user
        refresh = self.get_token(user)
        data = {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }
        return data
