import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import Credentials from "next-auth/providers/credentials";
import { verifyPassword } from "@/lib/password";
import { authConfig } from "@/auth.config";
import { checkAuthRateLimit, resetAuthRateLimit } from "@/lib/rate-limit";
import { logAuthSuccess, logAuthFailure, logRateLimit } from "@/lib/security-logger";
import {
  checkAccountLockout,
  recordFailedAttempt,
  resetFailedAttempts,
} from "@/lib/account-lockout";

// Full auth configuration with database adapter
// This is used in server components and API routes
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db) as any,

  // Session configuration
  session: {
    strategy: "jwt", // Required for Credentials provider
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "your@email.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;

        // Check account lockout - prevent brute force attacks
        try {
          await checkAccountLockout(email);
        } catch (error) {
          // Account is locked
          console.error(`Account locked: ${email}`);
          return null;
        }

        // Check rate limit - prevent brute force attacks
        try {
          await checkAuthRateLimit(email);
        } catch (error) {
          // Log rate limit hit
          await logRateLimit("auth", email);
          console.error(`Rate limit exceeded for ${email}`);
          return null;
        }

        // Find user by email (exclude soft-deleted users)
        const user = await db.user.findUnique({
          where: { email },
        });

        // User doesn't exist, has no password, or is deleted
        if (!user || !user.hashedPassword || user.deletedAt) {
          // Still consume time to prevent timing attacks
          await verifyPassword(
            credentials.password as string,
            "$2a$12$invalidhashtopreventtimingattacks1234567890123456789012"
          );
          // Log and record failed attempt
          await logAuthFailure(
            email,
            user?.deletedAt ? "Account deleted" : "Invalid credentials"
          );
          await recordFailedAttempt(email);
          return null; // Generic error prevents email enumeration
        }

        // Verify password
        const isValidPassword = await verifyPassword(
          credentials.password as string,
          user.hashedPassword
        );

        if (!isValidPassword) {
          // Log and record failed attempt
          await logAuthFailure(email, "Invalid password");
          await recordFailedAttempt(email);
          return null;
        }

        // Success - reset rate limit, lockout, and log success
        await resetAuthRateLimit(email);
        await resetFailedAttempts(email);
        await logAuthSuccess(user.id, user.email);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as "CLIENT" | "ADMIN";
      }
      return session;
    },
    async jwt({ token, user }) {
      // First time JWT is created (on sign in)
      if (user) {
        token.sub = user.id; // Set user ID
        token.role = user.role;
      }
      return token;
    },
  },
});
