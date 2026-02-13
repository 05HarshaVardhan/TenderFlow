import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BidSubmissionModal from "@/components/tenders/BidSubmissionModal";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, Calendar, DollarSign, Briefcase, Building2, AlertOctagon } from "lucide-react";
import { toast } from "react-hot-toast";
// Assuming you have a custom hook or context to get the current user's company info
import { useAuth } from "@/context/authContext";

export default function BrowseTenders() {
  const { user } = useAuth(); // Get logged-in user details
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTender, setSelectedTender] = useState(null);
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);

  const handleOpenBidModal = (tender) => {
    // Final safety check: prevent opening if blocked
    if (checkIsWithdrawn(tender)) {
      toast.error("Your company has withdrawn from this tender and cannot re-bid.");
      return;
    }
    setSelectedTender(tender);
    setIsBidModalOpen(true);
  };

  useEffect(() => {
    fetchTenders();
  }, []);

  const fetchTenders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tenders/available'); 
      setTenders(response.data);
    } catch (err) {
      toast.error("Failed to load tenders");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Checks if any bid in the tender's bid array belongs to the 
   * user's company and has a 'WITHDRAWN' status.
   */
  const checkIsWithdrawn = (tender) => {
    if (!user?.companyId || !tender.bids) return false;
    return tender.bids.some(bid => 
      bid.bidderCompany === user.companyId && bid.status === 'WITHDRAWN'
    );
  };

  const filteredTenders = tenders.filter(t => {
    const title = t.title?.toLowerCase() || "";
    const category = t.category?.toLowerCase() || "";
    const search = searchQuery.toLowerCase();
    return title.includes(search) || category.includes(search);
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-zinc-500">Scanning marketplace...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-black min-h-screen text-white space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Browse Tenders</h1>
        <p className="text-zinc-400 font-medium">Find and bid on the latest projects in your industry.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <Input 
            placeholder="Search by title or category..." 
            className="pl-10 bg-zinc-900 border-zinc-800 text-white focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" className="border-zinc-800 hover:bg-zinc-900 w-full md:w-auto text-zinc-300">
          <Filter className="mr-2 h-4 w-4" /> Filters
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTenders.map((tender) => {
          const isWithdrawn = checkIsWithdrawn(tender);

          return (
            <Card key={tender._id} className={`bg-zinc-950 border-zinc-800 transition-all duration-300 group flex flex-col ${isWithdrawn ? 'opacity-75' : 'hover:border-blue-500/50'}`}>
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-none uppercase text-[10px] font-bold">
                    {tender.category || "General"}
                  </Badge>
                  {isWithdrawn && (
                    <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px]">
                      INELIGIBLE
                    </Badge>
                  )}
                </div>
                <CardTitle className={`text-xl transition-colors line-clamp-1 ${isWithdrawn ? 'text-zinc-500' : 'group-hover:text-blue-400'}`}>
                  {tender.title}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4 flex-1">
                <p className="text-zinc-400 text-sm line-clamp-2 min-h-[40px]">
                  {tender.description}
                </p>
                
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                    <span className="font-semibold">
                      Est. Value: ${tender.estimatedValue?.toLocaleString() || "Negotiable"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Deadline: {tender.endDate ? new Date(tender.endDate).toLocaleDateString() : "No Date Set"}
                    </span>
                  </div>
                </div>

                {isWithdrawn && (
                  <div className="mt-4 p-2 bg-red-500/5 border border-red-500/10 rounded flex items-center gap-2 text-[11px] text-red-400">
                    <AlertOctagon className="h-3 w-3" />
                    A previous bid from your company was withdrawn.
                  </div>
                )}
              </CardContent>

              <CardFooter className="border-t border-zinc-900 pt-4 mt-auto">
                <Button 
                  onClick={() => handleOpenBidModal(tender)}
                  disabled={isWithdrawn}
                  className={`w-full font-bold transition-all ${
                    isWithdrawn 
                    ? "bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800" 
                    : "bg-zinc-100 text-black hover:bg-white"
                  }`}
                >
                  {isWithdrawn ? "Bid Permanently Withdrawn" : "View Details & Bid"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTenders.length === 0 && (
        <div className="text-center py-24 bg-zinc-950/50 rounded-2xl border border-dashed border-zinc-800">
          <Briefcase className="w-12 h-12 mx-auto text-zinc-800 mb-4" />
          <p className="text-zinc-500">No active tenders match your search criteria.</p>
          <Button variant="link" onClick={() => setSearchQuery("")} className="text-blue-500 mt-2">
            Clear search
          </Button>
        </div>
      )}

      {selectedTender && (
        <BidSubmissionModal 
          isOpen={isBidModalOpen} 
          onClose={() => {
            setIsBidModalOpen(false);
            setSelectedTender(null);
          }} 
          tender={selectedTender} 
        />
      )}
    </div>
  );
}