export function isSuperAdminEmail(email) {
  const superAdminEmail = getSuperAdminEmail();
  return Boolean(superAdminEmail && email?.trim().toLowerCase() === superAdminEmail);
}

export function isSuperAdminAccount(user) {
  return user?.role === "admin" && isSuperAdminEmail(user.email);
}

export function getSuperAdminEmail() {
  return process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() || "";
}
