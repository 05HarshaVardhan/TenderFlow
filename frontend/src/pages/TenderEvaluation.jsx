import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/api/axios';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, User, Clock, DollarSign, 
  ArrowLeft, FileText, CheckCircle2, AlertCircle, XCircle 
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function TenderEvaluation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tender, setTender] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTenderAndBids();
  }, [id]);

  const fetchTenderAndBids = async () => {
    try {
      const [tenderRes, bidsRes] = await Promise.all([
        api.get(`/tenders/${id}`),
        api.get(`/bids/tender/${id}`)
      ]);
      setTender(tenderRes.data);
      setBids(bidsRes.data);
    } catch (err) {
      toast.error("Error loading evaluation data");
    } finally {
      setLoading(false);
    }
  };

  const handleAward = async (bidId) => {
    if (!window.confirm("Award this tender? This will reject all other bids and close the tender.")) return;
    try {
      // Calling the bid-specific award route we created in the backend
      await api.patch(`/bids/${bidId}/award`);
      toast.success("Tender awarded successfully!");
      fetchTenderAndBids(); 
    } catch (err) {
      toast.error(err.response?.data?.message || "Awarding failed");
    }
  };

  const handleReject = async (bidId) => {
    if (!window.confirm("Are you sure you want to reject this bid?")) return;
    try {
      await api.patch(`/bids/${bidId}/reject`);
      toast.success("Bid rejected");
      fetchTenderAndBids();
    } catch (err) {
      toast.error("Failed to reject bid");
    }
  };

  if (loading) return <div className="p-8 text-white text-center">Loading Bids...</div>;
  if (!tender) return <div className="p-8 text-white text-center">Tender not found.</div>;

  return (
    <div className="p-6 space-y-6 text-white max-w-6xl mx-auto">
      <Button variant="ghost" onClick={() => navigate(-1)} className="text-zinc-400 hover:text-white mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Management
      </Button>

      {/* Tender Header Card */}
      <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{tender.title}</h1>
            <Badge className={`${
              tender.status === 'AWARDED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            } uppercase`}>
              {tender.status}
            </Badge>
          </div>
          <p className="text-zinc-400 max-w-2xl">{tender.description}</p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-sm text-zinc-500 font-medium uppercase tracking-wider">Total Bids</p>
          <p className="text-4xl font-black text-blue-500">{bids.length}</p>
        </div>
      </div>

      <h2 className="text-xl font-semibold flex items-center gap-2 mt-8">
        <FileText className="h-5 w-5 text-zinc-500" /> Received Proposals
      </h2>

      <div className="grid gap-4">
        {bids.length === 0 ? (
          <div className="py-12 text-center bg-zinc-950 rounded-xl border border-zinc-900">
            <AlertCircle className="mx-auto h-8 w-8 text-zinc-700 mb-2" />
            <p className="text-zinc-500">No bids have been submitted yet.</p>
          </div>
        ) : (
          bids.map((bid) => (
            <Card key={bid._id} className={`bg-zinc-950 border-zinc-800 transition-all ${
              bid.status === 'ACCEPTED' ? 'ring-2 ring-emerald-500 border-transparent' : 
              bid.status === 'REJECTED' ? 'opacity-60' : ''
            }`}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  
                  {/* Bidder Profile */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`h-12 w-12 rounded-full border flex items-center justify-center ${
                      bid.status === 'ACCEPTED' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-zinc-900 border-zinc-800 text-blue-500'
                    }`}>
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{bid.bidderCompany?.name || "Company Name"}</h4>
                      <div className="flex gap-2 mt-1">
                         {bid.status === 'REJECTED' && <Badge variant="outline" className="text-red-400 border-red-400/20 bg-red-400/10">Rejected</Badge>}
                         <p className="text-zinc-400 text-sm italic line-clamp-2">"{bid.notes || bid.proposal}"</p>
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Stats */}
                  <div className="grid grid-cols-2 md:flex gap-8 items-center text-center md:text-right">
                    <div>
                      <p className="text-[10px] uppercase text-zinc-500 font-bold">Offer Price</p>
                      <div className="flex items-center justify-center md:justify-end text-emerald-400 text-xl font-bold">
                        <DollarSign className="h-5 w-5" /> {bid.amount?.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-zinc-500 font-bold">Timeline</p>
                      <div className="flex items-center justify-center md:justify-end text-zinc-300 font-medium">
                        <Clock className="h-4 w-4 mr-1 text-zinc-500" /> {bid.deliveryDays} Days
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Logic */}
                  <div className="w-full md:w-auto flex flex-col gap-2">
                    {bid.status === 'ACCEPTED' ? (
                      <Badge className="bg-emerald-500 text-black px-4 py-1.5 flex gap-2">
                        <CheckCircle2 className="h-4 w-4" /> Selected Winner
                      </Badge>
                    ) : bid.status === 'REJECTED' ? (
                      <span className="text-zinc-500 text-sm font-medium px-4">Disqualified</span>
                    ) : (
                      // Only show buttons if the tender is NOT already awarded
                      tender.status !== 'AWARDED' && (
                        <div className="flex flex-col gap-2 min-w-[140px]">
                          <Button 
                            onClick={() => handleAward(bid._id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-9"
                          >
                            <Trophy className="mr-2 h-4 w-4" /> Award
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => handleReject(bid._id)}
                            className="border-zinc-700 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 h-9"
                          >
                            <XCircle className="mr-2 h-4 w-4" /> Reject
                          </Button>
                        </div>
                      )
                    )}
                  </div>

                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}