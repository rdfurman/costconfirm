"use client";

import { useState } from "react";
import { createProjectedCost } from "@/lib/actions/projected-costs";
import { Button } from "@/components/ui/button";
import { CostCategory } from "@/app/generated/prisma/client";

interface ProjectedCostFormProps {
  projectId: string;
  onSuccess?: () => void;
}

export function ProjectedCostForm({ projectId, onSuccess }: ProjectedCostFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: "MATERIALS" as CostCategory,
    itemName: "",
    count: "",
    unit: "",
    unitCost: "",
    notes: "",
  });

  // Calculate total cost in real-time
  const totalCost = (Number(formData.count) || 0) * (Number(formData.unitCost) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createProjectedCost(projectId, {
        category: formData.category,
        itemName: formData.itemName,
        count: Number(formData.count),
        unit: formData.unit,
        unitCost: Number(formData.unitCost),
        notes: formData.notes || undefined,
      });

      // Reset form
      setFormData({
        category: "MATERIALS",
        itemName: "",
        count: "",
        unit: "",
        unitCost: "",
        notes: "",
      });

      alert("Projected cost added successfully!");
      onSuccess?.();
    } catch (error) {
      console.error("Error creating projected cost:", error);
      alert("Failed to add projected cost. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
          Category *
        </label>
        <select
          id="category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value as CostCategory })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          required
        >
          <option value="MATERIALS">Materials</option>
          <option value="LABOR">Labor</option>
          <option value="MISCELLANEOUS">Miscellaneous</option>
        </select>
      </div>

      {/* Item Name */}
      <div>
        <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-1">
          Item Name *
        </label>
        <input
          type="text"
          id="itemName"
          value={formData.itemName}
          onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
          placeholder="e.g., 2x4 lumber, Framing labor"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          required
        />
      </div>

      {/* Quantity and Unit */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="count" className="block text-sm font-medium text-gray-700 mb-1">
            Estimated Quantity *
          </label>
          <input
            type="number"
            id="count"
            value={formData.count}
            onChange={(e) => setFormData({ ...formData, count: e.target.value })}
            step="0.001"
            min="0"
            placeholder="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>
        <div>
          <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
            Unit *
          </label>
          <input
            type="text"
            id="unit"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            placeholder="pieces, hours, sq ft"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>
      </div>

      {/* Unit Cost */}
      <div>
        <label htmlFor="unitCost" className="block text-sm font-medium text-gray-700 mb-1">
          Estimated Unit Cost ($) *
        </label>
        <input
          type="number"
          id="unitCost"
          value={formData.unitCost}
          onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
          step="0.01"
          min="0"
          placeholder="4.50"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          required
        />
      </div>

      {/* Total Cost (calculated) */}
      <div className="bg-purple-50 p-3 rounded-md">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Estimated Total (calculated)
        </label>
        <p className="text-2xl font-bold text-purple-900">
          ${totalCost.toFixed(2)}
        </p>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          placeholder="Estimation details, source of quote, etc."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        {isSubmitting ? "Adding..." : "Add Projected Cost"}
      </Button>
    </form>
  );
}
