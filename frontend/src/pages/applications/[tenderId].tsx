// src/pages/applications/[tenderId].tsx

import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Navbar } from "@/components/ui/Navbar";
import { Toaster, toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React, { useState } from 'react';
import { FaEye, FaDollarSign, FaFileAlt, FaClock, FaUserTie, FaBuilding } from 'react-icons/fa'; // Added FaBuilding for company in application card

// --- Interfaces (Matching Backend Model Structures) ---
interface Company {
  id: number;
  name: string;
  industry?: string;
  description?: string;
  logoUrl?: string;
}

interface Tender {
  id: number;
  title: string;
  description: string;
  deadline: string;
  budget: number;
  status: 'Active' | 'Expired' | 'Application Closed';
  companyId: number;
  createdAt?: string; // Added for consistency, assuming tender also has this
}

type ApplicationStatus = 'pending' | 'accepted' | 'rejected';

interface Application {
  id: number;
  tenderId: number;
  companyId: number;
  quotationAmount: number;
  proposalText: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  company: Company; // Included Company model (as 'company')
  tender: Tender; // Included Tender model (as 'tender')
}

interface UserApiResponse {
  id?: number;
  userId?: number;
  name?: string;
  username?: string;
  email: string;
  fullName?: string;
}

interface ApplicationsPageProps {
  tender: Tender;
  applications: Application[];
  userName: string;
  error?: string;
}
// --- End Interfaces ---

// Base URL for your backend API (replace with environment variable in production)
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';


export default function TenderApplicationsPage({ tender, applications: initialApplications, userName, error }: ApplicationsPageProps) {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>(initialApplications);
  const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState(false);
  const [selectedApplicationDetails, setSelectedApplicationDetails] = useState<Application | null>(null);

  // Function to re-fetch applications after an action (accept/reject)
  const fetchApplications = async () => {
    const tenderId = router.query.tenderId as string;
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/applications/tender/${tenderId}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials:'include',
      });
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications);
      } else {
        // Attempt to parse JSON error, but fall back to text if not JSON
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await res.json();
          toast.error(errorData.message || "Failed to refresh applications.");
        } else {
          const errorText = await res.text();
          console.error("Non-JSON response for refresh applications:", errorText);
          toast.error(`Failed to refresh applications. Server responded with: ${res.status} ${res.statusText}`);
        }
      }
    } catch (err) {
      console.error("Error re-fetching applications:", err);
      toast.error("Network error while refreshing applications.");
    }
  };

  const handleViewDetailsClick = (application: Application) => {
    setSelectedApplicationDetails(application);
    setIsViewDetailsDialogOpen(true);
  };

  const handleCloseViewDetailsDialog = () => {
    setIsViewDetailsDialogOpen(false);
    setSelectedApplicationDetails(null);
  };

  const handleAcceptApplication = async () => {
    if (!selectedApplicationDetails) return;

    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/applications/${selectedApplicationDetails.id}/accept`, {
        method: 'POST', // Or 'PUT' depending on your API design
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (res.ok) {
        toast.success("Application accepted successfully!");
        handleCloseViewDetailsDialog();
        fetchApplications(); // Re-fetch all applications to reflect status changes
      } else {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await res.json();
          toast.error(errorData.message || "Failed to accept application.");
        } else {
          const errorText = await res.text();
          console.error("Non-JSON response for accept application:", errorText);
          toast.error(`Failed to accept application. Server responded with: ${res.status} ${res.statusText}. Check console for details.`);
          if (res.status === 401) {
            // Potentially redirect to login if unauthorized
            router.push('/auth/login');
          }
        }
      }
    } catch (err) {
      console.error("Error accepting application:", err);
      toast.error("Network error while accepting application.");
    }
  };

  const handleRejectApplication = async () => {
    if (!selectedApplicationDetails) return;

    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/applications/${selectedApplicationDetails.id}/reject`, {
        method: 'PATCH', // Or 'PUT'
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (res.ok) {
        toast.success("Application rejected successfully!");
        handleCloseViewDetailsDialog();
        fetchApplications(); // Re-fetch all applications to reflect status changes
      } else {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await res.json();
          toast.error(errorData.message || "Failed to reject application.");
        } else {
          const errorText = await res.text();
          console.error("Non-JSON response for reject application:", errorText);
          toast.error(`Failed to reject application. Server responded with: ${res.status} ${res.statusText}. Check console for details.`);
          if (res.status === 401) {
            // Potentially redirect to login if unauthorized
            router.push('/auth/login');
          }
        }
      }
    } catch (err) {
      console.error("Error rejecting application:", err);
      toast.error("Network error while rejecting application.");
    }
  };


  if (error) {
    return (
      <>
        <Navbar userName={userName} />
        <div className="container mx-auto p-6 text-red-500">
          <h1 className="text-2xl font-bold mb-4">Error Loading Applications</h1>
          <p>{error}</p>
          <Button onClick={() => router.push('/tenders')} className="mt-4">Back to My Tenders</Button>
        </div>
      </>
    );
  }

  // Handle case where tender details might not be found (e.g., invalid ID or not authorized)
  if (!tender) {
    return (
      <>
        <Navbar userName={userName} />
        <div className="container mx-auto p-6 text-yellow-500">
          <h1 className="text-2xl font-bold mb-4">Tender Not Found</h1>
          <p>The tender you are looking for does not exist or you do not have permission to view its applications.</p>
          <Button onClick={() => router.push('/tenders')} className="mt-4">Back to My Tenders</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar userName={userName} />
      <Toaster richColors position="top-right" />

      <div className="min-h-screen bg-background text-foreground py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              Applications for "{tender.title}"
            </h1>
            <Button onClick={() => router.push('/tenders')} variant="outline">Back to My Tenders</Button>
          </div>

          {/* Tender Details Card (remains the same as it's the context for applications) */}
          <Card className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Tender Details</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">Information about the tender</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                  <FaFileAlt className="text-lg text-primary" />
                  <p><strong>Description:</strong> {tender.description}</p>
              </div>
              <div className="flex items-center gap-2">
                  <FaClock className="text-lg text-primary" />
                  <p><strong>Deadline:</strong> {format(new Date(tender.deadline), "MMM dd, yyyy 'at' hh:mm a")}</p>
              </div>
              <div className="flex items-center gap-2">
                  <FaDollarSign className="text-lg text-primary" />
                  <p><strong>Budget:</strong> ${tender.budget.toLocaleString('en-US')}</p>
              </div>
              <div className="flex items-center gap-2">
                  <Badge variant={tender.status === 'Active' ? 'default' : tender.status === 'Application Closed' ? 'secondary' : 'destructive'}
                          className="px-3 py-1 rounded-full text-sm font-medium">
                      {tender.status}
                  </Badge>
              </div>
            </CardContent>
          </Card>

          <h2 className="text-2xl font-bold mb-5 text-gray-800 dark:text-gray-100">Submitted Applications ({applications.length})</h2>

          {applications.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <p className="text-lg text-gray-600 dark:text-gray-400">No applications received for this tender yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {applications.map((application) => (
                <Card key={application.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                      Application from {application.company?.name || 'Unknown Company'}
                    </CardTitle>
                    <Badge
                      className={`${
                        application.status === 'accepted' ? 'bg-green-500 hover:bg-green-600' :
                        application.status === 'rejected' ? 'bg-red-500 hover:bg-red-600' :
                        'bg-yellow-500 hover:bg-yellow-600'
                      } text-white px-3 py-1 text-sm font-medium rounded-full`}
                    >
                      {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed max-h-24 overflow-hidden text-ellipsis">
                        <span className="font-semibold">Proposal Snippet: </span>{application.proposalText}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2 sm:space-y-0">
                      <div className="flex items-center gap-1">
                          <FaDollarSign className="text-base" />
                          <span>Quotation: <span className="font-semibold text-gray-800 dark:text-gray-200">${application.quotationAmount.toLocaleString('en-US')}</span></span>
                      </div>
                      <div className="flex items-center gap-1">
                          <FaClock className="text-base" />
                          <span>Submitted: {format(new Date(application.createdAt), "MMM dd, yyyy")}</span>
                      </div>
                      {application.company?.industry && (
                        <div className="flex items-center gap-1">
                          <FaBuilding className="text-base" />
                          <span>Industry: <span className="font-semibold text-gray-800 dark:text-gray-200">{application.company.industry}</span></span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200"
                        onClick={() => handleViewDetailsClick(application)}
                      >
                        <FaEye className="mr-2" /> View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detailed View Dialog */}
      <Dialog open={isViewDetailsDialogOpen} onOpenChange={setIsViewDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 rounded-lg shadow-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-gray-100">Application Details</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Full details of the application from <strong>{selectedApplicationDetails?.company?.name || 'Unknown Company'}</strong>
            </DialogDescription>
          </DialogHeader>
          {selectedApplicationDetails && (
            <div className="py-4 space-y-4 text-gray-700 dark:text-gray-300">
              <div className="flex items-start gap-3">
                <FaUserTie className="text-lg mt-1 text-primary" />
                <div>
                  <p className="font-semibold">Company Name:</p>
                  <p>{selectedApplicationDetails.company?.name || 'N/A'}</p>
                </div>
              </div>
              {selectedApplicationDetails.company?.industry && (
                <div className="flex items-start gap-3">
                  <FaBuilding className="text-lg mt-1 text-primary" />
                  <div>
                    <p className="font-semibold">Company Industry:</p>
                    <p>{selectedApplicationDetails.company.industry}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <FaDollarSign className="text-lg mt-1 text-primary" />
                <div>
                  <p className="font-semibold">Quotation Amount:</p>
                  <p>${selectedApplicationDetails.quotationAmount.toLocaleString('en-US')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FaFileAlt className="text-lg mt-1 text-primary" />
                <div>
                  <p className="font-semibold">Full Proposal:</p>
                  <p className="whitespace-pre-wrap">{selectedApplicationDetails.proposalText}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FaClock className="text-lg mt-1 text-primary" />
                <div>
                  <p className="font-semibold">Submitted On:</p>
                  <p>{format(new Date(selectedApplicationDetails.createdAt), "MMM dd, yyyy 'at' hh:mm a")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge
                  className={`${
                    selectedApplicationDetails.status === 'accepted' ? 'bg-green-500' :
                    selectedApplicationDetails.status === 'rejected' ? 'bg-red-500' :
                    'bg-yellow-500'
                  } text-white px-3 py-1 text-sm font-medium rounded-full`}
                >
                  Status: {selectedApplicationDetails.status.charAt(0).toUpperCase() + selectedApplicationDetails.status.slice(1)}
                </Badge>
              </div>
            </div>
          )}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 space-x-2">
            {/* Conditional rendering for Accept/Reject buttons */}
            {selectedApplicationDetails && selectedApplicationDetails.status === 'pending' && (
              <>
                <Button variant="destructive" onClick={handleRejectApplication}>Reject</Button>
                <Button variant="default" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleAcceptApplication}>Accept</Button>
              </>
            )}
            <Button onClick={handleCloseViewDetailsDialog}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- getServerSideProps for Data Fetching ---
export const getServerSideProps: GetServerSideProps<ApplicationsPageProps> = async (context) => {
  const cookie = context.req.headers.cookie || '';
  const { tenderId } = context.params as { tenderId: string };

  let userName: string = 'User';
  let applications: Application[] = [];
  let tender: Tender | null = null;
  let error: string | undefined;

  // 1. Fetch User Info (for Navbar and authentication check)
  try {
    const userRes = await fetch(`${BACKEND_BASE_URL}/api/auth/me`, {
      headers: { Cookie: cookie },
    });

    if (!userRes.ok) {
      console.error("User fetch failed for Tender Applications page:", userRes.status);
      if (userRes.status === 401) {
        return { redirect: { destination: '/auth/login', permanent: false } };
      }
      const rawErrorText = await userRes.text();
      try {
        const errorData = JSON.parse(rawErrorText);
        error = errorData.message || "Failed to load user information.";
      } catch (jsonParseError) {
        error = "Failed to load user information.";
      }
      return { props: { applications: [], tender: null, userName: 'User', error } };
    }

    const userData: UserApiResponse = await userRes.json();
    userName = userData.fullName || userData.name || userData.username || userData.email || 'User';

  } catch (err: any) {
    console.error("Error in getServerSideProps (user fetch):", err);
    return { props: { applications: [], tender: null, userName: 'User', error: err.message || "Failed to connect to backend for user info." } };
  }

  // 2. Fetch Applications for the specific tender
  try {
    const applicationsRes = await fetch(`${BACKEND_BASE_URL}/api/applications/tender/${tenderId}`, {
      headers: { Cookie: cookie },
    });

    if (!applicationsRes.ok) {
      console.error("Failed to fetch applications for tender:", applicationsRes.status);
      const rawErrorText = await applicationsRes.text();
      try {
        const errorData = JSON.parse(rawErrorText);
        error = errorData.message || `Failed to load applications for tender ID: ${tenderId}`;
      } catch (jsonParseError) {
        error = `Failed to load applications for tender ID: ${tenderId}. ${rawErrorText}`;
      }
      return { props: { applications: [], tender: null, userName, error } };
    }

    const applicationsData = await applicationsRes.json();
    applications = applicationsData.applications;

    if (applications.length > 0) {
      tender = applications[0].tender;
    } else {
      const tenderRes = await fetch(`${BACKEND_BASE_URL}/api/tenders/${tenderId}`, {
          headers: { Cookie: cookie },
      });
      if (tenderRes.ok) {
          const tenderData = await tenderRes.json();
          if (tenderData && tenderData.success === true && tenderData.tender) {
            tender = tenderData.tender;
          } else if (tenderData && tenderData.id) {
            tender = tenderData;
          } else {
            tender = null;
          }
      } else {
          console.warn(`Could not fetch tender details for ${tenderId} separately.`);
          error = `Could not load tender details for ID: ${tenderId}. It might not exist or you don't have access.`;
      }
    }


  } catch (err: any) {
    console.error("Error in getServerSideProps (applications fetch):", err);
    error = err.message || "An unexpected error occurred while fetching applications.";
    return { props: { applications: [], tender: null, userName, error } };
  }

  if (!tender) {
    return { props: { applications: [], tender: null, userName, error: error || "Tender details could not be loaded." } };
  }

  return {
    props: {
      applications,
      tender,
      userName,
    },
  };
};
