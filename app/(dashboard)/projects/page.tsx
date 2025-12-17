import { getProjects } from "@/lib/actions/projects";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Projects</h1>
            <p className="text-gray-600 mt-1">
              Manage your home building projects and billing data
            </p>
          </div>
          <CreateProjectDialog />
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Projects Yet</CardTitle>
              <CardDescription>
                Create your first project to start tracking billing data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreateProjectDialog />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                    {project.contractor && (
                      <CardDescription>Contractor: {project.contractor}</CardDescription>
                    )}
                    {project.address && (
                      <CardDescription>{project.address}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {project.description && (
                      <p className="text-sm text-gray-600 mb-4">
                        {project.description}
                      </p>
                    )}
                    <div className="space-y-2 text-sm text-gray-500">
                      {project.projectedCompletion && (
                        <div>
                          Projected completion:{" "}
                          {new Date(project.projectedCompletion).toLocaleDateString()}
                        </div>
                      )}
                      {project.actualCompletion && (
                        <div className="text-green-600 font-medium">
                          ✓ Completed: {new Date(project.actualCompletion).toLocaleDateString()}
                        </div>
                      )}
                      <div>
                        Last updated:{" "}
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}
