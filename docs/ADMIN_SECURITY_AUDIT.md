# CostConfirm Admin Features - Security Audit Report

**Date**: 2025-12-18
**Scope**: Admin promotion script, user management interface, authorization checks
**Status**: ⚠️ **DO NOT DEPLOY TO PRODUCTION** - Critical issues found

---

## Executive Summary

**Overall Security Posture**: **B+ (Good with Critical Issues)**

- ✅ Strong authentication and authorization fundamentals
- ✅ Proper rate limiting and account lockout
- ✅ Security logging implemented
- ⚠️ **3 CRITICAL vulnerabilities requiring immediate fix**
- ⚠️ 6 high-priority issues for pre-launch
- ℹ️ 9 medium/low priority improvements

**Critical Findings**:
1. `.env` file committed to repository exposing production secrets
2. Missing server-side authorization on admin route page component
3. Admin promotion script accessible in production Docker container

---

## CRITICAL Issues - Fix Before Production (P0)

### 1. Environment File Committed to Repository ⚠️ CRITICAL

**File**: `.env` (lines 1-18)
**Risk**: Complete system compromise if repository is leaked

**Problem**: Production secrets are committed to git:
- `POSTGRES_PASSWORD`
- `NEXTAUTH_SECRET` / `AUTH_SECRET`
- `RESEND_API_KEY`

**Fix NOW**:
```bash
# 1. Remove from repository
git rm --cached .env
git commit -m "Remove .env from repository"

# 2. Rotate ALL secrets immediately
openssl rand -base64 32  # New NEXTAUTH_SECRET
openssl rand -base64 32  # New POSTGRES_PASSWORD
# Create new Resend API key at https://resend.com/api-keys

# 3. Clean git history (secrets are in old commits!)
# Use BFG Repo-Cleaner or git-filter-repo
git filter-repo --path .env --invert-paths
git push origin --force --all
```

**Create** `.env.example`:
```env
POSTGRES_PASSWORD=your_secure_password_here
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
AUTH_SECRET=same_as_nextauth_secret
RESEND_API_KEY=your_resend_api_key_here
```

---

### 2. Missing Server-Side Authorization on Admin Route ⚠️ CRITICAL

**File**: `app/(dashboard)/admin/users/page.tsx`
**Risk**: CLIENT users can access admin page structure

**Problem**: Page component doesn't verify admin role before rendering

**Fix**: Create admin layout with authorization:

**NEW FILE**: `app/(dashboard)/admin/layout.tsx`
```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Redirect non-admins
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/projects");
  }

  return <>{children}</>;
}
```

This protects ALL `/admin/*` routes automatically.

---

### 3. Admin Script Accessible in Production Container ⚠️ CRITICAL

**Files**: `Dockerfile` (line 45, 50), `docker-compose.yml` (line 52)
**Risk**: Container access = admin privilege escalation

**Problem**: Scripts and tsx are in production container:
```dockerfile
RUN npm install -g tsx  # Line 45
COPY --from=builder /app/scripts ./scripts  # Line 50
```

**Fix**: Remove from production build:

**Dockerfile** - Remove these lines:
```diff
- # Install tsx globally for running scripts
- RUN npm install -g tsx

- # Copy necessary files
  COPY --from=builder /app/package.json ./package.json
  COPY --from=builder /app/prisma ./prisma
- COPY --from=builder /app/scripts ./scripts
```

**docker-compose.yml** - Remove scripts mount:
```diff
  volumes:
    - ./app:/app/app
    - ./lib:/app/lib
    - ./prisma:/app/prisma
-   - ./scripts:/app/scripts
    - ./types:/app/types
```

**For production admin promotion**, use direct database access:
```bash
# On production database server
psql $DATABASE_URL -c "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'admin@example.com';"
```

---

## High Priority - Fix Before Launch (P1)

### 4. Weak Email Validation in Admin Script

**File**: `scripts/make-admin.ts:34`

Update regex to RFC 5322 compliant:
```typescript
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

if (email.length > 254) {
  console.error(`❌ Error: Email too long (max 254 characters)\n`);
  process.exit(1);
}
```

---

### 5. Command Injection Risk in Docker-Compose

**File**: `docker-compose.yml:57,72`

Use array syntax instead of shell strings:
```yaml
# Line 57
command: ["node", "server.js"]
```

---

### 6. No Rate Limiting on Admin Server Actions

**File**: `lib/actions/users.ts`

Add rate limiting:
```typescript
import { checkAdminActionRateLimit } from "@/lib/rate-limit";

export async function getAllUsers() {
  const user = await requireAuth();

  if (user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await checkAdminActionRateLimit(user.id);  // Add this

  const users = await db.user.findMany({ /* ... */ });
  return users;
}
```

---

### 7. Missing Audit Logging for Admin Data Access

**File**: `lib/actions/users.ts`

Log all admin data access:
```typescript
export async function getAllUsers() {
  const user = await requireAuth();

  if (user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  // Log access
  await db.securityLog.create({
    data: {
      event: "admin_user_list_access",
      userId: user.id,
      email: user.email,
      action: "read",
      resource: "users:all",
    },
  });

  const users = await db.user.findMany({ /* ... */ });
  return users;
}
```

---

### 8. Admin Navigation Without Server-Side Reverification

**File**: `app/(dashboard)/layout.tsx:38-45`

Add defense-in-depth by verifying role from database:
```tsx
// Double-check user role from database
const userFromDb = await db.user.findUnique({
  where: { id: session.user.id },
  select: { role: true, deletedAt: true },
});

if (!userFromDb || userFromDb.deletedAt) {
  redirect("/api/auth/signout");
}

const isAdmin = userFromDb.role === "ADMIN";
```

---

### 9. Insufficient Input Validation on Cost Calculations

**File**: `lib/actions/actual-costs.ts`, `lib/actions/projected-costs.ts`

Add overflow and limit checks:
```typescript
const totalCost = count * unitCost;

if (!Number.isFinite(totalCost)) {
  throw new Error("Invalid calculation: total cost is not finite");
}

if (totalCost > 99999999.99) {
  throw new Error("Total cost exceeds maximum ($99,999,999.99)");
}

const roundedTotal = Math.round(totalCost * 100) / 100;
```

---

## Medium Priority (P2)

10. **Missing CSRF Protection** - Add explicit CSRF verification
11. **Database Connection Exposed** - Use Docker secrets in production
12. **Prisma Studio Without Auth** - Bind to localhost only
13. **Error Messages Leak Info** - Use generic error messages
14. **No Max Password Length** - Add 72 character bcrypt limit
15. **Session Timeout Too Long** - Reduce from 30 days to 7 days

---

## Low Priority (P3)

16. **CSP Too Permissive** - Remove `unsafe-eval` and `unsafe-inline`
17. **No Security Header Tests** - Add automated testing
18. **Missing DB Query Timeouts** - Add 10 second timeout

---

## Remediation Timeline

### ⚠️ Phase 1: IMMEDIATE (Next 1 Hour)
**DO NOT DEPLOY until complete:**

1. Remove `.env` from git & rotate secrets (30 min)
2. Add admin layout with authorization (15 min)
3. Remove scripts from production Dockerfile (15 min)

**Total**: 1 hour

---

### 🔥 Phase 2: SHORT-TERM (Next 1 Week)
**Complete before handling customer data:**

Issues #4-9 (email validation, rate limiting, audit logging, cost validation)

**Total**: ~9 hours

---

### 🛡️ Phase 3: MEDIUM-TERM (Next 1 Month)
**Complete before production launch:**

Issues #10-15 (CSRF, secrets, error messages, session timeout)

**Total**: ~8 hours

---

### 📊 Phase 4: LONG-TERM (Next 3 Months)
**Complete before enterprise customers:**

Issues #16-18 + security automation

**Total**: ~15 hours

---

## Testing Checklist

After Phase 1 fixes:

- [ ] Verify `.env` removed from all git commits
- [ ] Test CLIENT user cannot access `/admin/users`
- [ ] Verify scripts not in production container: `docker exec costconfirm-app ls /app/scripts` (should fail)
- [ ] Verify tsx not installed: `docker exec costconfirm-app which tsx` (should not exist)
- [ ] Test admin can still access admin pages
- [ ] Verify new secrets work for authentication

---

## Security Strengths Found ✅

- Proper authentication with Auth.js
- Rate limiting on auth attempts
- Account lockout after failed attempts
- Security logging infrastructure
- Soft delete for GDPR compliance
- Role-based access control (RBAC)
- Server-side cost calculations (not client-side)
- Input validation with Zod schemas

---

## Conclusion

**Status**: ⚠️ **NOT PRODUCTION READY**

Fix the 3 critical issues in Phase 1 (1 hour) before deploying. The application has strong security fundamentals, but the exposed `.env` file poses an immediate and severe risk.

Once Phase 1 is complete, the app will be secure for development and testing. Complete Phases 2-3 before production launch.

---

**Next Steps**: See `docs/ADMIN_SECURITY_FIXES.md` for step-by-step remediation guide.
