// Username -> synthetic email helper.
// Supabase Auth requires email; we let users sign in with username only.
export const SYNTHETIC_EMAIL_DOMAIN = "asror.local";

export const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase()}@${SYNTHETIC_EMAIL_DOMAIN}`;

export type AppRole =
  | "super_admin"
  | "admin"
  | "administrator"
  | "teacher"
  | "student";

export const roleHomePath: Record<AppRole, string> = {
  super_admin: "/super-admin/dashboard",
  admin: "/admin/dashboard",
  administrator: "/administrator/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
};

export const roleLabel: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  administrator: "Administrator",
  teacher: "O'qituvchi",
  student: "Talaba",
};
