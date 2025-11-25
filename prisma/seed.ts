import { PrismaClient, Prisma } from "../app/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Create a test user (this would normally be created via Auth.js)
  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      name: "Test User",
      role: "CLIENT",
    },
  });

  console.log("Created user:", user.email);

  // Create a sample project
  const project = await prisma.project.upsert({
    where: { id: "sample_project_1" },
    update: {},
    create: {
      id: "sample_project_1",
      name: "Main Street Residence",
      address: "123 Main St, Springfield, IL",
      description: "New construction 2,400 sq ft home with modern amenities",
      contractor: "ABC Custom Homes",
      projectedCompletion: new Date("2024-08-15"),
      userId: user.id,
    },
  });

  console.log("Created project:", project.name);

  // Create build phases
  const phases = [
    {
      name: "Foundation",
      description: "Site prep and foundation pour",
      projectedStartDate: new Date("2024-01-05"),
      projectedCompletionDate: new Date("2024-01-25"),
      actualStartDate: new Date("2024-01-05"),
      actualCompletionDate: new Date("2024-01-28"),
      delayReason: "Weather delay - heavy rain for 3 days",
      projectId: project.id,
    },
    {
      name: "Framing",
      description: "Wall and roof framing",
      projectedStartDate: new Date("2024-01-26"),
      projectedCompletionDate: new Date("2024-02-15"),
      actualStartDate: new Date("2024-01-29"),
      projectId: project.id,
    },
    {
      name: "Electrical & Plumbing",
      description: "Rough-in for electrical and plumbing",
      projectedStartDate: new Date("2024-02-16"),
      projectedCompletionDate: new Date("2024-03-10"),
      projectId: project.id,
    },
  ];

  for (const phase of phases) {
    await prisma.buildPhase.create({
      data: phase,
    });
  }

  console.log(`Created ${phases.length} build phases`);

  // Create projected costs
  const projectedCosts = [
    {
      category: "MATERIALS" as const,
      itemName: "2x4 Lumber",
      count: 500,
      unit: "pieces",
      unitCost: 4.5,
      totalCost: 2250.0,
      notes: "Estimate from supplier quote",
      projectId: project.id,
    },
    {
      category: "LABOR" as const,
      itemName: "Framing labor",
      count: 160,
      unit: "hours",
      unitCost: 45.0,
      totalCost: 7200.0,
      notes: "Two framers for 2 weeks",
      projectId: project.id,
    },
    {
      category: "MATERIALS" as const,
      itemName: "Concrete",
      count: 40,
      unit: "cubic yards",
      unitCost: 125.0,
      totalCost: 5000.0,
      notes: "Foundation estimate",
      projectId: project.id,
    },
  ];

  for (const cost of projectedCosts) {
    await prisma.projectedCost.create({
      data: {
        ...cost,
        count: new Prisma.Decimal(cost.count),
        unitCost: new Prisma.Decimal(cost.unitCost),
        totalCost: new Prisma.Decimal(cost.totalCost),
      },
    });
  }

  console.log(`Created ${projectedCosts.length} projected costs`);

  // Create actual costs
  const actualCosts = [
    {
      category: "MATERIALS" as const,
      itemName: "2x4x8 Lumber",
      count: 520,
      unit: "pieces",
      unitCost: 4.75,
      totalCost: 2470.0,
      date: new Date("2024-01-20"),
      vendor: "Home Depot",
      notes: "Needed extra for waste",
      projectId: project.id,
    },
    {
      category: "LABOR" as const,
      itemName: "Framing labor",
      count: 80,
      unit: "hours",
      unitCost: 45.0,
      totalCost: 3600.0,
      date: new Date("2024-02-01"),
      vendor: "ABC Framing Crew",
      notes: "Week 1 of framing",
      projectId: project.id,
    },
    {
      category: "MATERIALS" as const,
      itemName: "Ready-mix concrete",
      count: 42,
      unit: "cubic yards",
      unitCost: 130.0,
      totalCost: 5460.0,
      date: new Date("2024-01-15"),
      vendor: "Springfield Concrete",
      notes: "Foundation pour - needed extra",
      projectId: project.id,
    },
    {
      category: "LABOR" as const,
      itemName: "Electrician rough-in",
      count: 32,
      unit: "hours",
      unitCost: 65.0,
      totalCost: 2080.0,
      date: new Date("2024-02-20"),
      vendor: "Smith Electric",
      notes: "First floor electrical",
      projectId: project.id,
    },
    {
      category: "MISCELLANEOUS" as const,
      itemName: "Building permits",
      count: 1,
      unit: "set",
      unitCost: 1250.0,
      totalCost: 1250.0,
      date: new Date("2024-01-05"),
      vendor: "City of Springfield",
      notes: "Permits and inspection fees",
      projectId: project.id,
    },
  ];

  for (const cost of actualCosts) {
    await prisma.actualCost.create({
      data: {
        ...cost,
        count: new Prisma.Decimal(cost.count),
        unitCost: new Prisma.Decimal(cost.unitCost),
        totalCost: new Prisma.Decimal(cost.totalCost),
      },
    });
  }

  console.log(`Created ${actualCosts.length} actual costs`);
  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
