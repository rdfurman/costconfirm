import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "CLIENT" | "ADMIN";
      emailVerified: Date | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: "CLIENT" | "ADMIN";
    emailVerified: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "CLIENT" | "ADMIN";
    emailVerified: Date | null;
  }
}
