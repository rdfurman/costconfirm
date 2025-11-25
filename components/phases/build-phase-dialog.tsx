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
import { BuildPhaseForm } from "./build-phase-form";

interface BuildPhaseDialogProps {
  projectId: string;
}

export function BuildPhaseDialog({ projectId }: BuildPhaseDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-green-600 hover:bg-green-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Phase
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Build Phase</DialogTitle>
          <DialogDescription>
            Define a construction phase with projected and actual timelines
          </DialogDescription>
        </DialogHeader>
        <BuildPhaseForm projectId={projectId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
