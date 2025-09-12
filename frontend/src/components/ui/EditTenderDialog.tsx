// src/components/EditTenderDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner'; // Assuming you have sonner for notifications

// Re-define Tender interface to match the full structure from src/pages/tenders/index.tsx
// This ensures the dialog can hold and pass ALL relevant tender data, including 'company'.
interface Tender {
  id: number;
  title: string;
  description: string;
  deadline: string;
  budget: number;
  status: 'Active' | 'Expired' | 'Application Closed';
  company: { // <--- CRITICAL: Include the company object here
    id: number;
    name: string;
    industry?: string;
    description?: string;
    logoUrl?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  companyId: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

// Props for the EditTenderDialog component
interface EditTenderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tender: Tender | null; // <--- CRITICAL: Expect the full Tender object
  onSave: (updatedTender: Tender) => void; // <--- CRITICAL: Callback expects full Tender object
}

export const EditTenderDialog: React.FC<EditTenderDialogProps> = ({ isOpen, onClose, tender, onSave }) => {
  // State now holds the full Tender object
  const [formData, setFormData] = useState<Tender | null>(null); // <--- CRITICAL: State type is now full Tender
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tender) {
      // Format deadline to YYYY-MM-DD for <input type="date">
      const formattedDeadline = tender.deadline ? new Date(tender.deadline).toISOString().split('T')[0] : '';
      // ✅ Spread the entire tender object to retain all its properties (like 'company')
      setFormData({ ...tender, deadline: formattedDeadline });
    } else {
      // Reset form if no tender is passed (e.g., when dialog is opened for creating)
      setFormData(null);
    }
  }, [tender]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [id]: id === 'budget' ? parseFloat(value) || 0 : value,
      };
    });
  };

  const handleSelectChange = (value: string, field: keyof Tender) => { // <--- CRITICAL: field type is now keyof Tender
    setFormData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [field]: value as Tender['status'], // Cast value to TenderStatus
      };
    });
  };

  const handleSubmit = async () => {
    if (!formData || !formData.id) {
      toast.error("No tender selected for editing.");
      return;
    }

    setLoading(true);
    try {
      // Send only the editable fields to the backend.
      // The backend will re-fetch the full object including 'company' after update.
      const payload = {
        title: formData.title,
        description: formData.description,
        deadline: formData.deadline,
        budget: formData.budget,
        status: formData.status,
        // Do NOT send the 'company' object itself unless it's editable in this dialog.
        // The backend should handle re-associating based on companyId.
        // If companyId is editable, include it here: companyId: formData.companyId,
      };

      const response = await fetch(`http://localhost:5000/api/tenders/${formData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload), // Send only the editable fields
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update tender');
      }

      const responseData = await response.json();
      const updatedTenderFromApi = responseData.tender; // This should be the full object from backend

      // ✅ Pass the fully updated tender from the API response to the parent
      onSave(updatedTenderFromApi);
      toast.success("Tender updated successfully!");
      onClose(); // Close dialog on success
    } catch (error: any) {
      console.error("Error updating tender:", error);
      toast.error(error.message || "Failed to update tender. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!formData && tender) return null; // Don't render content until formData is initialized

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Tender</DialogTitle>
          <DialogDescription>
            Make changes to your tender here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={formData?.title || ''}
              onChange={handleChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData?.description || ''}
              onChange={handleChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="deadline" className="text-right">
              Deadline
            </Label>
            <Input
              id="deadline"
              type="date"
              value={formData?.deadline || ''}
              onChange={handleChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="budget" className="text-right">
              Budget
            </Label>
            <Input
              id="budget"
              type="number"
              value={formData?.budget || ''}
              onChange={handleChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select
              value={formData?.status || ''}
              onValueChange={(value) => handleSelectChange(value, 'status')}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
                <SelectItem value="Application Closed">Application Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline" disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};