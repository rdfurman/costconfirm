# Database Schema Migration Plan - Complete Implementation

## Executive Summary

This plan outlines the complete migration from the old `BillingEntry` model to the new detailed cost tracking system with `ActualCost`, `ProjectedCost`, and `BuildPhase` models.

**Estimated Time**: 4-6 hours
**Risk Level**: Medium (breaking changes to core data models)
**Rollback Strategy**: Git revert or restore from backup

---

## Current State Analysis

### ✅ Completed
- [x] Updated Prisma schema with new models
- [x] Updated seed file with sample data
- [x] Updated documentation (CLAUDE.md, IMPLEMENTATION_PLAN.md)
- [x] Docker configuration ready

### ❌ Broken / Missing
- [ ] Server action files reference old `BillingEntry` model
- [ ] Pages reference old `project.billingEntries` relationship
- [ ] Components expect old data structure
- [ ] No action files for new models (actual-costs, projected-costs, build-phases)
- [ ] Forms need restructuring for new fields (count, unit, unitCost)

---

## Migration Steps

### Phase 1: Server Actions (Critical Path)

#### Step 1.1: Create ActualCost Actions
**File**: `lib/actions/actual-costs.ts`

**Tasks**:
- [ ] Create file with server action boilerplate
- [ ] Implement `createActualCost(projectId, data)` - calculate totalCost from count × unitCost
- [ ] Implement `getActualCostsByProject(projectId)` - fetch all costs for project
- [ ] Implement `updateActualCost(costId, data)` - recalculate totalCost on update
- [ ] Implement `deleteActualCost(costId)` - soft delete with authorization check
- [ ] Implement `getActualCostsByCategory(projectId, category)` - filter by category
- [ ] Add authorization checks (verify project belongs to user)
- [ ] Add revalidatePath calls for cache invalidation

**Key Logic**:
```typescript
// Always calculate totalCost on server side
const totalCost = Number(data.count) * Number(data.unitCost);
```

#### Step 1.2: Create ProjectedCost Actions
**File**: `lib/actions/projected-costs.ts`

**Tasks**:
- [ ] Create file with server action boilerplate
- [ ] Implement `createProjectedCost(projectId, data)` - calculate totalCost
- [ ] Implement `getProjectedCostsByProject(projectId)` - fetch all estimates
- [ ] Implement `updateProjectedCost(costId, data)` - recalculate totalCost
- [ ] Implement `deleteProjectedCost(costId)` - with authorization
- [ ] Implement `getCostVariance(projectId)` - compare projected vs actual by category
- [ ] Add authorization checks
- [ ] Add revalidatePath calls

**Special Function**:
```typescript
// Cost variance calculation
async function getCostVariance(projectId: string) {
  const projected = await getProjectedCostsByProject(projectId);
  const actual = await getActualCostsByProject(projectId);

  // Group by category and calculate variance
  // Return: { category, projectedTotal, actualTotal, variance, percentOver }
}
```

#### Step 1.3: Create BuildPhase Actions
**File**: `lib/actions/build-phases.ts`

**Tasks**:
- [ ] Create file with server action boilerplate
- [ ] Implement `createBuildPhase(projectId, data)`
- [ ] Implement `getBuildPhasesByProject(projectId)` - ordered by projectedStartDate
- [ ] Implement `updateBuildPhase(phaseId, data)`
- [ ] Implement `deleteBuildPhase(phaseId)`
- [ ] Implement `getProjectTimeline(projectId)` - summary of all phases
- [ ] Add authorization checks
- [ ] Add revalidatePath calls

#### Step 1.4: Update Project Actions
**File**: `lib/actions/projects.ts`

**Tasks**:
- [ ] Update `getProject()` to include new relations:
  ```typescript
  include: {
    actualCosts: { orderBy: { date: "desc" } },
    projectedCosts: { orderBy: { createdAt: "desc" } },
    buildPhases: { orderBy: { projectedStartDate: "asc" } }
  }
  ```
- [ ] Update `getProjects()` to include cost summaries
- [ ] Update `createProject()` to accept new fields (contractor, projectedCompletion)
- [ ] Update `updateProject()` to handle new fields

#### Step 1.5: Delete Old Billing Actions
**File**: `lib/actions/billing.ts`

**Tasks**:
- [ ] Delete entire file (no longer needed)
- [ ] Verify no other files import from this

---

### Phase 2: Update Pages (Critical Path)

#### Step 2.1: Update Project Detail Page
**File**: `app/(dashboard)/projects/[projectId]/page.tsx`

**Current Issues**:
- References `project.billingEntries` (doesn't exist)
- Uses old cost calculation

**Tasks**:
- [ ] Replace imports from `billing.ts` with `actual-costs.ts`
- [ ] Update cost calculation:
  ```typescript
  // OLD:
  const totalCost = project.billingEntries.reduce(...)

  // NEW:
  const totalActualCost = project.actualCosts.reduce(
    (sum, cost) => sum + Number(cost.totalCost), 0
  );
  const totalProjectedCost = project.projectedCosts.reduce(
    (sum, cost) => sum + Number(cost.totalCost), 0
  );
  ```
- [ ] Update UI to show 3 tabs: Actual Costs, Projected Costs, Phases
- [ ] Add cost variance display (projected vs actual)
- [ ] Update component imports (BillingEntryForm → ActualCostForm)

#### Step 2.2: Update Projects List Page
**File**: `app/(dashboard)/projects/page.tsx`

**Tasks**:
- [ ] Update to show contractor and completion date
- [ ] Add summary stats (if we want to show cost totals in cards)
- [ ] No major changes needed if we keep it simple

---

### Phase 3: Create New Components

#### Step 3.1: Create ActualCostForm Component
**File**: `components/costs/actual-cost-form.tsx`

**Tasks**:
- [ ] Create client component with form
- [ ] Fields: category (select), itemName, count, unit, unitCost, date, vendor, notes
- [ ] Auto-calculate and display totalCost (count × unitCost) in real-time
- [ ] Form validation (all required fields)
- [ ] Call `createActualCost` server action on submit
- [ ] Optimistic UI updates
- [ ] Error handling and toast notifications

**Key Feature**:
```typescript
// Real-time total calculation
const totalCost = (count || 0) * (unitCost || 0);
```

#### Step 3.2: Create ActualCostList Component
**File**: `components/costs/actual-cost-list.tsx`

**Tasks**:
- [ ] Create component to display actual costs in table/card format
- [ ] Columns: Date, Category, Item, Quantity, Unit Cost, Total, Vendor
- [ ] Sortable by date, category, total
- [ ] Filter by category
- [ ] Edit/Delete actions (inline or modal)
- [ ] Running total at bottom
- [ ] Empty state

#### Step 3.3: Create ProjectedCostForm Component
**File**: `components/costs/projected-cost-form.tsx`

**Tasks**:
- [ ] Similar to ActualCostForm but simpler (no date/vendor)
- [ ] Fields: category, itemName, count, unit, unitCost, notes
- [ ] Auto-calculate totalCost
- [ ] Call `createProjectedCost` server action

#### Step 3.4: Create ProjectedCostList Component
**File**: `components/costs/projected-cost-list.tsx`

**Tasks**:
- [ ] Similar to ActualCostList but for estimates
- [ ] Columns: Category, Item, Quantity, Unit Cost, Total
- [ ] Can compare with actual costs if on same page

#### Step 3.5: Create CostComparison Component
**File**: `components/costs/cost-comparison.tsx`

**Tasks**:
- [ ] Side-by-side comparison table
- [ ] Group by category (Materials, Labor, Miscellaneous)
- [ ] Show: Projected Total, Actual Total, Variance ($), Variance (%)
- [ ] Color coding: green (under budget), red (over budget)
- [ ] Overall project variance
- [ ] Optional: Simple bar chart visualization

#### Step 3.6: Create BuildPhaseTimeline Component
**File**: `components/phases/build-phase-timeline.tsx`

**Tasks**:
- [ ] Visual timeline showing phases
- [ ] Display projected vs actual dates
- [ ] Highlight current phase
- [ ] Show delays with delay reasons
- [ ] Progress indicator
- [ ] Can be simple list view or actual timeline graphic

#### Step 3.7: Create BuildPhaseForm Component
**File**: `components/phases/build-phase-form.tsx`

**Tasks**:
- [ ] Form for adding/editing phases
- [ ] Fields: name, description, projected dates, actual dates, delayReason
- [ ] Date pickers for all date fields
- [ ] Call `createBuildPhase` or `updateBuildPhase`

---

### Phase 4: Delete Old Components

#### Step 4.1: Remove Old Billing Components

**Files to Delete**:
- [ ] `components/billing/billing-entry-form.tsx`
- [ ] `components/billing/billing-entry-list.tsx`
- [ ] `components/billing/billing-entry-card.tsx` (if exists)
- [ ] `components/billing/` directory (if empty after deletion)

**Tasks**:
- [ ] Verify no other files import these components
- [ ] Delete files
- [ ] Update any remaining imports

---

### Phase 5: Database Migration

#### Step 5.1: Run Migrations

**Tasks**:
- [ ] Generate Prisma client: `npx prisma generate`
- [ ] Create migration: `npx prisma migrate dev --name detailed_cost_tracking`
- [ ] Review migration SQL (ensure it's correct)
- [ ] Run seed: `npm run db:seed`
- [ ] Verify data in Prisma Studio

**Docker Users**:
```bash
# Clean slate
docker-compose down -v

# Rebuild and start (migrations run automatically)
docker-compose up --build
```

---

### Phase 6: Update UI Components Directory Structure

#### Step 6.1: Reorganize Components

**Current**:
```
/components
  /billing/
    billing-entry-form.tsx
    billing-entry-list.tsx
  /projects/
  /ui/
```

**New**:
```
/components
  /costs/
    actual-cost-form.tsx
    actual-cost-list.tsx
    projected-cost-form.tsx
    projected-cost-list.tsx
    cost-comparison.tsx
  /phases/
    build-phase-timeline.tsx
    build-phase-form.tsx
    build-phase-card.tsx
  /projects/
    (existing files)
  /ui/
    (existing shadcn components)
```

---

## Testing Plan

### Unit Tests (Optional but Recommended)
- [ ] Test cost calculation logic (count × unitCost)
- [ ] Test variance calculation
- [ ] Test authorization checks in server actions

### Manual Testing Checklist

#### Project Management
- [ ] Create new project with contractor and projected completion
- [ ] View project list
- [ ] Navigate to project detail page

#### Projected Costs
- [ ] Add projected cost entry
- [ ] Verify totalCost auto-calculates correctly
- [ ] Edit projected cost
- [ ] Delete projected cost
- [ ] View projected cost list

#### Actual Costs
- [ ] Add actual cost entry
- [ ] Verify totalCost auto-calculates correctly
- [ ] Add multiple costs in different categories
- [ ] Edit actual cost
- [ ] Delete actual cost
- [ ] Filter by category
- [ ] Sort by date/cost

#### Build Phases
- [ ] Add build phase with projected dates
- [ ] Update phase with actual dates
- [ ] Add delay reason
- [ ] View timeline
- [ ] Delete phase

#### Cost Comparison
- [ ] View projected vs actual comparison
- [ ] Verify variance calculations
- [ ] Check color coding (over/under budget)
- [ ] Verify category grouping

#### Edge Cases
- [ ] Try to access another user's project costs (should fail)
- [ ] Create cost with 0 quantity (should calculate 0 total)
- [ ] Create cost with decimal quantities
- [ ] Very large cost values
- [ ] Delete project (should cascade delete costs and phases)

---

## Rollback Strategy

### If Migration Fails

**Option 1: Git Revert**
```bash
git revert HEAD~[number of commits]
git push
```

**Option 2: Database Rollback**
```bash
# Rollback last migration
npx prisma migrate resolve --rolled-back [migration_name]

# Or reset database
docker-compose down -v
# Restore from backup
```

**Option 3: Keep New Schema, Add Compatibility Layer**
- Add `BillingEntry` model back temporarily
- Create migration script to convert old data
- Run both systems in parallel

---

## File Checklist

### Files to CREATE
- [ ] `lib/actions/actual-costs.ts`
- [ ] `lib/actions/projected-costs.ts`
- [ ] `lib/actions/build-phases.ts`
- [ ] `components/costs/actual-cost-form.tsx`
- [ ] `components/costs/actual-cost-list.tsx`
- [ ] `components/costs/projected-cost-form.tsx`
- [ ] `components/costs/projected-cost-list.tsx`
- [ ] `components/costs/cost-comparison.tsx`
- [ ] `components/phases/build-phase-timeline.tsx`
- [ ] `components/phases/build-phase-form.tsx`
- [ ] `components/phases/build-phase-card.tsx` (optional)

### Files to UPDATE
- [ ] `lib/actions/projects.ts`
- [ ] `app/(dashboard)/projects/[projectId]/page.tsx`
- [ ] `app/(dashboard)/projects/page.tsx` (minor updates)

### Files to DELETE
- [ ] `lib/actions/billing.ts`
- [ ] `components/billing/billing-entry-form.tsx`
- [ ] `components/billing/billing-entry-list.tsx`
- [ ] `components/billing/` directory (if empty)

---

## Success Criteria

The migration is complete when:

1. ✅ Application compiles without TypeScript errors
2. ✅ Docker container starts successfully
3. ✅ Can create projects with contractor and dates
4. ✅ Can add projected costs with quantity/unit/unitCost
5. ✅ Can add actual costs with all required fields
6. ✅ Can add build phases with timeline
7. ✅ Cost comparison shows variance correctly
8. ✅ All CRUD operations work (Create, Read, Update, Delete)
9. ✅ Authorization checks work (can't access other users' data)
10. ✅ No console errors in browser
11. ✅ Database migrations are clean and reversible

---

## Post-Migration Tasks

After successful migration:

- [ ] Update README.md with new features
- [ ] Add screenshots of new UI to documentation
- [ ] Create user guide for cost entry
- [ ] Plan admin features (industry baseline data)
- [ ] Consider adding data export functionality
- [ ] Set up monitoring/logging for new endpoints

---

## Questions / Decisions Needed

1. **UI Framework**: Continue with current shadcn/ui components or add chart library?
2. **Cost Comparison**: Simple table or add visualizations (charts/graphs)?
3. **Phase Timeline**: Simple list or visual timeline graphic?
4. **Mobile Responsive**: Priority level for mobile layouts?
5. **Pagination**: Add pagination for large cost lists?
6. **Search**: Add search functionality for costs?
7. **Export**: Add CSV/PDF export for cost data?

---

## Estimated Time Breakdown

| Phase | Task | Estimated Time |
|-------|------|----------------|
| 1 | Create Server Actions (3 files) | 2 hours |
| 1 | Update Projects Actions | 30 minutes |
| 2 | Update Pages | 1 hour |
| 3 | Create Cost Components (5 components) | 2-3 hours |
| 3 | Create Phase Components (2 components) | 1 hour |
| 4 | Delete Old Components | 15 minutes |
| 5 | Run Migrations & Test | 30 minutes |
| 6 | Manual Testing | 1 hour |
| **TOTAL** | | **8-10 hours** |

*Note: Adjusted estimate higher for comprehensive testing and polish*

---

## Ready to Proceed?

Once you approve this plan, I can:

1. **Execute the entire migration** - Create all files, update existing ones, and test
2. **Execute in phases** - Do one phase at a time with your review
3. **Make adjustments** - Modify the plan based on your feedback

What would you like to do?
