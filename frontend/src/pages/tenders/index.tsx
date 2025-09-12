// src/pages/tenders/index.tsx

import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isAfter, isBefore, isEqual } from 'date-fns';
import { FaEdit, FaTrash, FaClipboardList } from 'react-icons/fa'; // Import FaClipboardList for applications icon

import { Navbar } from "@/components/ui/Navbar";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React, { useState, useMemo } from 'react';

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
import { Toaster, toast } from 'sonner';

// --- Interfaces ---
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
  createdBy: number; // This column should store the ID of the user who created the tender
  createdAt: string;
  updatedAt: string;
  // NEW: Add applicationCount field, assuming your backend provides this
  applicationCount?: number;
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
  id?: number; // Primary ID of the user from the DB
  userId?: number; // ID from JWT payload if different from 'id'
  name?: string; // Display name if available
  username?: string; // Display username if available
  email: string;
  fullName?: string; // As used in previous discussions for display name
}

interface TendersPageProps {
  tenders: Tender[];
  userName: string;
  error?: string;
  loggedInUserId?: number; // Pass the logged-in user's ID to the component
}
// --- End Interfaces ---


export default function TendersPage({ tenders: initialTenders, userName, error }: TendersPageProps) {
  const router = useRouter();
  const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [minBudget, setMinBudget] = useState<string>('');
  const [maxBudget, setMaxBudget] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tenderToDelete, setTenderToDelete] = useState<{ id: number; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [tenders, setTenders] = useState<Tender[]>(initialTenders);

  // This useMemo is for client-side filtering.
  // For filters to persist on page refresh/direct URL access, they need to be passed
  // as query parameters to getServerSideProps via router.push in a handleChange function.
  const filteredTenders = useMemo(() => {
    return tenders.filter(tender => {
      const matchesSearch = searchTerm === '' ||
                            tender.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            tender.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'All' || tender.status === filterStatus;

      const budgetNum = tender.budget;
      const minBudgetNum = parseFloat(minBudget);
      const maxBudgetNum = parseFloat(maxBudget);

      const matchesMinBudget = isNaN(minBudgetNum) || budgetNum >= minBudgetNum;
      const matchesMaxBudget = isNaN(maxBudgetNum) || budgetNum <= maxBudgetNum;

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

      return matchesSearch && matchesStatus && matchesMinBudget && matchesMaxBudget && matchesStartDate && matchesEndDate;
    });
  }, [tenders, searchTerm, filterStatus, minBudget, maxBudget, startDate, endDate]);

  const handleEditClick = (tender: Tender) => {
    setSelectedTender(tender);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedTender(null);
  };

  const handleSaveTender = (updatedTender: Tender) => {
    setTenders(prevTenders =>
      prevTenders.map(t => (t.id === updatedTender.id ? updatedTender : t))
    );
  };

  const openDeleteDialog = (tenderId: number, tenderTitle: string) => {
    setTenderToDelete({ id: tenderId, title: tenderTitle });
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleting(false); // Reset deleting state on dialog close
    setIsDeleteDialogOpen(false);
    setTenderToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!tenderToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/tenders/${tenderToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete tender');
      }

      setTenders(prevTenders => prevTenders.filter(tender => tender.id !== tenderToDelete.id));
      toast.success("Tender deleted successfully!");
      closeDeleteDialog();
    } catch (error: any) {
      console.error("Error deleting tender:", error);
      toast.error(error.message || "Failed to delete tender. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // NEW: Function to navigate to applications page for a specific tender
  const handleViewApplications = (tenderId: number) => {
    console.log("view application handler fired");

    router.push(`/applications/${tenderId}`);
  };

  // NEW: Handler for the wrapper, to show toast when button is disabled
  const handleWrapperClick = (tender: Tender) => {
    if ((tender.applicationCount ?? 0) === 0) {
      toast.info("This tender has no applications yet."); // Or "No applications to view."
      return; // Prevent navigation
    }
    // If not disabled, proceed with actual navigation
    handleViewApplications(tender.id);
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
      <Toaster richColors position="top-right" />

      <div className="min-h-screen bg-background text-foreground py-8 px-4">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">My Tenders</h1> {/* Title changed to "My Tenders" */}
            <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
          </div>

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

          {filteredTenders.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-lg text-muted-foreground">No tenders found matching your criteria.</p>
              <p className="text-sm text-gray-500">
                You might need to create new tenders or adjust your filters.
              </p>
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

                    {/* Display Application Count with refined styling */}
                    <div className="flex items-center text-sm text-gray-600 gap-2 mt-2">
                      <FaClipboardList className="text-base text-blue-600 dark:text-blue-400" />
                      <span className="font-semibold text-gray-800 dark:text-gray-200">Applications:</span>
                      <Badge variant="secondary" className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {tender.applicationCount ?? 0}
                      </Badge>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                      {/* View Applications Button - MODIFIED WITH WRAPPER AND TOAST LOGIC */}
                      <span
                        onClick={() => handleWrapperClick(tender)}
                        // Ensure the span behaves like an inline-block for proper sizing and event capture
                        style={{ display: 'inline-block', cursor: (tender.applicationCount ?? 0) === 0 ? 'not-allowed' : 'pointer' }}
                        title={(tender.applicationCount ?? 0) === 0 ? "No applications received yet" : ""} // Tooltip for disabled state
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-500 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-600 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-gray-800 dark:hover:text-blue-300 dark:hover:border-blue-300 transition-colors duration-200"
                          // Keep the disabled prop on the button for visual styling
                          disabled={(tender.applicationCount ?? 0) === 0}
                          // Remove the direct onClick from the Button component
                          // onClick={() => handleViewApplications(tender.id)}
                        >
                          <FaClipboardList className="mr-2" /> View Applications
                        </Button>
                      </span>

                      {/* Edit Button - Hover Effect */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-50 transition-colors duration-200"
                        onClick={() => handleEditClick(tender)}
                      >
                        <FaEdit className="mr-2" /> Edit
                      </Button>

                      {/* Delete Button - Hover Effect */}
                      <Button
                        variant="destructive"
                        size="sm"
                        className="hover:bg-red-700 dark:hover:bg-red-700 transition-colors duration-200"
                        onClick={() => openDeleteDialog(tender.id, tender.title)}
                        disabled={isDeleting}
                      >
                        <FaTrash className="mr-2" /> {isDeleting ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <EditTenderDialog
        isOpen={isEditDialogOpen}
        onClose={handleCloseEditDialog}
        tender={selectedTender}
        onSave={handleSaveTender}
        onDelete={() => { /* no-op or handle if dialog could trigger delete */ }}
      />

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
    </>
  );
}

// Data fetching for the tenders page (MODIFIED FOR "MY TENDERS")
export const getServerSideProps: GetServerSideProps<TendersPageProps> = async (context) => {
  const cookie = context.req.headers.cookie || '';
  const { query } = context;
  const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  let userName: string = 'User';
  let loggedInUserId: number | undefined;

  try {
    // --- 1. Fetch User Info to get loggedInUserId ---
    const userRes = await fetch(`${BACKEND_BASE_URL}/api/auth/me`, {
      headers: { Cookie: cookie },
    });

    if (!userRes.ok) {
      console.error("User fetch failed for My Tenders page:", userRes.status);
      if (userRes.status === 401) {
        return { redirect: { destination: '/auth/login', permanent: false } };
      }
      const rawErrorText = await userRes.text();
      let errorMessage = "Failed to load user information for My Tenders.";
      try { const errorData = JSON.parse(rawErrorText); errorMessage = errorData.message || errorMessage; } catch (jsonParseError) { /* ... */ }
      return { props: { tenders: [], userName: 'User', error: errorMessage } };
    }

    const userData: UserApiResponse = await userRes.json();
    userName = userData.fullName || userData.name || userData.username || userData.email || 'User';
    loggedInUserId = userData.userId || userData.id;

    if (!loggedInUserId) {
      console.warn("Logged-in User ID not found in user info. Cannot filter My Tenders.");
      return { props: { tenders: [], userName, error: "Logged-in user ID not available to filter tenders." } };
    }

  } catch (error: any) {
    console.error("Error in getServerSideProps (My Tenders page - user fetch):", error);
    return { props: { tenders: [], userName: 'User', error: error.message || "Failed to connect to backend for user info." } };
  }

  // --- 2. Fetch Tenders created by the loggedInUserId from the DEDICATED endpoint ---
  let tenders: Tender[] = [];
  try {
    const queryParams = new URLSearchParams();

    // If your backend supports pagination for /api/tenders/my, include these:
    queryParams.append('limit', (query.limit as string) || '10');
    queryParams.append('page', (query.page as string) || '1');


    const apiUrl = `${BACKEND_BASE_URL}/api/tenders/my?${queryParams.toString()}`;

    console.log('FRONTEND DEBUG: My Tenders API URL:', apiUrl);

    const tendersRes = await fetch(apiUrl, {
      headers: {
        Cookie: cookie,
      },
    });

    if (!tendersRes.ok) {
      const errorData = await tendersRes.json();
      console.error("Failed to fetch My Tenders:", tendersRes.status, errorData);
      return {
        props: {
          tenders: [],
          userName,
          loggedInUserId, // ensure it's passed on error too
          error: errorData.message || `Failed to load your tenders: ${tendersRes.statusText}`,
        },
      };
    }

    const tendersApiResponse: TendersApiResponse = await tendersRes.json();
    tenders = tendersApiResponse.tenders;

  } catch (error: any) {
    console.error("Error in getServerSideProps (My Tenders page - tenders fetch):", error);
    return {
      props: {
        tenders: [],
        userName,
        loggedInUserId, // ensure it's passed on error too
        error: error.message || "An unexpected error occurred while fetching your tenders.",
      },
    };
  }

  return {
    props: {
      tenders,
      userName,
      loggedInUserId,
    },
  };
};