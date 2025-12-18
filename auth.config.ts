import type { NextAuthConfig } from "next-auth";

// This config is used in middleware (Edge Runtime)
// It cannot import from lib/db or use Prisma
export const authConfig = {
  providers: [],
  callbacks: {
    // Map JWT token fields to session user object for middleware
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as "CLIENT" | "ADMIN";
        session.user.emailVerified = token.emailVerified as Date | null;
      }
      return session;
    },
    async jwt({ token }) {
      // Just pass through the token in middleware
      return token;
    },
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isEmailVerified = !!auth?.user?.emailVerified;
      const isOnDashboard = nextUrl.pathname.startsWith("/projects") ||
                            nextUrl.pathname.startsWith("/dashboard");
      const isOnAuth = nextUrl.pathname.startsWith("/auth/signin") ||
                       nextUrl.pathname.startsWith("/auth/register");
      const isOnVerifyReminder = nextUrl.pathname === "/auth/verify-email";
      const isOnVerifyEndpoint = nextUrl.pathname === "/api/auth/verify";
      const isOnVerifySuccess = nextUrl.pathname === "/auth/verify-success";

      // Allow access to verification pages
      if (isOnVerifyReminder || isOnVerifyEndpoint || isOnVerifySuccess) {
        return true;
      }

      // Protected routes require authentication AND verified email
      if (isOnDashboard) {
        if (!isLoggedIn) return false; // Redirect to login
        if (!isEmailVerified) {
          return Response.redirect(new URL("/auth/verify-email", nextUrl));
        }
        return true;
      }

      // Redirect authenticated users away from auth pages
      if (isLoggedIn && isOnAuth) {
        // If email not verified, send to verification page
        if (!isEmailVerified) {
          return Response.redirect(new URL("/auth/verify-email", nextUrl));
        }
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
