# CostConfirm - Home Builder Billing Analysis

A full-stack web application for tracking and analyzing home builder billing against industry standards.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: Auth.js (NextAuth)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Language**: TypeScript
- **Containerization**: Docker & Docker Compose

## Getting Started

### Option 1: Docker (Recommended)

The easiest way to run this project locally is using Docker.

#### Prerequisites
- Docker and Docker Compose installed
- That's it! No need for Node.js or PostgreSQL

#### Quick Start

```bash
# Clone the repository
git clone <your-repo-url>
cd costconfirm

# Start all services (app + database)
docker-compose up

# Or run in background
docker-compose up -d

# View logs
docker-compose logs -f app
```

The application will be available at:
- **App**: http://localhost:3000
- **Database**: localhost:5433 (PostgreSQL, if you need direct access)

#### First Time Setup

After starting the containers for the first time, you need to set up the database:

```bash
# Run database migrations
DATABASE_URL="postgresql://costconfirm:costconfirm_dev_password@localhost:5433/costconfirm" npx prisma migrate deploy

# Seed database with sample data
DATABASE_URL="postgresql://costconfirm:costconfirm_dev_password@localhost:5433/costconfirm" npm run db:seed
```

**Test Login Credentials:**
- Email: `test@example.com`
- Password: `password123`

**Sample Data Included:**
- Test user account (Client role)
- Project: "Main Street Residence"
- 3 build phases (Foundation, Framing, Electrical)
- 3 projected costs
- 5 actual costs

#### Database Management

To access Prisma Studio (database GUI):
```bash
docker-compose --profile tools up
```

Visit http://localhost:5555

#### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove all data (fresh start)
docker-compose down -v
```

## Database Schema

### User
- Managed by Auth.js via Prisma adapter
- Stores role (CLIENT or ADMIN)
- Links to multiple projects
- Includes Auth.js session management tables (Account, Session, VerificationToken)

### Project
- Represents a home building project
- Contains: name, address, contractor info, description
- Timeline: projected/actual completion dates
- Links to: ProjectedCosts, ActualCosts, BuildPhases

### ProjectedCost
- Initial cost estimates from contractor
- Fields: category (MATERIALS, LABOR, MISCELLANEOUS), itemName, count, unit, unitCost, totalCost, notes
- Linked to a specific project

### ActualCost
- Real expenses incurred during construction
- Fields: category, itemName, count, unit, unitCost, totalCost, date, vendor, notes
- Linked to a specific project
- Used for variance analysis against ProjectedCosts

### BuildPhase
- Construction phase tracking (Foundation, Framing, Electrical, etc.)
- Timeline: projectedStartDate, projectedCompletionDate, actualStartDate, actualCompletionDate
- Fields: name, description, delayReason
- Linked to a specific project

## Features

### Client Users
- Create and manage home building projects
- Enter projected costs from contractor estimates (detailed quantity/unit cost breakdown)
- Track actual costs as they're billed (with date, vendor, and detailed breakdowns)
- Monitor build phases and timeline (projected vs actual dates)
- Compare projected vs actual costs to identify overages
- See which phases are delayed and why
- Variance analysis between budgeted and actual expenses

### Future Features (Admin)
- View all client projects and billing data
- Enter industry baseline data from multiple sources:
  - Build supply wholesaler pricing
  - Labor rates from tradesmen job postings
  - Historical project data
- Analyze variance between client costs and industry standards
- Identify unusual pricing patterns or potential overcharges
- Generate reports showing cost comparisons by category, item, and region

## Available Scripts

### Docker Commands
- `docker-compose up` - Start all services
- `docker-compose up -d` - Start in background
- `docker-compose down` - Stop all services
- `docker-compose down -v` - Stop and remove all data
- `docker-compose up --build` - Rebuild and start
- `docker-compose logs -f app` - View app logs
- `docker-compose --profile tools up` - Start with Prisma Studio

### NPM Scripts (Local Development)
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Push Prisma schema to database
- `npm run db:seed` - Seed database with sample data

## Project Structure

```
/app
  /(dashboard)              # Protected dashboard routes
  /api/auth/[...nextauth]   # Auth.js API routes (to be implemented)

/components
  /ui                       # shadcn/ui components
  /projects                 # Project-related components
  /costs                    # Cost tracking components
  /phases                   # Build phase components

/lib
  /actions                  # Server Actions for CRUD operations
  db.ts                     # Prisma client singleton
  utils.ts                  # Utility functions

/prisma
  schema.prisma             # Database schema
  seed.ts                   # Seed script

/docs
  CLAUDE.md                 # Project conventions and guidelines
  IMPLEMENTATION_PLAN.md    # Detailed implementation plan
  MIGRATION_PLAN.md         # Database migration plan

/docker
  Dockerfile                # Container definition
  docker-compose.yml        # Multi-container orchestration
  .dockerignore            # Docker build exclusions
```

## Documentation

- **[CLAUDE.md](docs/CLAUDE.md)** - Project overview, conventions, and development guidelines
- **[IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)** - Detailed implementation plan with data models and components
- **[MIGRATION_PLAN.md](docs/MIGRATION_PLAN.md)** - Step-by-step plan for migrating to new cost tracking system

## Next Steps

1. ✅ Set up Docker containers for local development
2. ✅ Implement Auth.js authentication
3. Build admin dashboard for viewing all client data
4. Implement industry baseline data entry features
5. Create comparison/analytics views
6. Deploy to production (Vercel, Railway, or self-hosted)

## License

Private - All Rights Reserved
