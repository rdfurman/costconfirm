# Billpay Implementation Plan - Client User Experience

## Overview
This document outlines the implementation plan for the client-facing features of the Billpay application, including authentication, project management, and billing data entry.

## Technology Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: Auth.js (NextAuth)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui

## Database Schema

### User Table
```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String?
  role      Role      @default(CLIENT)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  projects  Project[]

  // Auth.js required fields
  accounts  Account[]
  sessions  Session[]
}

enum Role {
  CLIENT
  ADMIN
}
```

### Project Table
```prisma
model Project {
  id                   String          @id @default(cuid())
  name                 String
  description          String?
  address              String?
  contractor           String?         // Name of contractor/builder
  projectedCompletion  DateTime?       // Estimated completion date
  actualCompletion     DateTime?       // Actual completion date
  userId               String
  user                 User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt            DateTime        @default(now())
  updatedAt            DateTime        @updatedAt

  // Relations
  actualCosts          ActualCost[]
  projectedCosts       ProjectedCost[]
  buildPhases          BuildPhase[]
}
```

### Cost Category Enum
```prisma
enum CostCategory {
  MATERIALS
  LABOR
  MISCELLANEOUS
}
```

### ActualCost Table (replaces BillingEntry)
```prisma
model ActualCost {
  id          String        @id @default(cuid())
  category    CostCategory
  itemName    String        // e.g., "2x4 lumber", "Framing labor", "Permit fees"
  count       Decimal       @db.Decimal(10, 3)  // Quantity (e.g., 100 pieces, 40 hours)
  unit        String        // e.g., "pieces", "hours", "sq ft"
  unitCost    Decimal       @db.Decimal(10, 2)  // Cost per unit
  totalCost   Decimal       @db.Decimal(10, 2)  // Calculated: count × unitCost
  date        DateTime      // Date of expense
  vendor      String?       // Supplier/subcontractor name
  notes       String?       // Additional details
  projectId   String
  project     Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}
```

### ProjectedCost Table
```prisma
model ProjectedCost {
  id          String        @id @default(cuid())
  category    CostCategory
  itemName    String        // e.g., "2x4 lumber", "Framing labor"
  count       Decimal       @db.Decimal(10, 3)  // Estimated quantity
  unit        String        // e.g., "pieces", "hours", "sq ft"
  unitCost    Decimal       @db.Decimal(10, 2)  // Estimated cost per unit
  totalCost   Decimal       @db.Decimal(10, 2)  // Calculated: count × unitCost
  notes       String?       // Estimation notes
  projectId   String
  project     Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}
```

### BuildPhase Table
```prisma
model BuildPhase {
  id                      String    @id @default(cuid())
  name                    String    // e.g., "Foundation", "Framing", "Electrical"
  description             String?   // Details about this phase
  projectedStartDate      DateTime? // When phase should start
  projectedCompletionDate DateTime? // When phase should complete
  actualStartDate         DateTime? // When phase actually started
  actualCompletionDate    DateTime? // When phase actually completed
  delayReason             String?   // Notes on why delayed
  projectId               String
  project                 Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
}
```

## Application Structure

```
/app
  /api
    /auth/[...nextauth]/route.ts        # Auth.js API routes
  /(dashboard)
    /projects/page.tsx                  # Project selection/creation
    /projects/[projectId]/page.tsx      # Billing dashboard
  /layout.tsx
  /page.tsx                             # Landing/redirect page

/components
  /ui                                   # shadcn/ui components
  /projects
    /project-selector.tsx
    /create-project-dialog.tsx
    /project-header.tsx
  /costs
    /actual-cost-form.tsx
    /actual-cost-list.tsx
    /projected-cost-form.tsx
    /projected-cost-list.tsx
    /cost-comparison.tsx
  /phases
    /build-phase-timeline.tsx
    /phase-form.tsx
    /phase-card.tsx

/lib
  /db.ts                                # Prisma client
  /actions
    /projects.ts                        # Project CRUD actions
    /actual-costs.ts                    # Actual cost CRUD actions
    /projected-costs.ts                 # Projected cost CRUD actions
    /build-phases.ts                    # Build phase CRUD actions

/prisma
  /schema.prisma
  /migrations
  /seed.ts
```

## User Flow

### 1. Authentication
- User visits app → Redirected to Auth.js sign-in page
- After sign-in → User automatically created/synced in database via Prisma adapter
- User role stored in database User model

### 2. Project Selection
- User lands on `/projects` page
- Shows list of user's existing projects
- "Create New Project" button opens dialog
- Selecting a project → Navigates to `/projects/[projectId]`

### 3. Project Dashboard
- **Project Header**: Name, contractor, address, projected vs actual completion
- **Summary Stats**:
  - Total projected costs
  - Total actual costs
  - Cost variance (projected vs actual)
  - Number of phases, completion percentage
- **Build Phase Timeline**: Visual timeline showing phases with projected/actual dates
- **Cost Tracking Tabs**:
  - **Actual Costs**: List of actual expenses with entry form
  - **Projected Costs**: List of estimates with entry form
  - **Comparison View**: Side-by-side comparison of projected vs actual

### 4. Cost Entry Forms

**Actual Cost Form:**
- Category (dropdown: Materials, Labor, Miscellaneous)
- Item Name (e.g., "2x4 lumber", "Framing labor")
- Quantity/Count (number input)
- Unit (e.g., "pieces", "hours", "sq ft")
- Unit Cost (number input with $ prefix)
- Total Cost (auto-calculated: count × unitCost)
- Date (date picker)
- Vendor (optional text input)
- Notes (optional textarea)

**Projected Cost Form:** (similar structure but no date/vendor)
- Category (dropdown: Materials, Labor, Miscellaneous)
- Item Name
- Estimated Quantity
- Unit
- Estimated Unit Cost
- Total Cost (auto-calculated)
- Notes

**Build Phase Form:**
- Phase Name (e.g., "Foundation", "Framing")
- Description
- Projected Start Date
- Projected Completion Date
- Actual Start Date (optional)
- Actual Completion Date (optional)
- Delay Reason (optional notes)

## Implementation Phases

### Phase 1: Project Initialization
1. Create Next.js app with TypeScript
2. Install dependencies (Tailwind, Auth.js, Prisma, shadcn/ui)
3. Configure all tools

### Phase 2: Database Setup
1. Create Prisma schema with Auth.js models
2. Configure PostgreSQL connection
3. Run migrations
4. Create seed data

### Phase 3: Authentication
1. Setup Auth.js configuration file
2. Configure Prisma adapter
3. Setup authentication middleware
4. Configure role-based access

### Phase 4: Core Features
1. Build project selection page with create dialog
2. Build billing dashboard layout
3. Build billing entry form with validation
4. Implement Server Actions for data operations

### Phase 5: Polish
1. Add loading states
2. Add error handling
3. Add form validation
4. Test user flows

## Key Components

### ProjectSelector Component
- Displays grid/list of user projects
- Click to navigate to project detail
- Shows project name, address, contractor, completion status

### CreateProjectDialog Component
- Modal form for creating new project
- Fields: name, description, address, contractor, projected completion
- Server Action submission

### ProjectHeader Component
- Displays project overview
- Shows contractor, address, projected vs actual completion
- Edit project details button

### ActualCostForm Component
- Form for entering actual expenses
- Auto-calculates total cost from count × unitCost
- Validates all required fields

### ActualCostList Component
- Table or card list of actual costs
- Sortable by date/category/cost
- Filter by category
- Edit/delete actions
- Shows running total

### ProjectedCostForm Component
- Form for entering cost estimates
- Similar to ActualCostForm but without date/vendor

### CostComparison Component
- Side-by-side comparison of projected vs actual costs
- Shows variance (over/under budget)
- Category breakdown
- Visual charts/graphs

### BuildPhaseTimeline Component
- Visual timeline of build phases
- Shows projected vs actual dates
- Highlights delays with reasons
- Progress indicators

## Server Actions

### Project Actions
```typescript
// lib/actions/projects.ts
async function createProject(userId: string, data: ProjectInput)
async function getProjectsByUser(userId: string)
async function getProjectById(projectId: string)
async function updateProject(projectId: string, data: ProjectInput)
async function deleteProject(projectId: string)

interface ProjectInput {
  name: string
  description?: string
  address?: string
  contractor?: string
  projectedCompletion?: Date
  actualCompletion?: Date
}
```

### Actual Cost Actions
```typescript
// lib/actions/actual-costs.ts
async function createActualCost(projectId: string, data: ActualCostInput)
async function getActualCostsByProject(projectId: string)
async function updateActualCost(costId: string, data: ActualCostInput)
async function deleteActualCost(costId: string)
async function getActualCostsByCategory(projectId: string, category: CostCategory)

interface ActualCostInput {
  category: 'MATERIALS' | 'LABOR' | 'MISCELLANEOUS'
  itemName: string
  count: number
  unit: string
  unitCost: number
  date: Date
  vendor?: string
  notes?: string
}
```

### Projected Cost Actions
```typescript
// lib/actions/projected-costs.ts
async function createProjectedCost(projectId: string, data: ProjectedCostInput)
async function getProjectedCostsByProject(projectId: string)
async function updateProjectedCost(costId: string, data: ProjectedCostInput)
async function deleteProjectedCost(costId: string)
async function getCostVariance(projectId: string) // Compare projected vs actual

interface ProjectedCostInput {
  category: 'MATERIALS' | 'LABOR' | 'MISCELLANEOUS'
  itemName: string
  count: number
  unit: string
  unitCost: number
  notes?: string
}
```

### Build Phase Actions
```typescript
// lib/actions/build-phases.ts
async function createBuildPhase(projectId: string, data: BuildPhaseInput)
async function getBuildPhasesByProject(projectId: string)
async function updateBuildPhase(phaseId: string, data: BuildPhaseInput)
async function deleteBuildPhase(phaseId: string)

interface BuildPhaseInput {
  name: string
  description?: string
  projectedStartDate?: Date
  projectedCompletionDate?: Date
  actualStartDate?: Date
  actualCompletionDate?: Date
  delayReason?: string
}
```

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Auth.js
NEXTAUTH_SECRET="generate_a_random_secret"
NEXTAUTH_URL="http://localhost:3000"
```

## Next Steps After Implementation

1. Add admin dashboard for viewing all client data
2. Implement data export functionality
3. Add industry baseline data entry (admin feature)
4. Build comparison/analytics views
5. Add email notifications
6. Implement file upload for receipts/invoices
