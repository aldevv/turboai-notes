from django.db import migrations


class Migration(migrations.Migration):
    """Add a unique index on auth_user.email at the DB level."""

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.RunSQL(
            sql="CREATE UNIQUE INDEX unique_auth_user_email ON auth_user (email) WHERE email != '';",
            reverse_sql="DROP INDEX IF EXISTS unique_auth_user_email;",
        ),
    ]
