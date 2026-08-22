# Dual admin note

The production Supabase Edge Functions `admin-create-coach`, `admin-create-student`, and `admin-manage-student` accept an approved, non-frozen caller when either `profiles.role = 'admin'` or `profiles.is_admin = true`.

This keeps Sayyed Shamieh's primary `coach` role and class assignments intact while granting the same administrative account-management capabilities as the primary admin.
