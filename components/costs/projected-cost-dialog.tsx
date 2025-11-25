"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProjectedCostForm } from "./projected-cost-form";

interface ProjectedCostDialogProps {
  projectId: string;
}

export function ProjectedCostDialog({ projectId }: ProjectedCostDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Estimate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Projected Cost</DialogTitle>
          <DialogDescription>
            Enter a cost estimate from the contractor or your own calculations
          </DialogDescription>
        </DialogHeader>
        <ProjectedCostForm projectId={projectId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
