"use client";

import { useState } from "react";
import { createActualCost } from "@/lib/actions/actual-costs";
import { Button } from "@/components/ui/button";
import { CostCategory } from "@/app/generated/prisma/client";

interface ActualCostFormProps {
  projectId: string;
  onSuccess?: () => void;
}

export function ActualCostForm({ projectId, onSuccess }: ActualCostFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: "MATERIALS" as CostCategory,
    itemName: "",
    count: "",
    unit: "",
    unitCost: "",
    date: new Date().toISOString().split("T")[0], // Today's date in YYYY-MM-DD format
    vendor: "",
    notes: "",
  });

  // Calculate total cost in real-time
  const totalCost = (Number(formData.count) || 0) * (Number(formData.unitCost) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createActualCost(projectId, {
        category: formData.category,
        itemName: formData.itemName,
        count: Number(formData.count),
        unit: formData.unit,
        unitCost: Number(formData.unitCost),
        date: new Date(formData.date),
        vendor: formData.vendor || undefined,
        notes: formData.notes || undefined,
      });

      // Reset form
      setFormData({
        category: "MATERIALS",
        itemName: "",
        count: "",
        unit: "",
        unitCost: "",
        date: new Date().toISOString().split("T")[0],
        vendor: "",
        notes: "",
      });

      alert("Cost added successfully!");
      onSuccess?.();
    } catch (error) {
      console.error("Error creating cost:", error);
      alert("Failed to add cost. Please try again.");
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Quantity and Unit */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="count" className="block text-sm font-medium text-gray-700 mb-1">
            Quantity *
          </label>
          <input
            type="number"
            id="count"
            value={formData.count}
            onChange={(e) => setFormData({ ...formData, count: e.target.value })}
            step="0.001"
            min="0"
            placeholder="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      {/* Unit Cost */}
      <div>
        <label htmlFor="unitCost" className="block text-sm font-medium text-gray-700 mb-1">
          Unit Cost ($) *
        </label>
        <input
          type="number"
          id="unitCost"
          value={formData.unitCost}
          onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
          step="0.01"
          min="0"
          placeholder="4.50"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Total Cost (calculated) */}
      <div className="bg-gray-50 p-3 rounded-md">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Total Cost (calculated)
        </label>
        <p className="text-2xl font-bold text-gray-900">
          ${totalCost.toFixed(2)}
        </p>
      </div>

      {/* Date */}
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
          Date *
        </label>
        <input
          type="date"
          id="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Vendor */}
      <div>
        <label htmlFor="vendor" className="block text-sm font-medium text-gray-700 mb-1">
          Vendor
        </label>
        <input
          type="text"
          id="vendor"
          value={formData.vendor}
          onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
          placeholder="Home Depot, ABC Construction"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
          placeholder="Additional details..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? "Adding..." : "Add Actual Cost"}
      </Button>
    </form>
  );
}
