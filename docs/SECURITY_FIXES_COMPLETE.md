# Security Fixes - Completion Guide

**Status**: ✅ Code fixes implemented
**Next**: Manual secret rotation required

---

## ✅ Completed (Automated Fixes)

1. ✅ **Admin route protection** - Created `app/(dashboard)/admin/layout.tsx`
2. ✅ **Production Dockerfile secured** - Removed tsx and scripts directory
3. ✅ **Docker compose secured** - Removed scripts volume mount
4. ✅ **Environment template** - Created `.env.example`
5. ✅ **.gitignore verified** - `.env` is properly ignored

---

## ⚠️ REQUIRED: Manual Steps (Do This Now)

### Step 1: Remove .env from Git History (CRITICAL)

The `.env` file is currently committed to your repository. You must remove it and clean the history:

```bash
# 1. Remove .env from git (but keep local copy)
git rm --cached .env

# 2. Commit the removal
git commit -m "security: Remove .env from repository"

# 3. CRITICAL: Clean git history (secrets are in old commits!)
# Option A: Using git-filter-repo (recommended)
pip install git-filter-repo
git filter-repo --path .env --invert-paths

# Option B: Using BFG Repo-Cleaner
# Download from: https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --delete-files .env --no-blob-protection .
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 4. Force push (WARNING: coordinate with team first!)
git push origin --force --all
git push origin --force --tags
```

**IMPORTANT**: If this is a public repository or others have cloned it, ALL copies must be updated and all secrets must be rotated immediately.

---

### Step 2: Rotate ALL Secrets (CRITICAL)

The current secrets in `.env` are compromised. Generate new ones:

```bash
# Generate new authentication secrets
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
echo "AUTH_SECRET=$(openssl rand -base64 32)"  # Use same value as NEXTAUTH_SECRET

# Generate new database password
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
```

**Action Items**:

1. **Update your local `.env`** with new secrets:
   ```env
   NEXTAUTH_SECRET=<new_value_from_above>
   AUTH_SECRET=<same_as_nextauth_secret>
   POSTGRES_PASSWORD=<new_value_from_above>
   DATABASE_URL=postgresql://costconfirm:<new_password>@db:5432/costconfirm
   ```

2. **Create new Resend API key**:
   - Visit: https://resend.com/api-keys
   - Delete old key: `re_iCMjkcXU_Q4nxtRadoGaDuEo1SujMXiY5`
   - Create new key
   - Add to `.env`: `RESEND_API_KEY=re_your_new_key`

3. **Rebuild containers** with new secrets:
   ```bash
   docker-compose down -v  # WARNING: Deletes all data!
   docker-compose up --build
   ```

---

### Step 3: Update Production Environment (If Already Deployed)

If you've already deployed to production:

1. **Update environment variables** in your hosting platform (Vercel/Railway/AWS/etc.)
2. **Rotate database credentials** on your production database
3. **Revoke old API keys** from third-party services
4. **Force logout all users** (sessions will be invalidated with new NEXTAUTH_SECRET)

---

## 🧪 Testing After Fixes

Run these tests to verify everything is secure:

### Test 1: Admin Route Protection
```bash
# As CLIENT user, try to access /admin/users
# Should redirect to /projects
```

### Test 2: Scripts Not in Production Container
```bash
# Should fail or return empty
docker exec costconfirm-app ls /app/scripts
# Error: No such file or directory ✅

# Should not exist
docker exec costconfirm-app which tsx
# Error: not found ✅
```

### Test 3: .env Not in Git
```bash
# Should not show .env
git ls-files | grep .env
# (no output) ✅

# Verify .env.example is tracked
git ls-files | grep .env.example
# .env.example ✅
```

### Test 4: New Secrets Work
```bash
# Start containers with new secrets
docker-compose up

# Try to sign in
# Should work with new authentication secrets ✅
```

---

## 📋 Production Deployment Checklist

Before deploying to production:

- [ ] Git history cleaned (no `.env` in any commit)
- [ ] All secrets rotated
- [ ] `.env.example` committed and pushed
- [ ] `.env` removed from repository
- [ ] Admin routes tested (CLIENT users cannot access)
- [ ] Scripts not in production Docker image
- [ ] New authentication secrets work
- [ ] Resend API key rotated
- [ ] Production environment variables updated
- [ ] Team notified of forced logout (due to secret rotation)

---

## 🔐 How to Promote Admins in Production

Now that scripts are removed from production, use one of these methods:

### Method 1: Direct Database Access (Recommended)
```bash
# Connect to production database
psql $PRODUCTION_DATABASE_URL

# Promote user to admin
UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

### Method 2: Database GUI (pgAdmin, TablePlus, etc.)
1. Connect to production database
2. Navigate to `User` table
3. Find user by email
4. Change `role` field to `ADMIN`

### Method 3: Prisma Studio (Development Only)
```bash
# ONLY for local development, NEVER expose in production
docker-compose --profile tools up studio
# Visit http://localhost:5555
# Edit User table → Change role to ADMIN
```

---

## 📊 Security Status

**Before Fixes**: 🔴 **CRITICAL** - Not production ready
**After Code Fixes**: 🟡 **PENDING** - Waiting for secret rotation
**After Manual Steps**: 🟢 **SECURE** - Production ready

---

## 🎯 Next Steps

1. **IMMEDIATE**: Complete manual steps above (secret rotation and git history cleaning)
2. **SHORT-TERM** (1 week): Implement Phase 2 fixes from `ADMIN_SECURITY_AUDIT.md`
   - Add rate limiting
   - Add audit logging
   - Improve input validation
3. **MEDIUM-TERM** (1 month): Implement Phase 3 fixes
   - CSRF protection
   - Error message improvements
   - Session timeout reduction

---

## 🆘 If You Need Help

- **Git history issues**: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
- **Secret rotation**: See `.env.example` for all required secrets
- **Admin promotion**: See "How to Promote Admins in Production" above

---

**Last Updated**: 2025-12-18
**Action Required**: Complete manual steps above before production deployment
