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
import { ActualCostForm } from "./actual-cost-form";

interface ActualCostDialogProps {
  projectId: string;
}

export function ActualCostDialog({ projectId }: ActualCostDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Cost
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Actual Cost</DialogTitle>
          <DialogDescription>
            Record a real expense incurred during construction
          </DialogDescription>
        </DialogHeader>
        <ActualCostForm projectId={projectId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
