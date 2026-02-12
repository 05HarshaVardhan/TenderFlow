import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BidSubmissionModal from "@/components/tenders/BidSubmissionModal";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, Calendar, DollarSign, Briefcase, Building2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function BrowseTenders() {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTender, setSelectedTender] = useState(null);
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);

  const handleOpenBidModal = (tender) => {
    setSelectedTender(tender);
    setIsBidModalOpen(true);
  };

  useEffect(() => {
    fetchTenders();
  }, []);

  const fetchTenders = async () => {
    try {
      setLoading(true);
      // Matches your backend route: router.get('/available', ...)
      const response = await api.get('/tenders/available'); 
      setTenders(response.data);
    } catch (err) {
      toast.error("Failed to load tenders");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Improved filtering logic to prevent crashes if title or category is missing
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
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Browse Tenders</h1>
        <p className="text-zinc-400 font-medium">Find and bid on the latest projects in your industry.</p>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <Input 
            placeholder="Search by title or category..." 
            className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" className="border-zinc-800 hover:bg-zinc-900 w-full md:w-auto text-zinc-300">
          <Filter className="mr-2 h-4 w-4" /> Filters
        </Button>
      </div>

      {/* Tenders Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTenders.map((tender) => (
          <Card key={tender._id} className="bg-zinc-950 border-zinc-800 hover:border-blue-500/50 transition-all duration-300 group flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-none uppercase text-[10px] font-bold">
                  {tender.category || "General"}
                </Badge>
                <div className="flex items-center gap-1 text-zinc-500">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium truncate max-w-[100px]">
                    {tender.ownerCompany?.name || "Corporate"}
                  </span>
                </div>
              </div>
              <CardTitle className="text-xl group-hover:text-blue-400 transition-colors line-clamp-1">
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
            </CardContent>

            <CardFooter className="border-t border-zinc-900 pt-4 mt-auto">
              <Button 
                onClick={() => handleOpenBidModal(tender)}
                className="w-full bg-zinc-100 text-black hover:bg-white font-bold transition-all"
              >
                View Details & Bid
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredTenders.length === 0 && (
        <div className="text-center py-24 bg-zinc-950/50 rounded-2xl border border-dashed border-zinc-800">
          <Briefcase className="w-12 h-12 mx-auto text-zinc-800 mb-4" />
          <p className="text-zinc-500">No active tenders match your search criteria.</p>
          <Button 
            variant="link" 
            onClick={() => setSearchQuery("")} 
            className="text-blue-500 mt-2"
          >
            Clear search
          </Button>
        </div>
      )}

      {/* Modal Integration */}
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