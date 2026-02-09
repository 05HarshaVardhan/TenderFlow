import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, User, Clock, DollarSign, CheckCircle } from "lucide-react";
import { toast } from "react-hot-toast";

export default function TenderDetails() {
  const { id } = useParams();
  const [tender, setTender] = useState(null);
  const [bids, setBids] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const [tRes, bRes] = await Promise.all([
        api.get(`/tenders/${id}`),
        api.get(`/bids/tender/${id}`) // You'll need this backend route
      ]);
      setTender(tRes.data);
      setBids(bRes.data);
    };
    fetchData();
  }, [id]);

  const handleAward = async (bidId) => {
    try {
      await api.patch(`/tenders/${id}/award`, { winnerBidId: bidId });
      toast.success("Tender awarded successfully!");
      // Refresh data to show "Awarded" status
    } catch (err) {
      toast.error("Failed to award tender");
    }
  };

  if (!tender) return <div className="p-8 text-white">Loading details...</div>;

  return (
    <div className="space-y-6 text-white">
      {/* Tender Info Header */}
      <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800">
        <div className="flex justify-between items-start">
          <h1 className="text-3xl font-bold">{tender.title}</h1>
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 capitalize">
            {tender.status}
          </Badge>
        </div>
        <p className="text-zinc-400 mt-2 max-w-3xl">{tender.description}</p>
      </div>

      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Users className="h-5 w-5 text-blue-500" /> Bids Received ({bids.length})
      </h2>

      {/* Bids List */}
      <div className="grid gap-4">
        {bids.map((bid) => (
          <Card key={bid._id} className="bg-zinc-950 border-zinc-800 border-l-4 border-l-zinc-700">
            <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="font-semibold">{bid.bidderName}</span>
                </div>
                <p className="text-sm text-zinc-400">{bid.proposal}</p>
              </div>

              <div className="flex gap-8 items-center">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-emerald-400 font-bold">
                    <DollarSign className="h-4 w-4" /> {bid.bidAmount.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 text-zinc-500 text-xs">
                    <Clock className="h-3 w-3" /> {bid.deliveryTime}
                  </div>
                </div>

                {tender.status === 'CLOSED' && (
                  <Button 
                    onClick={() => handleAward(bid._id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Trophy className="mr-2 h-4 w-4" /> Award
                  </Button>
                )}
                
                {bid.status === 'ACCEPTED' && (
                  <Badge className="bg-emerald-500 text-black">Winner</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}