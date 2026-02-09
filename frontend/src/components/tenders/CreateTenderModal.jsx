import { useState } from 'react';
import api from '@/api/axios';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, PlusCircle, Calendar } from "lucide-react";
import { toast } from "react-hot-toast";

export default function CreateTenderModal({ isOpen, onClose, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    endDate: '',
    category: '',
    tags: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Parse budget
      const budget = Number(formData.budget) || 0;
      
      if (budget <= 0) {
        setLoading(false);
        return toast.error("Budget must be greater than 0");
      }

      // 2. Prepare Payload (Ensuring it matches Backend Schema)
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        budgetMax: budget,
        endDate: formData.endDate,
        category: formData.category.trim() || 'General',
        // Convert comma string to an array of trimmed strings
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t !== "") : [],
        status: 'DRAFT'
      };

      console.log("Sending Payload:", payload);

      // 3. API Call
      const response = await api.post('/tenders', payload);
      
      if (response.status === 201 || response.status === 200) {
        toast.success("Tender created successfully as DRAFT");
        
        // 4. Safely trigger refresh if the function was passed as a prop
        if (typeof onRefresh === 'function') {
          onRefresh();
        }

        // 5. Reset and Close
        setFormData({ title: '', description: '', budget: '', endDate: '', category: '', tags: '' });
        onClose();
      }
    } catch (err) {
      console.error("Full Axios Error Object:", err);
      console.error("Error Response Data:", err.response?.data); 

      // Improved error message extraction
      const serverMessage = err.response?.data?.message || 
                            err.response?.data?.error || 
                            "Validation failed. Please check your inputs.";
                            
      toast.error(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-blue-500" />
            Create New Tender
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tender Title</Label>
            <Input 
              id="title"
              placeholder="e.g. Annual IT Infrastructure Maintenance"
              className="bg-zinc-900 border-zinc-800 focus:ring-blue-500"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description"
              placeholder="Detailed scope of work..."
              className="bg-zinc-900 border-zinc-800 min-h-[100px]"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Budget ($)</Label>
            <Input 
              type="number"
              placeholder="e.g. 50000"
              className="bg-zinc-900 border-zinc-800"
              value={formData.budget}
              onChange={(e) => setFormData({...formData, budget: e.target.value})}
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Input 
                placeholder="e.g. Services"
                className="bg-zinc-900 border-zinc-800"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Closing Date</Label>
              <div className="relative">
                <Input 
                  type="date"
                  className="bg-zinc-900 border-zinc-800 pl-10"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  required
                />
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags (Comma separated)</Label>
            <Input 
              placeholder="it, infrastructure, maintenance"
              className="bg-zinc-900 border-zinc-800"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose}
              className="text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}