// File: src/pages/dashboard/index.tsx

import { GetServerSideProps } from "next";
import { parseCookies } from "nookies";
import { useRouter } from "next/router";
import defaultImage from "../../../public/default-avatar.png"
import Image from "next/image"; // <--- ENSURE THIS LINE IS PRESENT
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useRef,useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/ui/Navbar";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateTenderDialog } from "@/components/CreateTenderDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import toast, { Toaster } from "react-hot-toast";

// Interfaces for detailed company data
interface GoodsService {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
}

interface CompanyDetails {
  id: number;
  name: string;
  industry: string;
  description: string;
  logoUrl: string | null; // Can be null if no logo is set
  goodsServices: GoodsService[];
}

interface DashboardProps {
  userName: string;
  companyDetails: CompanyDetails | null;
  stats: {
    tenders: number;
    submitted: number;
    received: number;
    accepted: number;
  };
  tendersOverTime: { date: string; count: number }[];
  appStatusData: { status: string; count: number }[];
  profilePictureUrl: string | null;
  // ⭐ Add setCompanyDetails to DashboardProps as it will be passed down ⭐
  setCompanyDetails: React.Dispatch<
    React.SetStateAction<CompanyDetails | null>
  >;
}

type CompanyOption = { id: number; name: string };

const STATUS_COLORS: Record<string, string> = {
  pending: "#facc15",
  accepted: "#22c55e",
  rejected: "#ef4444",
};

export default function Dashboard({
  userName,
  companyDetails,
  stats,
  tendersOverTime,
  appStatusData,
  profilePictureUrl,
  setCompanyDetails,
  initialToken, // ⭐ Destructure setCompanyDetails prop here ⭐
}: DashboardProps) {
  const router = useRouter();
  const [groupBy, setGroupBy] = useState<"month" | "year">("month");
  const [showJoinModal, setShowJoinModal] = useState(false);

  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyIndustry, setNewCompanyIndustry] = useState("");
  const [newCompanyDescription, setNewCompanyDescription] = useState("");
  const [newCompanyGoodsServices, setNewCompanyGoodsServices] = useState<
    string[]
  >([]);
  const [currentGoodsServiceInput, setCurrentGoodsServiceInput] = useState("");
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [selectedExistingCompanyId, setSelectedExistingCompanyId] =
    useState<string>("");
  const [companiesOptions, setCompaniesOptions] = useState<CompanyOption[]>([]);

  const [selectedExistingCompanyIdError, setSelectedExistingCompanyIdError] =
    useState("");
  const [newCompanyNameError, setNewCompanyNameError] = useState("");
  const [newCompanyIndustryError, setNewCompanyIndustryError] = useState("");
  const [newCompanyDescriptionError, setNewCompanyDescriptionError] =
    useState("");
  const [companyLogoFileError, setNewCompanyLogoFileError] = useState("");

  const [activeTab, setActiveTab] = useState<"existing" | "new">("existing");

  const [showProfilePictureEditModal, setShowProfilePictureEditModal] =
    useState(false);
  const [tempProfilePictureFile, setTempProfilePictureFile] =
    useState<File | null>(null); // To hold the newly selected file temporarily
  const [tempProfilePicturePreview, setTempProfilePicturePreview] =
    useState(profilePictureUrl); // To show a preview of the new image

  // ⭐ NEW STATE FOR COMPANY LOGO EDIT ⭐
  const [showCompanyLogoEditModal, setShowCompanyLogoEditModal] =
    useState(false);
  const [tempCompanyLogoFile, setTempCompanyLogoFile] = useState<File | null>(
    null
  );
  // Initialize preview with current logo or a default placeholder
  const [tempCompanyLogoPreview, setTempCompanyLogoPreview] = useState(
    companyDetails?.logoUrl || "/default-company-logo.png"
  );
  // ... (existing useState calls, e.g., for groupBy)
  const [showCreateTenderModal, setShowCreateTenderModal] = useState(false); // ADD THIS LINE

  console.log("companyDetails (frontend):", companyDetails);
  if (companyDetails && companyDetails.goodsServices) {
    console.log(
      "companyDetails.goodsServices (frontend stringified):",
      JSON.stringify(companyDetails.goodsServices, null, 2)
    );
    console.log(
      "companyDetails.goodsServices.length (frontend):",
      companyDetails.goodsServices.length
    );
  }

  const addGoodsService = () => {
    const trimmedInput = currentGoodsServiceInput.trim();
    if (trimmedInput && !newCompanyGoodsServices.includes(trimmedInput)) {
      setNewCompanyGoodsServices((prev) => [...prev, trimmedInput]);
      setCurrentGoodsServiceInput("");
    }
  };

  const removeGoodsService = (serviceToRemove: string) => {
    setNewCompanyGoodsServices((prev) =>
      prev.filter((service) => service !== serviceToRemove)
    );
  };

  useEffect(() => {
    async function fetchCompaniesForSelect() {
      try {
        const token = parseCookies().jwt;
        const res = await fetch("http://localhost:5000/api/companies/select", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setCompaniesOptions(data.companies);
        } else {
          console.error(
            "Failed to fetch companies for select:",
            await res.json()
          );
        }
      } catch (err) {
        console.error("Error fetching companies for select:", err);
      }
    }

    if (showJoinModal && companiesOptions.length === 0) {
      fetchCompaniesForSelect();
    }
  }, [showJoinModal, companiesOptions.length]);

  // ⭐ NEW useEffect for Company Logo Preview Sync and Cleanup ⭐
  useEffect(() => {
    if (companyDetails?.logoUrl && !tempCompanyLogoFile) {
      setTempCompanyLogoPreview(companyDetails.logoUrl);
    }
    // Cleanup temporary object URL when component unmounts or state changes
    return () => {
      if (tempCompanyLogoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(tempCompanyLogoPreview);
      }
    };
  }, [companyDetails?.logoUrl, tempCompanyLogoFile, tempCompanyLogoPreview]); // Added tempCompanyLogoPreview to dependencies for cleanup
  
  const shownWelcomeRef = useRef(false);


  useEffect(() => {
    if (
      userName &&
      !shownWelcomeRef.current &&
      !sessionStorage.getItem("welcomeToastShown")
    ) {
      toast.success(`Welcome, ${userName}!`);
      shownWelcomeRef.current = true;
      sessionStorage.setItem("welcomeToastShown", "true");
    }
  }, [userName]);


  

  const formattedData = tendersOverTime.map((item) => ({
    ...item,
    date:
      groupBy === "year"
        ? new Date(item.date).getFullYear().toString()
        : new Date(item.date).toLocaleString("default", { month: "short" }),
  }));
  const refreshDashboardData = async () => {
    // This tells Next.js to re-run getServerSideProps for the current page
    // and re-render the component with fresh data.
    router.replace(router.asPath);
  };
  const handleJoinCompany = async () => {
    setSelectedExistingCompanyIdError("");
    setNewCompanyNameError("");
    setNewCompanyIndustryError("");
    setNewCompanyDescriptionError("");
    setNewCompanyLogoFileError("");

    let isValid = true;
    let payload: Record<string, any> | FormData;
    let endpoint = "http://localhost:5000/api/";

    if (activeTab === "existing") {
      if (!selectedExistingCompanyId) {
        setSelectedExistingCompanyIdError("Please select a company.");
        isValid = false;
      } else {
        payload = { companyId: Number(selectedExistingCompanyId) };
        endpoint += "auth/join-company";
      }
    } else {
      if (!newCompanyName.trim()) {
        setNewCompanyNameError("Company name is required.");
        isValid = false;
      }
      if (!newCompanyIndustry.trim()) {
        setNewCompanyIndustryError("Industry is required.");
        isValid = false;
      }
      if (!newCompanyDescription.trim()) {
        setNewCompanyDescriptionError("Description is required.");
        isValid = false;
      }

      if (companyLogoFile) {
        const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
        const maxSize = 2 * 1024 * 1024;

        if (!allowedTypes.includes(companyLogoFile.type)) {
          setNewCompanyLogoFileError(
            "Invalid file type. Only JPG, PNG, GIF are allowed."
          );
          isValid = false;
        }
        if (companyLogoFile.size > maxSize) {
          setNewCompanyLogoFileError("File size exceeds 2MB limit.");
          isValid = false;
        }
      }

      if (isValid) {
        const formData = new FormData();
        formData.append("name", newCompanyName.trim());
        formData.append("industry", newCompanyIndustry.trim());
        formData.append("description", newCompanyDescription.trim());
        formData.append(
          "goodsServices",
          JSON.stringify(newCompanyGoodsServices)
        );
        if (companyLogoFile) {
          formData.append("logo", companyLogoFile);
        }
        payload = formData;
        endpoint += "companies/create";
      }
    }

    if (!isValid) {
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers:
          activeTab === "existing"
            ? { "Content-Type": "application/json" }
            : {},
        body: activeTab === "existing" ? JSON.stringify(payload) : payload,
        credentials: "include",
      });

      const result = await res.json();

      if (res.ok) {
        router.reload(); // Consider refetching data instead of full reload
        setShowJoinModal(false);
        setNewCompanyName("");
        setNewCompanyIndustry("");
        setNewCompanyDescription("");
        setNewCompanyGoodsServices([]);
        setCurrentGoodsServiceInput("");
        setCompanyLogoFile(null);
        setSelectedExistingCompanyId("");
        setSelectedExistingCompanyIdError("");
        setNewCompanyNameError("");
        setNewCompanyIndustryError("");
        setNewCompanyDescriptionError("");
        setNewCompanyLogoFileError("");
        setActiveTab("existing");
      } else {
        console.error("Failed company action:", result.message);
        toast.error(result.message || "Failed to complete company action.");
      }
    } catch (error) {
      console.error("Error during company action:", error);
      toast.error(
        "An error occurred while trying to complete the company action."
      );
    }
  };

  const CustomPieTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div
        style={{
          background: "#18181b",
          border: "1px solid #333",
          borderRadius: 6,
          color: "white",
          padding: 8,
          fontSize: 14,
          minWidth: 100,
        }}
      >
        {`${payload[0].name} : ${payload[0].value}`}
      </div>
    );
  };
  

  // The rest of your component's JSX will go here, including the new Dialog.
  // This part will be provided in the next step.
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar userName={userName} />
      <Toaster position="top-right" />

      <main className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {companyDetails ? (
            <Card className="w-full md:w-5/6 shadow-md rounded-lg">
              {" "}
              {/* Adjusted width here */}
              <CardContent className="space-y-4 p-6">
                {/* NEW FLEX CONTAINER FOR PROFILE PIC AND DETAILS GRID */}
                <div className="flex flex-col sm:flex-row items-start gap-6 mb-4">
                  {/* Profile Picture - make this container responsible for centering its content */}
                  <div className="flex flex-col items-center flex-shrink-0 w-full sm:w-auto relative">
                    {" "}
                    {/* ADD 'relative' here */}{" "}
                    {/* Added flex-col items-center, w-full/sm:w-auto */}
                    <Image
                      src={profilePictureUrl || "/default-avatar.png"}
                      alt={`${userName}'s Profile Photo`}
                      width={100} 
                      height={100}
                      className="object-cover border-2 border-primary rounded-full p-1" // Change this class string
                    />
                    <button
                      onClick={() => setShowProfilePictureEditModal(true)} // Open the new modal
                      className="absolute bottom-0 right-0 bg-muted rounded-full p-2 shadow-md hover:bg-muted-foreground/20"
                    >
                      {/* SVG for a pencil/edit icon */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-foreground"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                  </div>
                  {/* Profile Picture Edit Dialog */}
                  <Dialog
                    open={showProfilePictureEditModal}
                    onOpenChange={(open) => {
                      setShowProfilePictureEditModal(open);
                      if (!open) {
                        setTempProfilePictureFile(null);
                        // Revert preview to the original profilePictureUrl prop when modal closes
                        setTempProfilePicturePreview(profilePictureUrl);
                      }
                    }}
                  >
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Profile Picture</DialogTitle>
                        <DialogDescription>
                          Upload a new image for your profile picture.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex justify-center mb-4">
                          <Image
                            src={
                              tempProfilePicturePreview || "/default-avatar.png"
                            } // Fallback to default
                            alt="New Profile Picture Preview"
                            width={120}
                            height={120}
                            className="object-cover border-2 border-primary rounded-full p-1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="profilePictureInput">
                            Upload New Picture
                          </Label>
                          <Input
                            id="profilePictureInput"
                            type="file"
                            accept="image/jpeg,image/png,image/gif"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                setTempProfilePictureFile(file);
                                setTempProfilePicturePreview(
                                  URL.createObjectURL(file)
                                );
                              } else {
                                setTempProfilePictureFile(null);
                                setTempProfilePicturePreview(profilePictureUrl); // Revert to original if no file selected
                              }
                            }}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={async () => {
                            if (tempProfilePictureFile) {
                              setIsUploading(true);
                              try {
                                const formData = new FormData();
                                formData.append(
                                  "profilePicture",
                                  tempProfilePictureFile
                                ); // 'profilePicture' must match backend field

                                // Get your auth token

                                console.log(
                                  "profile_update token",
                                  initialToken
                                );

                                const response = await fetch(
                                  `http://localhost:5000/api/companies/${companyDetails.id}/logo`,
                                  {
                                    // Adjust API endpoint if different
                                    method: "PUT",
                                    headers: {
                                      Authorization: `Bearer ${initialToken}`,
                                    },
                                    body: formData,
                                  }
                                );

                                if (!response.ok) {
                                  const errorData = await response.json();
                                  console.error(
                                    "Profile picture update error from backend:",
                                    errorData
                                  );
                                  throw new Error(
                                    errorData.message ||
                                      "Failed to update profile picture"
                                  );
                                }

                                const result = await response.json();

                                // Since profilePictureUrl is a prop, you should trigger a reload
                                // or ensure your parent component or data fetching mechanism
                                // updates the 'profilePictureUrl' prop after a successful save.
                                // For now, a full reload is the simplest way to see the change.
                                // If you have a state management system (Context, Redux), update that.
                                router.reload(); // Re-fetch the page data which will get the new prop value

                                setShowProfilePictureEditModal(false);
                                setTempProfilePictureFile(null);

                                // Clean up the temporary object URL
                                if (
                                  tempProfilePicturePreview &&
                                  tempProfilePicturePreview.startsWith("blob:")
                                ) {
                                  URL.revokeObjectURL(
                                    tempProfilePicturePreview
                                  );
                                }

                                toast.success(
                                  "Profile picture updated successfully!"
                                );
                              } catch (error: any) {
                                // Use 'any' or define error type if not already
                                console.error(
                                  "Error uploading profile picture:",
                                  error
                                );
                                toast.error(
                                  error.message ||
                                    "Failed to update profile picture."
                                );
                              }
                              finally {
                                setIsUploading(false);
                              }
                            } else {
                              setShowProfilePictureEditModal(false);
                            }
                          }}
                          disabled={!tempProfilePictureFile||isUploading}
                        >
                          {isUploading ? "Uploading..." : "Save Changes"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowProfilePictureEditModal(false)}
                        >
                          Cancel
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {/* NEW: Create Tender Dialog */}
                  <CreateTenderDialog
                    open={showCreateTenderModal} // Pass the state to control visibility
                    onOpenChange={setShowCreateTenderModal} // Pass the setter to allow dialog to close itself
                    onTenderCreated={refreshDashboardData} // Pass the function to refresh dashboard data on success
                  />
                  {/* Your existing grid content for user name, company name, etc. - now inside flex-grow */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 items-start flex-grow">
                    {/* User Name */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        User Name
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {userName}
                      </p>
                    </div>

                    {/* Company Name */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Company Name
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {companyDetails.name}
                      </p>
                    </div>

                    {/* Industry */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Industry
                      </p>
                      <p className="text-sm text-foreground">
                        {companyDetails.industry}
                      </p>
                    </div>

                    {/* Description */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Description
                      </p>
                      <p className="text-sm text-foreground">
                        {companyDetails.description}
                      </p>
                    </div>

                    {/* Services Provided - NOW INSIDE THE GRID */}
                    {companyDetails.goodsServices &&
                      companyDetails.goodsServices.length > 0 && (
                        <div className="md:col-span-2">
                          <p className="text-xs text-muted-foreground mb-2">
                            Services Provided
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {companyDetails.goodsServices.map((service) => (
                              <span
                                key={service.id}
                                className="inline-flex items-center rounded-full border border-gray-300 bg-gray-200 px-3 py-0.5 text-sm font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-300"
                              >
                                {service.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>{" "}
                {/* END of NEW FLEX CONTAINER for Profile Pic and Details Grid */}
              </CardContent>
            </Card>
          ) : (
            <div className="w-full md:flex-1 p-6 bg-card text-card-foreground rounded-lg shadow-md flex flex-col items-center justify-center text-center space-y-4">
              <h2 className="text-xl font-bold">Get Started!</h2>
              <p className="text-muted-foreground">
                It looks like you haven't joined a company yet.
              </p>
              <p className="text-muted-foreground">
                Join an existing one or create a new company to get started with
                tenders.
              </p>
            </div>
          )}

          {/* Quick Actions Menu */}
          {companyDetails && (
            <Card className="w-full md:w-1/6 shadow-md rounded-lg p-4">
              {" "}
              {/* Added a card for quick actions */}
              <CardContent className="p-0 space-y-4">
                {" "}
                {/* Removed default padding, added space between elements */}
                <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
                <Button
                  onClick={() => setShowCreateTenderModal(true)} // CHANGE THIS LINE
                  className="w-full"
                >
                  Create Tender
                </Button>
                <Button
                  onClick={() => router.push("/tenders")}
                  className="w-full"
                  variant="outline"
                >
                  {" "}
                  {/* Assuming /tenders is the route for viewing tenders */}
                  View Tenders
                </Button>
              </CardContent>
            </Card>
          )}

          {!companyDetails && (
            <Dialog
              open={showJoinModal}
              onOpenChange={(open) => {
                setShowJoinModal(open);
                if (!open) {
                  setNewCompanyName("");
                  setNewCompanyIndustry("");
                  setNewCompanyDescription("");
                  setNewCompanyGoodsServices([]);
                  setCurrentGoodsServiceInput("");
                  setCompanyLogoFile(null);
                  setSelectedExistingCompanyId("");
                  setSelectedExistingCompanyIdError("");
                  setNewCompanyNameError("");
                  setNewCompanyIndustryError("");
                  setNewCompanyDescriptionError("");
                  setNewCompanyLogoFileError("");
                  setActiveTab("existing");
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  onClick={() => setShowJoinModal(true)}
                  className="w-full md:w-auto"
                >
                  Join Company
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join or Create a Company</DialogTitle>
                  <DialogDescription>
                    Choose to join an existing company or provide details to
                    create/join a new one.
                  </DialogDescription>
                </DialogHeader>

                <Tabs
                  defaultValue="existing"
                  className="w-full"
                  onValueChange={(value: "existing" | "new") => {
                    setActiveTab(value);
                    setNewCompanyName("");
                    setNewCompanyIndustry("");
                    setNewCompanyDescription("");
                    setNewCompanyGoodsServices([]);
                    setCurrentGoodsServiceInput("");
                    setCompanyLogoFile(null);
                    setSelectedExistingCompanyId("");
                    setSelectedExistingCompanyIdError("");
                    setNewCompanyNameError("");
                    setNewCompanyIndustryError("");
                    setNewCompanyDescriptionError("");
                    setNewCompanyLogoFileError("");
                  }}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="existing">Join Existing</TabsTrigger>
                    <TabsTrigger value="new">Create/Join New</TabsTrigger>
                  </TabsList>
                  <TabsContent value="existing" className="pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="existingCompanySelect">
                        Select Company
                      </Label>
                      <Select
                        value={selectedExistingCompanyId}
                        onValueChange={(value) => {
                          setSelectedExistingCompanyId(value);
                          setSelectedExistingCompanyIdError("");
                        }}
                      >
                        <SelectTrigger id="existingCompanySelect">
                          <SelectValue placeholder="Select an existing company" />
                        </SelectTrigger>
                        <SelectContent>
                          {companiesOptions.length === 0 ? (
                            <SelectItem value="no-companies" disabled>
                              No companies available
                            </SelectItem>
                          ) : (
                            companiesOptions.map((company) => (
                              <SelectItem
                                key={company.id}
                                value={String(company.id)}
                              >
                                {company.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {selectedExistingCompanyIdError && (
                        <p className="text-red-500 text-sm mt-1">
                          {selectedExistingCompanyIdError}
                        </p>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="new" className="pt-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="newCompanyNameInput">
                          Company Name
                        </Label>
                        <Input
                          id="newCompanyNameInput"
                          placeholder="Enter company name"
                          value={newCompanyName}
                          onChange={(e) => {
                            setNewCompanyName(e.target.value);
                            setNewCompanyNameError("");
                          }}
                        />
                        {newCompanyNameError && (
                          <p className="text-red-500 text-sm mt-1">
                            {newCompanyNameError}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newCompanyIndustryInput">
                          Industry
                        </Label>
                        <Input
                          id="newCompanyIndustryInput"
                          placeholder="e.g., Technology, Construction"
                          value={newCompanyIndustry}
                          onChange={(e) => {
                            setNewCompanyIndustry(e.target.value);
                            setNewCompanyIndustryError("");
                          }}
                        />
                        {newCompanyIndustryError && (
                          <p className="text-red-500 text-sm mt-1">
                            {newCompanyIndustryError}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newCompanyDescriptionInput">
                          Description
                        </Label>
                        <Textarea
                          id="newCompanyDescriptionInput"
                          placeholder="Brief description of the company"
                          value={newCompanyDescription}
                          onChange={(e) => {
                            setNewCompanyDescription(e.target.value);
                            setNewCompanyDescriptionError("");
                          }}
                        />
                        {newCompanyDescriptionError && (
                          <p className="text-red-500 text-sm mt-1">
                            {newCompanyDescriptionError}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="goodsServicesInput">
                          Goods & Services (e.g., HVAC installation)
                        </Label>
                        <div className="flex space-x-2">
                          <Input
                            id="goodsServicesInput"
                            placeholder="Add a good or service"
                            value={currentGoodsServiceInput}
                            onChange={(e) =>
                              setCurrentGoodsServiceInput(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addGoodsService();
                              }
                            }}
                            className="flex-grow"
                          />
                          <Button type="button" onClick={addGoodsService}>
                            Add
                          </Button>
                        </div>
                        {newCompanyGoodsServices.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2 p-2 border rounded-md bg-muted/20">
                            {newCompanyGoodsServices.map((service, index) => (
                              <span
                                key={index}
                                className="flex items-center bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm"
                              >
                                {service}
                                <button
                                  type="button"
                                  onClick={() => removeGoodsService(service)}
                                  className="ml-2 text-primary-foreground/70 hover:text-primary-foreground focus:outline-none"
                                >
                                  &times;
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="companyLogoInput">
                          Company Logo (Optional)
                        </Label>
                        <Input
                          id="companyLogoInput"
                          type="file"
                          accept="image/jpeg,image/png,image/gif"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setCompanyLogoFile(e.target.files[0]);
                              setNewCompanyLogoFileError("");
                            } else {
                              setCompanyLogoFile(null);
                            }
                          }}
                        />
                        {companyLogoFileError && (
                          <p className="text-red-500 text-sm mt-1">
                            {companyLogoFileError}
                          </p>
                        )}
                        {companyLogoFile && (
                          <p className="text-muted-foreground text-sm">
                            Selected: {companyLogoFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter>
                  <Button type="submit" onClick={handleJoinCompany}>
                    {activeTab === "existing"
                      ? "Join Selected Company"
                      : "Create/Join Company"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowJoinModal(false)}
                  >
                    Cancel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats).map(([key, value]) => (
            <Card
              key={key}
              className="h-[60px] px-2 flex items-center justify-center bg-muted text-foreground shadow-sm rounded-lg"
            >
              <CardContent className="p-0 flex items-center justify-center w-full h-full">
                <div className="text-center text-base md:text-lg font-semibold capitalize w-full">
                  {key}: <span className="text-primary">{value}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="rounded-lg">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold">Tenders Over Time</h2>
                <div className="flex gap-2">
                  <Button
                    variant={groupBy === "month" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGroupBy("month")}
                    className="rounded-md"
                  >
                    Monthly
                  </Button>
                  <Button
                    variant={groupBy === "year" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGroupBy("year")}
                    className="rounded-md"
                  >
                    Yearly
                  </Button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={formattedData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #333",
                      borderRadius: "6px",
                      color: "white",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-2">Application Status</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={appStatusData}
                    dataKey="count"
                    nameKey="status"
                    outerRadius={80}
                    label
                  >
                    {appStatusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[entry.status]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

// Server-side props for data fetching
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const cookies = parseCookies(ctx);
  const token = cookies.jwt;

  if (!token) {
    return {
      redirect: { destination: "/auth/login", permanent: false },
    };
  }

  try {
    const res = await fetch("http://localhost:5000/api/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error(
        "Dashboard API response not OK:",
        res.status,
        await res.text()
      );
      return {
        redirect: { destination: "/auth/login", permanent: false },
      };
    }

    const data = await res.json();

    console.log(
      "🚀 Dashboard API Response Data:",
      JSON.stringify(data, null, 2)
    );

    return {
      props: {
        userName: data.user.name,
        companyDetails: data.company || null,
        stats: data.stats,
        tendersOverTime: data.tendersOverTime,
        appStatusData: data.appStatusData,
        profilePictureUrl:
      data.company && data.company.logoUrl
        ? data.company.logoUrl
        : "/default-avatar.png",
        initialToken: token,
      },
    };
  } catch (err) {
    console.error("Dashboard getServerSideProps error:", err);
    return {
      redirect: { destination: "/auth/login", permanent: false },
    };
  }
};
