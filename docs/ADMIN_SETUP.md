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

## Docker Environment

### Local Development

When using Docker for local development:

```bash
# Option 1: Run from inside the container
docker-compose exec app npm run make-admin your.email@example.com

# Option 2: Run from host machine (database is exposed on port 5433)
# Make sure your .env.local has: DATABASE_URL="postgresql://user:pass@localhost:5433/costconfirm"
npm run make-admin your.email@example.com
```

### Production

The scripts directory is included in the production Docker image. To promote a user in production:

```bash
# SSH into your production server, then:
docker exec costconfirm-app npm run make-admin user@example.com

# Or if using docker-compose in production:
docker-compose exec app npm run make-admin user@example.com

# Or enter the container shell first:
docker exec -it costconfirm-app sh
npm run make-admin user@example.com
```

**Security Note**: The scripts are only accessible via shell access to the container, which requires:
- SSH access to the production server
- Docker execution permissions
- The script cannot be called via HTTP/API

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
