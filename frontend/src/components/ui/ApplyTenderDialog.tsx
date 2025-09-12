import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter, // Added DialogFooter for consistent button placement
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { FaDollarSign, FaFileAlt } from 'react-icons/fa'; // Icons for form fields

// --- Interfaces ---
// Re-using the Tender interface from your pages/tenders/all/index.tsx
interface Tender {
  id: number;
  title: string;
  description: string;
  deadline: string;
  budget: number;
  status: 'Active' | 'Expired' | 'Application Closed';
  company: {
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

interface ApplyTenderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tender: Tender | null; // The tender object for which the application is being submitted
}
// --- End Interfaces ---

export const ApplyTenderDialog: React.FC<ApplyTenderDialogProps> = ({ isOpen, onClose, tender }) => {
  const [quotationAmount, setQuotationAmount] = useState<string>('');
  const [proposalText, setProposalText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form fields when the dialog opens or a new tender is selected
  useEffect(() => {
    if (isOpen) {
      setQuotationAmount('');
      setProposalText('');
      setIsSubmitting(false); // Reset submission state
    }
  }, [isOpen, tender]); // Depend on isOpen and tender to reset when either changes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission

    if (!tender) {
      toast.error("No tender selected for application.");
      return;
    }

    // Basic client-side validation
    if (!quotationAmount || parseFloat(quotationAmount) <= 0) {
      toast.error("Please enter a valid quotation amount.");
      return;
    }
    if (!proposalText.trim()) {
      toast.error("Proposal text cannot be empty.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:5000/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for sending authentication cookies
        body: JSON.stringify({
          tenderId: tender.id, // This is correctly passed from the tender prop
          quotationAmount: parseFloat(quotationAmount),
          proposalText: proposalText.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit application.');
      }

      const result = await response.json();
      toast.success(result.message || 'Application submitted successfully!');
      onClose(); // Close the dialog on successful submission
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast.error(error.message || "An error occurred during submission. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Removed explicit bg/text/shadow classes to rely on Shadcn defaults */}
      <DialogContent className="sm:max-w-[425px]"> {/* Matched max-width with CreateTenderDialog */}
        <DialogHeader>
          {/* Removed explicit text color/font classes to rely on Shadcn defaults */}
          <DialogTitle>Apply for Tender</DialogTitle>
          {/* Removed explicit text color/font classes to rely on Shadcn defaults */}
          <DialogDescription>
            Submit your application for: <strong>{tender?.title || 'Selected Tender'}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            {/* Removed explicit text color/flex classes, relying on Shadcn Label defaults */}
            <Label htmlFor="quotationAmount" className="text-right flex items-center gap-1">
              <FaDollarSign /> Quotation
            </Label>
            {/* Removed explicit bg/border/text classes, relying on Shadcn Input defaults */}
            <Input
              id="quotationAmount"
              type="number"
              step="0.01"
              value={quotationAmount}
              onChange={(e) => setQuotationAmount(e.target.value)}
              className="col-span-3" // Kept grid column span
              placeholder="e.g., 15000.00"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            {/* Removed explicit text color/flex classes, relying on Shadcn Label defaults */}
            <Label htmlFor="proposalText" className="text-right flex items-center gap-1 mt-2">
              <FaFileAlt /> Proposal
            </Label>
            {/* Removed explicit bg/border/text classes, relying on Shadcn Textarea defaults */}
            <Textarea
              id="proposalText"
              value={proposalText}
              onChange={(e) => setProposalText(e.target.value)}
              className="col-span-3 min-h-[120px]" // Kept grid column span and min-height
              placeholder="Describe your proposal and why your company is suitable..."
              required
            />
          </div>
          {/* Used DialogFooter for consistent button styling and placement */}
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
