## Project Overview

CostConfirm is a full-stack web application for managing billing of home builders and contractors. The idea is to track all expenses, compare pricing with industry standards, and provide clients with a report that will outline discrepencies in costs from normal baselines.

## Core Data Models

### Projects (Home Builds)
Each project represents a home construction project with:
- Basic info: Name, address, contractor
- Timeline: Projected vs actual completion dates
- Cost tracking: Both projected estimates and actual costs
- Build phases: Track progress through construction stages

### Cost Tracking (Detailed Breakdown)
Instead of simple billing entries, we track costs with granular detail:
- **Cost Category**: Materials, Labor, or Miscellaneous
- **Item Name**: Specific item (e.g., "2x4 lumber", "Framing labor")
- **Quantity & Unit**: Count and unit of measurement (e.g., 100 pieces, 40 hours)
- **Unit Cost**: Cost per unit
- **Total Cost**: Auto-calculated (quantity × unit cost)
- **Date, Vendor, Notes**: Additional tracking info

### Projected vs Actual Costs
- **Projected Costs**: Initial estimates from contractor
- **Actual Costs**: Real expenses as they occur
- **Variance Analysis**: Compare projected vs actual to identify overages

### Build Phases & Timeline
Track construction phases with:
- Phase name (Foundation, Framing, Electrical, etc.)
- Projected start and completion dates
- Actual start and completion dates
- Delay reasons and notes

User roles:
1. Client
1. Admin

### Client
This is the end user that has contracted a builder to build a home for them. The client can:
- Create and manage home building projects
- Enter projected costs from contractor estimates
- Track actual costs as they're billed (with detailed quantity/unit cost breakdown)
- Monitor build phases and timeline
- Compare projected vs actual costs to identify overages
- See which phases are delayed and why

### Admin
This will be us. We will have access to the clients entered billing data so that we can compare that to industry standards. Admins will:
- View all client projects and billing data
- Enter industry baseline data from multiple sources:
  - Build supply wholesaler pricing
  - Labor rates from tradesmen job postings
  - Historical project data
- Analyze variance between client costs and industry standards
- Identify unusual pricing patterns or potential overcharges
- Generate reports showing cost comparisons by category, item, and region

## Tech Stack

- **Framework**: Next.js (full-stack)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Language**: TypeScript
- **Authentication**: Auth.js (NextAuth)

## Development Commands

### Docker (Recommended for Local Development)
```bash
# Start all services (app + database)
docker-compose up

# Start in detached mode (background)
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v

# Rebuild containers after code changes
docker-compose up --build

# View logs
docker-compose logs -f app

# Start with Prisma Studio (database GUI)
docker-compose --profile tools up

# Access Prisma Studio
# Visit http://localhost:5555 in your browser

# Execute commands in running container
docker-compose exec app npx prisma migrate dev
docker-compose exec app npm run db:seed
```

### Local Development (Without Docker)
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Database Commands
```bash
# Run database migrations
npx prisma migrate dev

# Open Prisma Studio (database GUI)
npx prisma studio

# Generate Prisma Client after schema changes
npx prisma generate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Seed database with sample data
npm run db:seed
```

### Authentication Setup
```bash
# Install Auth.js
npm install next-auth@beta @auth/prisma-adapter

# Add to .env.local:
# NEXTAUTH_SECRET=generated_secret_here
# NEXTAUTH_URL=http://localhost:3000
```

## Architecture

### Full-Stack Next.js
- Uses Next.js as both frontend and backend framework
- API routes or Server Actions handle backend logic
- Server Components for optimal performance

### Authentication
- **Auth.js (NextAuth)** handles user authentication and session management
- **Role-based access control**: Two main roles
  - `client`: Can enter and view their own billing data
  - `admin`: Can view all client data and export reports
- Auth.js provides customizable authentication pages and flows
- Protected routes enforce authentication and role requirements
- Sessions stored in database via Prisma adapter

### Database Layer
- **PostgreSQL** provides ACID-compliant storage for financial data
- **Prisma** serves as the type-safe ORM layer
- Database schema defined in `prisma/schema.prisma`

### Data Flow
```
Client → Auth.js (Auth) → Next.js (API Routes/Server Actions) → Prisma Client → PostgreSQL
```

### Docker Architecture
The application is containerized for easy local development:
- **app container**: Runs the Next.js application on port 3000
- **db container**: PostgreSQL database on port 5432
- **studio container** (optional): Prisma Studio for database management on port 5555
- All containers communicate via Docker network
- Database data persists in a Docker volume
- On startup, the app automatically runs migrations and seeds the database

## Important Conventions

### Documentation
- All documentation markdown files (*.md) must be placed in the `docs/` folder
- Examples: security audits, implementation plans, phase completion summaries
- Exception: Root-level files like README.md and CLAUDE.md
- Use descriptive filenames: `PHASE1_COMPLETE.md`, `SECURITY_AUDIT.md`, etc.

### Authentication & Authorization
- Always verify user roles before granting access to protected features
- Use Auth.js's `auth()` helper in Server Components and API routes
- Client role: Users can only access their own billing records
- Admin role: Full access to all client data and export functionality
- Store user role in database User model

### Database
- Prisma schema is the single source of truth for database structure
- Always run `prisma migrate dev` after schema changes
- Use Prisma's type-safe client for all database operations

### Type Safety
- Leverage Prisma-generated types throughout the application
- Ensure TypeScript strict mode is enabled

### Cost Calculations
- **Total Cost** fields should always be calculated from `count × unitCost`
- When creating/updating costs, recalculate total cost on the server side
- Never allow manual entry of total cost (it should be read-only/calculated)
- Use Decimal types for financial calculations to avoid floating point errors

### Data Models Overview

**Project**: Represents a home construction project
- Links to User (owner)
- Has contractor information
- Tracks projected vs actual completion
- Contains multiple ActualCosts, ProjectedCosts, and BuildPhases

**ActualCost**: Real expenses incurred during construction
- Belongs to a Project
- Has category (MATERIALS, LABOR, MISCELLANEOUS)
- Tracks: itemName, count, unit, unitCost, totalCost
- Includes: date, vendor, notes

**ProjectedCost**: Initial cost estimates from contractor
- Belongs to a Project
- Same structure as ActualCost but without date/vendor
- Used for budget comparison

**BuildPhase**: Construction phase/stage tracking
- Belongs to a Project
- Tracks: name, description
- Timeline: projectedStartDate, projectedCompletionDate, actualStartDate, actualCompletionDate
- Can note delay reasons
