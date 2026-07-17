export type Role = "admin" | "professor" | "responsavel";

export interface AuthClaims {
  sub: string;
  email: string;
  groups: Role[];
  role: Role;
}
