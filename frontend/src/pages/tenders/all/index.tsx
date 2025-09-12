//frontend/src/pages/tenders/all/index.tsx

import useSWR from 'swr';
import {fetcher} from '@/lib/fetcher';

import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isAfter, isBefore, isEqual } from 'date-fns';
import { FaEdit, FaTrash, FaPenSquare } from 'react-icons/fa'; // Added FaPenSquare for Apply icon

import { Navbar } from "@/components/ui/Navbar";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React, { useState, useMemo } from 'react';

// Shadcn UI AlertDialog components for confirmation
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { EditTenderDialog } from '@/components/ui/EditTenderDialog';
import { Toaster, toast } from 'sonner'; // Using 'sonner' for toasts

// NEW: Import the ApplyTenderDialog component
import { ApplyTenderDialog } from '@/components/ui/ApplyTenderDialog';


// --- Interfaces (ensure these match your backend API responses) ---
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
  companyId: number; // Important for filtering/exclusion
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

interface TendersApiResponse {
  success: boolean;
  message: string;
  totalTenders: number;
  currentPage: number;
  totalPages: number;
  tenders: Tender[];
}

interface UserApiResponse {
  id: number;
  name?: string;
  username?: string;
  email: string;
  companyId?: number; // Crucial: Your API /api/auth/me MUST return the user's companyId
}

interface TendersPageProps {
  tenders: Tender[];
  userName: string;
  userCompanyId?: number; // Pass the logged-in user's company ID from SSR
  error?: string;
}
// --- End Interfaces ---


export default function AllTendersPage({ tenders: initialTenders, userName, userCompanyId, error }: TendersPageProps) {

 
  const router = useRouter();

  // State for filters
  const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [minBudget, setMinBudget] = useState<string>('');
  const [maxBudget, setMaxBudget] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // State for Edit Tender Dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);

  // States for Delete Confirmation Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tenderToDelete, setTenderToDelete] = useState<{ id: number; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false); // To manage loading state for delete button

  // Use a separate state for the tenders that can be updated after an edit or delete
  const [tenders, setTenders] = useState<Tender[]>(initialTenders);

  // NEW: State for Apply Tender Dialog
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [selectedTenderForApply, setSelectedTenderForApply] = useState<Tender | null>(null);


  // Memoized filtered tenders array based on current filters (client-side filtering)
  const filteredTenders = useMemo(() => {
    return tenders.filter(tender => {
      // 1. Search term filter (case-insensitive)
      const matchesSearch = searchTerm === '' ||
                            tender.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            tender.description.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Status filter
      const matchesStatus = filterStatus === 'All' || tender.status === filterStatus;

      // 3. Budget filters
      const budgetNum = tender.budget;
      const minBudgetNum = parseFloat(minBudget);
      const maxBudgetNum = parseFloat(maxBudget);

      const matchesMinBudget = isNaN(minBudgetNum) || budgetNum >= minBudgetNum;
      const matchesMaxBudget = isNaN(maxBudgetNum) || budgetNum <= maxBudgetNum;

      // 4. Date filters
      const tenderDeadline = parseISO(tender.deadline);
      let matchesStartDate = true;
      let matchesEndDate = true;

      if (startDate) {
        const start = parseISO(startDate);
        matchesStartDate = isAfter(tenderDeadline, start) || isEqual(tenderDeadline, start);
      }

      if (endDate) {
        const end = parseISO(endDate);
        matchesEndDate = isBefore(tenderDeadline, end) || isEqual(tenderDeadline, end);
      }

      // All filters must match
      return matchesSearch && matchesStatus && matchesMinBudget && matchesMaxBudget && matchesStartDate && matchesEndDate;
    });
  }, [tenders, searchTerm, filterStatus, minBudget, maxBudget, startDate, endDate]);

  // Function to open the edit dialog with a specific tender
  const handleEditClick = (tender: Tender) => {
    // IMPORTANT: Users should NOT be able to edit tenders from other companies.
    // This is a client-side warning; your backend should also enforce this.
    if (tender.companyId !== userCompanyId) {
      toast.error("You can only edit tenders created by your company.");
      return;
    }
    setSelectedTender(tender);
    setIsEditDialogOpen(true);
  };

  // Function to close the edit dialog
  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedTender(null);
  };

  // Function to handle save from the dialog (updates local state)
  const handleSaveTender = (updatedTender: Tender) => {
    setTenders(prevTenders =>
      prevTenders.map(t => (t.id === updatedTender.id ? updatedTender : t))
    );
  };

  // --- Functions to handle delete confirmation dialog ---
  const openDeleteDialog = (tenderId: number, tenderTitle: string, tenderCompanyId: number) => {
    // IMPORTANT: Users should NOT be able to delete tenders from other companies.
    // This is a client-side warning; your backend should also enforce this.
    if (tenderCompanyId !== userCompanyId) {
      toast.error("You can only delete tenders created by your company.");
      return;
    }
    setTenderToDelete({ id: tenderId, title: tenderTitle });
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setTenderToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!tenderToDelete) return;

    setIsDeleting(true); // Start loading state for delete button
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/tenders/${tenderToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include', // Important for sending the cookie
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete tender');
      }

      // Remove the deleted tender from the state to update UI
      setTenders(prevTenders => prevTenders.filter(tender => tender.id !== tenderToDelete.id));
      toast.success("Tender deleted successfully!");
      closeDeleteDialog(); // Close the dialog on success
    } catch (error: any) {
      console.error("Error deleting tender:", error);
      toast.error(error.message || "Failed to delete tender. Please try again.");
    } finally {
      setIsDeleting(false); // End loading state for delete button
    }
  };
  // --- END Delete Confirmation ---

  // MODIFIED: Handler for "Apply" button - now opens dialog
  const handleApplyClick = (tender: Tender) => { // Pass the full tender object
    setSelectedTenderForApply(tender);
    setIsApplyDialogOpen(true);
  };


  if (error) {
    return (
      <div className="container mx-auto p-6 text-red-500">
        <h1 className="text-2xl font-bold mb-4">Error Loading Tenders</h1>
        <p>{error}</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <>
      <Navbar userName={userName} />
      <Toaster richColors position="top-right" /> {/* Sonner toaster */}

      <div className="min-h-screen bg-background text-foreground py-8 px-4">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Browse Tenders from Other Companies</h1> {/* Page Title */}
            <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
          </div>

          {/* Filter and Search Section */}
          <div className="mb-8 p-4 bg-card rounded-lg shadow-md flex flex-col gap-4">
            <Input
              placeholder="Search by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Application Closed">Application Closed</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min Budget"
                  value={minBudget}
                  onChange={(e) => setMinBudget(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Max Budget"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  placeholder="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  type="date"
                  placeholder="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Tenders Grid */}
          {filteredTenders.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-lg text-muted-foreground">No tenders found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTenders.map((tender) => (
                <Card
                  key={tender.id}
                  className="shadow-md hover:shadow-lg transition-shadow duration-200"
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl font-semibold pr-2">
                        {tender.title}
                      </CardTitle>
                      {tender.status === 'Active' && (
                        <Badge className="bg-green-500 text-white hover:bg-green-600 flex items-center gap-1">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                          </span>
                          Active
                        </Badge>
                      )}
                      {(tender.status === 'Expired' || tender.status === 'Application Closed') && (
                        <Badge variant="destructive">
                          Closed
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground line-clamp-3">{tender.description}</p>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>
                        Deadline:{" "}
                        {format(new Date(tender.deadline), "MMM dd, yyyy")}
                      </span>
                      <span>Budget: ${tender.budget.toLocaleString('en-US')}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Company: {tender.company?.name || 'N/A'}
                    </p>

                    <div className="flex justify-end gap-2 mt-4">
                      {/* Conditional rendering for buttons */}
                      {tender.companyId === userCompanyId ? (
                        <>
                          {/* Render Edit and Delete for YOUR company's tenders */}
                          <Button
                            variant="outline" // Use outline for a black/white theme
                            size="sm"
                            onClick={() => handleEditClick(tender)}
                            className="border-gray-700 text-gray-700 hover:bg-gray-100 dark:border-gray-300 dark:text-gray-300 dark:hover:bg-gray-800"
                          >
                            <FaEdit className="mr-2" /> Edit
                          </Button>
                          <Button
                            variant="destructive" // destructive for delete retains red, which is a common pattern for delete
                            size="sm"
                            onClick={() => openDeleteDialog(tender.id, tender.title, tender.companyId)}
                            disabled={isDeleting}
                          >
                            <FaTrash className="mr-2" /> {isDeleting ? 'Deleting...' : 'Delete'}
                          </Button>
                        </>
                      ) : (
                        // Render Apply button for OTHER companies' Active tenders
                        tender.status === 'Active' && (
                          <Button
                            variant="default" // Use default for a filled button
                            size="sm"
                            onClick={() => handleApplyClick(tender)} // Pass the full tender object
                            className="bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 transition-colors duration-200"
                          >
                            <FaPenSquare className="mr-2" /> Apply Now
                          </Button>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Render the EditTenderDialog */}
      <EditTenderDialog
        isOpen={isEditDialogOpen}
        onClose={handleCloseEditDialog}
        tender={selectedTender}
        onSave={handleSaveTender}
        onDelete={() => { /* no-op or handle if dialog could trigger delete */ }}
      />

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={closeDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the tender "
              <strong>{tenderToDelete?.title}</strong>" from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* NEW: Render the ApplyTenderDialog */}
      <ApplyTenderDialog
        isOpen={isApplyDialogOpen}
        onClose={() => setIsApplyDialogOpen(false)} // Function to close the dialog
        tender={selectedTenderForApply} // Pass the selected tender to the dialog
      />
    </>
  );
}

// --- getServerSideProps for "Tenders from Other Companies" ---
export const getServerSideProps: GetServerSideProps<TendersPageProps> = async (context) => {
  const cookie = context.req.headers.cookie || '';
  let userName: string = 'User';
  let userCompanyId: number | undefined; // To store the logged-in user's companyId
  const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  try {
    // 1. Fetch User Info (crucial for getting companyId to EXCLUDE)
    const userRes = await fetch(`${BACKEND_BASE_URL}/api/auth/me`, {
      headers: {
        Cookie: cookie, // Send cookies to authenticate
      },
    });

    if (!userRes.ok) {
      if (userRes.status === 401) { // If unauthenticated, redirect to login
        return { redirect: { destination: '/auth/login', permanent: false } };
      }
      const errorData = await userRes.json();
      console.error("Failed to fetch user info for All Tenders:", userRes.status, errorData);
      return {
        props: { tenders: [], userName: 'User', error: errorData.message || "Failed to load user information." }
      };
    }

    const userData: UserApiResponse = await userRes.json();
    userName = userData.name || userData.username || 'User';
    userCompanyId = userData.companyId; // Get the user's company ID

    // 2. Fetch Tenders. The backend now automatically excludes the logged-in company's tenders.
    // So, we no longer need to send `excludeCompanyId` as a query parameter.
    const tendersRes = await fetch(`${BACKEND_BASE_URL}/api/tenders/all`, {
      headers: {
        Cookie: cookie,
      },
    });

    if (!tendersRes.ok) {
      const errorData = await tendersRes.json();
      console.error("Failed to fetch All Tenders:", tendersRes.status, errorData);
      return {
        props: {
          tenders: [],
          userName,
          userCompanyId,
          error: errorData.message || `Failed to fetch tenders: ${tendersRes.statusText}`,
        },
      };
    }

    // FIX: Corrected variable name from tendersApiResponse to tendersRes
    const tendersApiResponse: TendersApiResponse = await tendersRes.json();
    const tenders: Tender[] = tendersApiResponse.tenders;

    return {
      props: {
        tenders,
        userName,
        userCompanyId,
      },
    };
  } catch (error: any) {
    console.error("Error in getServerSideProps (All Tenders page):", error);
    return {
      props: {
        tenders: [],
        userName: 'User',
        error: "An unexpected error occurred while fetching data for All Tenders.",
      },
    };
  }
};
