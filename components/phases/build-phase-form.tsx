"use client";

import { useState } from "react";
import { createBuildPhase } from "@/lib/actions/build-phases";
import { Button } from "@/components/ui/button";

interface BuildPhaseFormProps {
  projectId: string;
  onSuccess?: () => void;
}

export function BuildPhaseForm({ projectId, onSuccess }: BuildPhaseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    projectedStartDate: "",
    projectedCompletionDate: "",
    actualStartDate: "",
    actualCompletionDate: "",
    delayReason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createBuildPhase(projectId, {
        name: formData.name,
        description: formData.description || undefined,
        projectedStartDate: formData.projectedStartDate
          ? new Date(formData.projectedStartDate)
          : undefined,
        projectedCompletionDate: formData.projectedCompletionDate
          ? new Date(formData.projectedCompletionDate)
          : undefined,
        actualStartDate: formData.actualStartDate
          ? new Date(formData.actualStartDate)
          : undefined,
        actualCompletionDate: formData.actualCompletionDate
          ? new Date(formData.actualCompletionDate)
          : undefined,
        delayReason: formData.delayReason || undefined,
      });

      // Reset form
      setFormData({
        name: "",
        description: "",
        projectedStartDate: "",
        projectedCompletionDate: "",
        actualStartDate: "",
        actualCompletionDate: "",
        delayReason: "",
      });

      alert("Build phase added successfully!");
      onSuccess?.();
    } catch (error) {
      console.error("Error creating build phase:", error);
      alert("Failed to add build phase. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Phase Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Phase Name *
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Foundation, Framing, Electrical"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
          placeholder="Details about this phase..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Projected Dates */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Projected Timeline</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="projectedStartDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="projectedStartDate"
              value={formData.projectedStartDate}
              onChange={(e) => setFormData({ ...formData, projectedStartDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label htmlFor="projectedCompletionDate" className="block text-sm font-medium text-gray-700 mb-1">
              Completion Date
            </label>
            <input
              type="date"
              id="projectedCompletionDate"
              value={formData.projectedCompletionDate}
              onChange={(e) => setFormData({ ...formData, projectedCompletionDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* Actual Dates */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Actual Timeline (Optional)</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="actualStartDate" className="block text-sm font-medium text-gray-700 mb-1">
              Actual Start Date
            </label>
            <input
              type="date"
              id="actualStartDate"
              value={formData.actualStartDate}
              onChange={(e) => setFormData({ ...formData, actualStartDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label htmlFor="actualCompletionDate" className="block text-sm font-medium text-gray-700 mb-1">
              Actual Completion Date
            </label>
            <input
              type="date"
              id="actualCompletionDate"
              value={formData.actualCompletionDate}
              onChange={(e) => setFormData({ ...formData, actualCompletionDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* Delay Reason */}
      <div>
        <label htmlFor="delayReason" className="block text-sm font-medium text-gray-700 mb-1">
          Delay Reason (if applicable)
        </label>
        <textarea
          id="delayReason"
          value={formData.delayReason}
          onChange={(e) => setFormData({ ...formData, delayReason: e.target.value })}
          rows={2}
          placeholder="e.g., Weather delay, material shortage, etc."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        {isSubmitting ? "Adding..." : "Add Build Phase"}
      </Button>
    </form>
  );
}
