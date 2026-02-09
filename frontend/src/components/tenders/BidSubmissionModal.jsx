import { useState, useEffect } from 'react';
import api from '@/api/axios';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label"; // Fixed this line
import { Loader2, Gavel, DollarSign, Clock, FileText, Send, Edit3, Eye } from "lucide-react";
import { toast } from "react-hot-toast";

export default function BidSubmissionModal({ 
  isOpen, 
  onClose, 
  tender, 
  existingBid = null, 
  isViewOnly = false,
  onRefresh 
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ bidAmount: '', deliveryTime: '', proposal: '' });

  // A bid is read-only if explicitly passed as isViewOnly OR if the status is already beyond DRAFT
  const readOnly = isViewOnly || (existingBid && existingBid.status !== 'DRAFT');

  useEffect(() => {
    if (existingBid && isOpen) {
      setFormData({
        bidAmount: existingBid.amount || '',
        deliveryTime: existingBid.deliveryDays || '',
        proposal: existingBid.notes || ''
      });
    } else if (!existingBid && isOpen) {
      setFormData({ bidAmount: '', deliveryTime: '', proposal: '' });
    }
  }, [existingBid, isOpen]);

  const handleAction = async (status) => {
    if (readOnly) return;
    if (status === 'SUBMITTED' && (!formData.bidAmount || !formData.deliveryTime || !formData.proposal)) {
      toast.error("Please fill in all fields before submitting.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        tenderId: tender?._id || existingBid?.tender?._id,
        amount: Number(formData.bidAmount),
        deliveryDays: parseInt(formData.deliveryTime),
        notes: formData.proposal,
        status: status 
      };

      if (existingBid) {
        await api.patch(`/bids/${existingBid._id}`, payload);
      } else {
        await api.post('/bids', payload);
      }
      
      toast.success(status === 'SUBMITTED' ? "Bid published!" : "Draft updated.");
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {readOnly ? <Eye className="w-5 h-5 text-zinc-400" /> : 
             existingBid ? <Edit3 className="w-5 h-5 text-amber-500" /> : 
             <Gavel className="w-5 h-5 text-blue-500" />}
            {readOnly ? 'View Bid Details' : (existingBid ? 'Edit Draft' : 'Submit Bid')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bid Amount ($)</Label>
              <div className="relative">
                <Input 
                  type="number"
                  disabled={readOnly}
                  className="bg-zinc-900 border-zinc-800 pl-9"
                  value={formData.bidAmount}
                  onChange={(e) => setFormData({...formData, bidAmount: e.target.value})}
                />
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estimated Days</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  disabled={readOnly}
                  className="bg-zinc-900 border-zinc-800 pl-9"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData({...formData, deliveryTime: e.target.value})}
                />
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Proposal / Cover Letter</Label>
            <Textarea 
              disabled={readOnly}
              className="bg-zinc-900 border-zinc-800 min-h-[150px]"
              value={formData.proposal}
              onChange={(e) => setFormData({...formData, proposal: e.target.value})}
            />
          </div>
        </div>

        <DialogFooter>
          {readOnly ? (
            <Button onClick={onClose} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white">
              Close Details
            </Button>
          ) : (
            <div className="flex gap-2 w-full sm:w-auto ml-auto">
              <Button 
                variant="secondary" 
                onClick={() => handleAction('DRAFT')} 
                disabled={loading}
                className="bg-zinc-800 text-white"
              >
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Save Draft'}
              </Button>
              <Button 
                onClick={() => handleAction('SUBMITTED')} 
                disabled={loading}
                className="bg-blue-600 text-white"
              >
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Submit Bid'}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}