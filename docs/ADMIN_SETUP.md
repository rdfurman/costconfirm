# Admin Account Setup and Management

This document explains how to securely manage admin accounts in CostConfirm.

## Making an Account Admin

To promote a user account to admin role, use the `make-admin` script. This script:
- Only runs locally with direct database access
- Requires the user's email address
- Verifies the user exists before promoting
- Logs all promotions for audit trail

### Usage

```bash
npm run make-admin <email>
```

### Examples

Promote your own account:
```bash
npm run make-admin your.email@example.com
```

Promote another user:
```bash
npm run make-admin user@example.com
```

### Security Features

- **Local execution only**: Script requires direct database access, preventing remote exploitation
- **Email validation**: Validates email format before attempting promotion
- **User verification**: Checks that user exists and is not deleted
- **Audit logging**: Records all promotions in SecurityLog table
- **Idempotent**: Safe to run multiple times (won't error if already admin)

### What Gets Logged

Each admin promotion creates a SecurityLog entry with:
- Event type: `admin_promotion`
- User ID and email
- Previous role (CLIENT)
- New role (ADMIN)
- Timestamp of promotion

## Admin Features

Once promoted to admin, users gain access to:

### User Management
- View all users in the system (`/admin/users`)
- See user statistics (total, clients, admins, verified)
- View user project counts
- See email verification status

### Enhanced Project Access
- View all client projects (not just their own)
- Access any project detail page
- See which user owns each project

### Future Admin Features (Planned)
- Industry baseline data entry
- Cost comparison reports
- Analytics dashboard
- User management (role changes, deactivation)
- System settings

## Admin Navigation

Admin users see additional navigation links in the dashboard header:
- **Projects**: Standard project list (shows all projects for admins)
- **Users**: User management page (admin only)

## Making Yourself Admin

### Local Development

For local development, you can use the make-admin script:

```bash
# Option 1: Run from inside the container (recommended)
docker-compose exec app sh -c "cd /app && npm install tsx && npx tsx scripts/make-admin.ts your.email@example.com"

# Option 2: Run from host machine (database is exposed on port 5433)
# First, ensure your local DATABASE_URL points to port 5433:
# DATABASE_URL="postgresql://costconfirm:password@localhost:5433/costconfirm"
npm run make-admin your.email@example.com

# Option 3: Use Prisma Studio
docker-compose --profile tools up studio
# Visit http://localhost:5555
# Navigate to User table → Find your user → Change role to ADMIN
```

### Production (Secure Methods)

**IMPORTANT**: The scripts directory is intentionally **NOT included** in the production Docker image for security reasons. Use one of these secure methods instead:

#### Method 1: Direct Database Access (Recommended - Most Secure)

**Option A: From Inside the Database Container** (Easiest)

```bash
# Enter the database container shell
docker exec -it costconfirm-db-prod sh

# Connect to PostgreSQL (credentials from .env)
psql -U costconfirm -d costconfirm

# You'll see the PostgreSQL prompt: costconfirm=#

# Promote user to admin
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your@email.com';

# Verify the change
SELECT id, email, role FROM "User" WHERE email = 'your@email.com';

# Exit psql
\q

# Exit container
exit
```

**One-liner from host** (no need to enter container):
```bash
# Promote to admin
docker exec -it costconfirm-db-prod psql -U costconfirm -d costconfirm -c "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'your@email.com';"

# Verify
docker exec -it costconfirm-db-prod psql -U costconfirm -d costconfirm -c "SELECT email, role FROM \"User\" WHERE email = 'your@email.com';"
```

**Option B: Using psql Client from Host**

If you have `psql` installed on your machine:

```bash
# Connect to your production database
psql "$PRODUCTION_DATABASE_URL"

# Promote user to admin
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your@email.com';

# Verify the change
SELECT id, email, role FROM "User" WHERE email = 'your@email.com';

# Exit
\q
```

**One-liner**:
```bash
psql "$DATABASE_URL" -c "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'your@email.com';"
```

#### Method 2: Database GUI Tool (Easiest for Non-Technical Users)

Use any PostgreSQL GUI client:

**Popular Options**:
- [TablePlus](https://tableplus.com/) (Mac/Windows/Linux)
- [pgAdmin](https://www.pgadmin.org/) (Free, Cross-platform)
- [DBeaver](https://dbeaver.io/) (Free, Cross-platform)
- [Postico](https://eggerapps.at/postico/) (Mac only)

**Steps**:
1. Connect to your production database using the connection string
2. Navigate to the `User` table
3. Find the user by email address
4. Edit the `role` column and change it to `ADMIN`
5. Save the changes

#### Method 3: One-Time Admin CLI Container (Advanced)

If you need to run admin scripts regularly in production, create a separate admin CLI service:

**Create**: `docker-compose.prod.yml` (ONLY for production admin tasks)

```yaml
version: '3.8'

services:
  admin-cli:
    build:
      context: .
      target: builder  # Use builder stage which has all dependencies
    working_dir: /app
    environment:
      DATABASE_URL: ${DATABASE_URL}
    volumes:
      - ./scripts:/app/scripts
      - ./prisma:/app/prisma
    profiles:
      - admin  # Only starts with --profile admin
    command: sh -c "npx tsx scripts/make-admin.ts ${ADMIN_EMAIL}"
```

**Usage**:
```bash
# On production server
ADMIN_EMAIL=user@example.com docker-compose -f docker-compose.prod.yml --profile admin run --rm admin-cli
```

#### Method 4: Prisma Migration (First Admin Only)

For the very first admin during initial deployment, create a migration:

**Create**: `prisma/migrations/YYYYMMDDHHMMSS_initial_admin/migration.sql`

```sql
-- Promote initial admin (replace with your email)
UPDATE "User"
SET role = 'ADMIN'
WHERE email = 'your@email.com';
```

Then deploy:
```bash
npx prisma migrate deploy
```

**WARNING**: This only works if the user already exists in the database.

### Production Deployment Recommendations

**Best Practice for Production**:

1. **First Admin**: Use Method 4 (Prisma Migration) or Method 1 (Direct SQL) during initial setup
2. **Subsequent Admins**: Use Method 1 (Direct SQL) - it's the most secure and auditable
3. **Never** include admin promotion scripts in production Docker images
4. **Always** require production database access for admin promotion (proper separation of concerns)

**Security Benefits**:
- Admin promotion requires production database credentials (not just container access)
- Cannot be exploited via container compromise or RCE vulnerabilities
- Clear audit trail (database logs + manual SecurityLog entries)
- Follows principle of least privilege

## Best Practices

1. **Minimize admin accounts**: Only promote trusted users who need admin access
2. **Use separate accounts**: Consider using a dedicated admin email separate from your client account
3. **Audit regularly**: Review SecurityLog entries for admin_promotion events
4. **Document promotions**: Keep internal records of why accounts were promoted

## Troubleshooting

### "User not found"
- Verify the email address is correct
- Check that the user has registered an account
- Ensure the account hasn't been soft-deleted

### "User account is deleted"
- The account was previously deleted
- Contact a developer to restore the account before promoting

### "Already an ADMIN"
- The account is already promoted
- No action needed

## Security Considerations

- The script can only be run by someone with:
  - Access to the server/container filesystem
  - Database connection credentials
  - Shell access to run npm commands
- There is no UI or API to promote users (by design)
- All promotions are logged for audit purposes
- In production, restrict server access to authorized personnel only
