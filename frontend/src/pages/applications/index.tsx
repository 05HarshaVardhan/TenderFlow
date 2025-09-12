//frontend/src/pages/applications/index.tsx
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils"; // Utility for className merge (optional)

interface Application {
  id: number;
  status: string;
  quotationAmount: number;
  proposalText: string;
  createdAt: string;
  tender?: {
    title: string;
  };
}

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function ApplicationsPage() {
  const router = useRouter();

  const [applications, setApplications] = useState<Application[]>([]);
  const [status, setStatus] = useState("All");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const searchDebounce = useRef<NodeJS.Timeout | null>(null);

  const fetchApplications = async () => {
    const params = new URLSearchParams();
    if (status !== "All") params.append("status", status);
    if (minAmount) params.append("minQuotation", minAmount);
    if (maxAmount) params.append("maxQuotation", maxAmount);
    if (fromDate) params.append("fromDate", fromDate);
    if (toDate) params.append("toDate", toDate);
    if (search) params.append("search", search);

    try {
      setLoading(true);
      const res = await fetch(
        `${BACKEND_BASE_URL}/api/applications/my/status?${params.toString()}`,
        { credentials: "include" }
      );
      const data = await res.json();
      setApplications(data.applications);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line
  }, [status, minAmount, maxAmount, fromDate, toDate]);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(fetchApplications, 500);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
    // eslint-disable-next-line
  }, [search]);

  return (
    <div className="max-w-6xl mx-auto min-h-screen p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Applications</h1>
        <Button
          variant="secondary"
          className="rounded-lg"
          onClick={() => router.push("/dashboard")}
        >
          Back to Dashboard
        </Button>
      </div>
      <Card className="bg-muted/50 rounded-xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="md:col-span-2">
            <Input
              type="text"
              placeholder="Search by proposal or tender title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Input
              type="number"
              placeholder="Min Amount"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Input
              type="number"
              placeholder="Max Amount"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full"
              placeholder="dd-mm-yyyy"
            />
          </div>
          <div>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full"
              placeholder="dd-mm-yyyy"
            />
          </div>
        </div>
      </Card>
      <div className="space-y-6">
        {loading && (
          <div className="text-center text-muted-foreground">
            Loading applications...
          </div>
        )}
        {!loading && applications.length === 0 && (
          <div className="text-center text-muted-foreground">
            No applications found.
          </div>
        )}
        {applications.map((app) => (
          <Card
            key={app.id}
            className="rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6"
          >
            <div className="grow w-full">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-medium">
                  {app.tender?.title || "No Tender"}
                </span>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold ml-2",
                    app.status === "accepted"
                      ? "bg-green-700 text-white"
                      : app.status === "rejected"
                      ? "bg-red-700 text-white"
                      : "bg-yellow-700 text-white"
                  )}
                >
                  {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                </span>
              </div>
              <div className="text-muted-foreground mb-2">
                {app.proposalText}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
                <div>
                  <span className="font-semibold text-sm">Amount: </span>
                  <span>₹{app.quotationAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-semibold text-sm">Submitted:</span>{" "}
                  <span>{format(new Date(app.createdAt), "dd-MMM-yyyy")}</span>
                </div>
                {/* Add more details if needed */}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
