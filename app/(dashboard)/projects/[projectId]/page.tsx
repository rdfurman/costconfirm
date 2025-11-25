import { redirect } from "next/navigation";
import { getProject } from "@/lib/actions/projects";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ActualCostDialog } from "@/components/costs/actual-cost-dialog";
import { ProjectedCostDialog } from "@/components/costs/projected-cost-dialog";
import { BuildPhaseDialog } from "@/components/phases/build-phase-dialog";
import { auth } from "@/lib/auth";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const resolvedParams = await params;
  const project = await getProject(resolvedParams.projectId);

  // Calculate totals from new cost structure
  const totalActualCost = project.actualCosts.reduce(
    (sum, cost) => sum + Number(cost.totalCost),
    0
  );

  const totalProjectedCost = project.projectedCosts.reduce(
    (sum, cost) => sum + Number(cost.totalCost),
    0
  );

  const costVariance = totalActualCost - totalProjectedCost;
  const variancePercent = totalProjectedCost > 0
    ? ((costVariance / totalProjectedCost) * 100).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/projects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          {project.contractor && (
            <p className="text-gray-600 mt-1">Contractor: {project.contractor}</p>
          )}
          {project.address && (
            <p className="text-gray-600 mt-1">{project.address}</p>
          )}
          {project.description && (
            <p className="text-gray-600 mt-2">{project.description}</p>
          )}
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            {project.projectedCompletion && (
              <span>Projected: {new Date(project.projectedCompletion).toLocaleDateString()}</span>
            )}
            {project.actualCompletion && (
              <span>Completed: {new Date(project.actualCompletion).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Projected Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                ${totalProjectedCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">{project.projectedCosts.length} items</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Actual Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                ${totalActualCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">{project.actualCosts.length} items</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Variance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${costVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${Math.abs(costVariance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {costVariance > 0 ? 'Over' : 'Under'} by {variancePercent}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Build Phases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{project.buildPhases.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                {project.buildPhases.filter(p => p.actualCompletionDate).length} completed
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Actual Costs Section */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Actual Costs</CardTitle>
                  <CardDescription>
                    Real expenses incurred during construction
                  </CardDescription>
                </div>
                <ActualCostDialog projectId={project.id} />
              </div>
            </CardHeader>
            <CardContent>
              {project.actualCosts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No actual costs recorded yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Date</th>
                        <th className="text-left py-2 px-4">Category</th>
                        <th className="text-left py-2 px-4">Item</th>
                        <th className="text-right py-2 px-4">Qty</th>
                        <th className="text-right py-2 px-4">Unit Cost</th>
                        <th className="text-right py-2 px-4">Total</th>
                        <th className="text-left py-2 px-4">Vendor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.actualCosts.map((cost) => (
                        <tr key={cost.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-4">{new Date(cost.date).toLocaleDateString()}</td>
                          <td className="py-2 px-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {cost.category}
                            </span>
                          </td>
                          <td className="py-2 px-4">{cost.itemName}</td>
                          <td className="py-2 px-4 text-right">{Number(cost.count)} {cost.unit}</td>
                          <td className="py-2 px-4 text-right">${Number(cost.unitCost).toFixed(2)}</td>
                          <td className="py-2 px-4 text-right font-semibold">${Number(cost.totalCost).toFixed(2)}</td>
                          <td className="py-2 px-4">{cost.vendor || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Projected Costs Section */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Projected Costs</CardTitle>
                  <CardDescription>
                    Initial cost estimates from contractor
                  </CardDescription>
                </div>
                <ProjectedCostDialog projectId={project.id} />
              </div>
            </CardHeader>
            <CardContent>
              {project.projectedCosts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No projected costs entered yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Category</th>
                        <th className="text-left py-2 px-4">Item</th>
                        <th className="text-right py-2 px-4">Qty</th>
                        <th className="text-right py-2 px-4">Unit Cost</th>
                        <th className="text-right py-2 px-4">Total</th>
                        <th className="text-left py-2 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.projectedCosts.map((cost) => (
                        <tr key={cost.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {cost.category}
                            </span>
                          </td>
                          <td className="py-2 px-4">{cost.itemName}</td>
                          <td className="py-2 px-4 text-right">{Number(cost.count)} {cost.unit}</td>
                          <td className="py-2 px-4 text-right">${Number(cost.unitCost).toFixed(2)}</td>
                          <td className="py-2 px-4 text-right font-semibold">${Number(cost.totalCost).toFixed(2)}</td>
                          <td className="py-2 px-4 text-sm text-gray-500">{cost.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Build Phases Section */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Build Phases</CardTitle>
                  <CardDescription>
                    Construction timeline and progress
                  </CardDescription>
                </div>
                <BuildPhaseDialog projectId={project.id} />
              </div>
            </CardHeader>
            <CardContent>
              {project.buildPhases.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No build phases defined yet</p>
              ) : (
                <div className="space-y-4">
                  {project.buildPhases.map((phase) => (
                    <div key={phase.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-lg">{phase.name}</h4>
                          {phase.description && (
                            <p className="text-sm text-gray-600">{phase.description}</p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          phase.actualCompletionDate
                            ? 'bg-green-100 text-green-800'
                            : phase.actualStartDate
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {phase.actualCompletionDate ? 'Completed' : phase.actualStartDate ? 'In Progress' : 'Not Started'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Projected:</p>
                          <p>
                            {phase.projectedStartDate && new Date(phase.projectedStartDate).toLocaleDateString()} - {' '}
                            {phase.projectedCompletionDate && new Date(phase.projectedCompletionDate).toLocaleDateString()}
                          </p>
                        </div>
                        {(phase.actualStartDate || phase.actualCompletionDate) && (
                          <div>
                            <p className="text-gray-500">Actual:</p>
                            <p>
                              {phase.actualStartDate ? new Date(phase.actualStartDate).toLocaleDateString() : 'Not started'} - {' '}
                              {phase.actualCompletionDate ? new Date(phase.actualCompletionDate).toLocaleDateString() : 'In progress'}
                            </p>
                          </div>
                        )}
                      </div>
                      {phase.delayReason && (
                        <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                          <p className="text-gray-700"><strong>Delay:</strong> {phase.delayReason}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
