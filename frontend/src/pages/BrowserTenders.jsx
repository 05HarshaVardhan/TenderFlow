//frontend\src\pages\BrowserTenders.jsx
import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BidSubmissionModal from "@/components/tenders/BidSubmissionModal";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, Calendar, DollarSign, Briefcase } from "lucide-react";
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
    // Change this line to match your tender.routes.js
    const response = await api.get('/tenders/available'); 
    setTenders(response.data);
  } catch (err) {
    toast.error("Failed to load tenders");
  } finally {
    setLoading(false);
  }
};

  const filteredTenders = tenders.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="p-8 text-white text-center">Scanning marketplace...</div>;

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
            className="pl-10 bg-zinc-900 border-zinc-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" className="border-zinc-800 hover:bg-zinc-900 w-full md:w-auto">
          <Filter className="mr-2 h-4 w-4" /> Filters
        </Button>
      </div>

      {/* Tenders Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTenders.map((tender) => (
          <Card key={tender._id} className="bg-zinc-950 border-zinc-800 hover:border-blue-500/50 transition-all duration-300 group">
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-none uppercase text-[10px]">
                  {tender.category || "General"}
                </Badge>
                <div className="text-zinc-500">
                  <Briefcase className="h-4 w-4" />
                </div>
              </div>
              <CardTitle className="text-xl group-hover:text-blue-400 transition-colors">
                {tender.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-zinc-400 text-sm line-clamp-2">
                {tender.description}
              </p>
              
              <div className="flex flex-col gap-2 text-sm text-zinc-300">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  <span>Budget: ${tender.budgetMax?.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <Calendar className="h-4 w-4" />
                  <span>Deadline: {new Date(tender.endDate).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-zinc-900 pt-4">
              <Button 
  onClick={() => handleOpenBidModal(tender)}
  className="w-full bg-zinc-100 text-black hover:bg-white font-semibold"
>
  View Details & Bid
</Button>
            </CardFooter>
          </Card>
        ))}
        <BidSubmissionModal 
  isOpen={isBidModalOpen} 
  onClose={() => setIsBidModalOpen(false)} 
  tender={selectedTender} 
/>
      </div>

      {filteredTenders.length === 0 && (
        <div className="text-center py-20">
          <p className="text-zinc-500">No active tenders match your search.</p>
        </div>
      )}
    </div>
  );
}