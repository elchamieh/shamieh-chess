export type AccessProfile = {
  role?: string | null;
  approved?: boolean | null;
  frozen?: boolean | null;
  is_admin?: boolean | null;
};

export function hasAdminAccess(profile: AccessProfile | null | undefined) {
  return Boolean(
    profile?.approved === true &&
    profile?.frozen !== true &&
    (profile?.role === "admin" || profile?.is_admin === true),
  );
}
