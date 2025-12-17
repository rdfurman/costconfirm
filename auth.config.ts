import type { NextAuthConfig } from "next-auth";

// This config is used in middleware (Edge Runtime)
// It cannot import from lib/db or use Prisma
export const authConfig = {
  providers: [],
  callbacks: {
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/projects") ||
                            nextUrl.pathname.startsWith("/dashboard");
      const isOnAuth = nextUrl.pathname.startsWith("/auth/signin") ||
                       nextUrl.pathname.startsWith("/auth/register");

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn && isOnAuth) {
        return Response.redirect(new URL("/projects", nextUrl));
      }
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;
