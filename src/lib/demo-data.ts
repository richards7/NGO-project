// Role and navigation configuration for the Medical NGO Camp Management System.
export type Role =
  | "admin"
  | "registration"
  | "doctor"
  | "pharmacy";

export const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "admin", label: "NGO Admin", description: "Manage camps, patients, reports & analytics" },
  { value: "registration", label: "Registration + Medical", description: "Register patients, capture vitals & manage queue" },
  { value: "doctor", label: "Doctor", description: "Consult patients & prescribe medicines" },
  { value: "pharmacy", label: "Pharmacy", description: "Dispense medicines & manage inventory" },
];

export const ROLE_HOME: Record<Role, string> = {
  admin: "/dashboard",
  registration: "/patients",
  doctor: "/queue",
  pharmacy: "/pharmacy",
};

export const DEMO_USERS = [
  { name: "Dr. Ananya Rao", email: "admin@arogya.ngo", role: "admin" as Role },
  { name: "Priya Sharma", email: "registration@arogya.ngo", role: "registration" as Role },
  { name: "Dr. Vikram Iyer", email: "vikram@arogya.ngo", role: "doctor" as Role },
  { name: "Suresh Kumar", email: "pharmacy@arogya.ngo", role: "pharmacy" as Role },
];
