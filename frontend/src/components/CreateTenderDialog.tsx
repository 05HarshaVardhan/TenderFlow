// src/components/CreateTenderDialog.tsx

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/router"; // Keep useRouter if you still want a redirect, though likely not needed for dialog
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatISO } from "date-fns";
import toast from "react-hot-toast";

// Import your Shadcn UI Dialog components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"; // Adjust path if needed

// Zod schema remains the same
const tenderSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  deadline: z
    .string()
    .refine((date) => {
      const selected = new Date(date);
      const today = new Date();
      selected.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      return selected >= today;
    }, "Deadline cannot be a past date"),
  budget: z.preprocess(
    (val) => parseFloat(val as string),
    z.number().positive("Budget must be a positive number")
  ),
});

type TenderFormData = z.infer<typeof tenderSchema>;

interface CreateTenderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional: A callback function to run after successful tender creation,
  // e.g., to refresh data on the dashboard.
  onTenderCreated?: () => void;
}

export const CreateTenderDialog: React.FC<CreateTenderDialogProps> = ({
  open,
  onOpenChange,
  onTenderCreated,
}) => {
  const router = useRouter(); // Still here just in case, but likely not used for direct navigation post-dialog
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset, // Add reset to clear form after submission/closing
  } = useForm<TenderFormData>({
    resolver: zodResolver(tenderSchema),
  });

  const onSubmit = async (data: TenderFormData) => {
    try {
      // NOTE: You might need to include the JWT token in the headers for this request.
      // Since it's a client-side component now, `credentials: "include"` will send cookies,
      // but if your backend expects an Authorization header, you'll need to fetch the token from cookies
      // or context. For simplicity, keeping `credentials: "include"` as it was.
      // If your backend specifically checks for an Authorization Bearer token from client-side,
      // you'd need to modify this to get the token, e.g., from a context or by parsing cookies here.
      // For now, assuming `credentials: "include"` is sufficient for your backend auth.
      const res = await fetch("http://localhost:5000/api/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // This sends the httpOnly cookie if present
        body: JSON.stringify({
          ...data,
          deadline: formatISO(new Date(data.deadline)),
        }),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success("Tender created successfully!");
        reset(); // Clear form fields
        onOpenChange(false); // Close the dialog
        if (onTenderCreated) {
          onTenderCreated(); // Trigger dashboard data refresh
        }
        // Removed direct router.push, as we want to stay on the dashboard
        // If you still want to navigate somewhere after creating a tender, you can add that logic back here.
      } else {
        toast.error(result.message || "❌ Failed to create tender");
      }
    } catch (err) {
      console.error("Error creating tender:", err);
      toast.error("🚨 An error occurred while creating the tender.");
    }
  };

  // When the dialog closes, reset the form
  const handleOpenChange = (openState: boolean) => {
    if (!openState) {
      reset(); // Reset form fields when dialog is closed
    }
    onOpenChange(openState);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Tender</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new tender.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div>
            <Input placeholder="Tender Title" {...register("title")} />
            {errors.title && (
              <p className="text-red-500 text-sm">{errors.title.message}</p>
            )}
          </div>
          <div>
            <Textarea
              placeholder="Tender Description"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-red-500 text-sm">
                {errors.description.message}
              </p>
            )}
          </div>
          <div>
            <Input
              type="date"
              {...register("deadline")}
              min={new Date().toISOString().split("T")[0]}
            />
            {errors.deadline && (
              <p className="text-red-500 text-sm">{errors.deadline.message}</p>
            )}
          </div>
          <div>
            <Input
              type="number"
              step="0.01"
              placeholder="Budget"
              {...register("budget")}
            />
            {errors.budget && (
              <p className="text-red-500 text-sm">{errors.budget.message}</p>
            )}
          </div>
          <DialogFooter className="mt-6"> {/* Use DialogFooter for buttons */}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Tender"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};