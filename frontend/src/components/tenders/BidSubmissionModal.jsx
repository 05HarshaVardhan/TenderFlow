import { useState, useEffect } from 'react';
import api from '@/api/axios';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, DollarSign, Clock, CheckCircle2, ChevronRight, 
  ChevronLeft, FileText, Briefcase, FileCheck, Trash2, AlertCircle 
} from "lucide-react";
import { toast } from "react-hot-toast";

const STEPS = [
  { id: 1, title: 'General Info', icon: Briefcase },
  { id: 2, title: 'Technical Envelope', icon: FileText },
  { id: 3, title: 'Financial & EMD', icon: DollarSign },
  { id: 4, title: 'Final Review', icon: FileCheck },
];

export default function BidSubmissionModal({ isOpen, onClose, tender, existingBid, isViewOnly, onRefresh }) {
  const [step, setStep] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false); // NEW: For proposal toggle
  const [submitting, setSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Temporary buffers for files picked but NOT yet saved to server
  const [techDocs, setTechDocs] = useState([]);
  const [finDocs, setFinDocs] = useState([]);
  const [emdDoc, setEmdDoc] = useState(null);

  // Files currently living on the server
  const [existingFiles, setExistingFiles] = useState({ technical: [], financial: [], emd: null });

  const [formData, setFormData] = useState({ 
    bidAmount: '', 
    deliveryTime: '', 
    proposal: '', 
    transactionId: '',
    paymentMode: 'ONLINE'
  });

  const readOnly = isViewOnly || (existingBid && existingBid.status !== 'DRAFT');

  useEffect(() => {
    if (existingBid && isOpen) {
      setFormData({
        bidAmount: existingBid.amount || '',
        deliveryTime: existingBid.deliveryDays || '',
        proposal: existingBid.notes || '',
        transactionId: existingBid.emdPaymentProof?.transactionId || '',
        paymentMode: existingBid.emdPaymentProof?.paymentMode || 'ONLINE'
      });
      setExistingFiles({
        technical: existingBid.technicalDocs || [],
        financial: existingBid.financialDocs || [],
        emd: existingBid.emdPaymentProof?.receiptDoc || null
      });
    } else if (!existingBid && isOpen) {
      setStep(1);
      setFormData({ bidAmount: '', deliveryTime: '', proposal: '', transactionId: '', paymentMode: 'ONLINE' });
      setTechDocs([]); setFinDocs([]); setEmdDoc(null);
      setExistingFiles({ technical: [], financial: [], emd: null });
      setFormErrors({});
    }
  }, [existingBid, isOpen]);

  const validateStep = (curr) => {
    const errors = {};
    if (curr === 1) {
      if (!formData.deliveryTime) errors.deliveryTime = 'Required';
      if (!formData.proposal?.trim()) errors.proposal = 'Required';
    }
    if (curr === 2) {
      if (techDocs.length === 0 && existingFiles.technical.length === 0) 
        errors.techDocs = 'Technical docs required';
    }
    if (curr === 3) {
      if (!formData.bidAmount) errors.bidAmount = 'Amount required';
      if (!formData.transactionId) errors.transactionId = 'TXN ID required';
      if (!emdDoc && !existingFiles.emd) errors.emd = 'Receipt required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep(s => Math.min(s + 1, 4));
    else toast.error("Please complete the required fields");
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const removeFile = (type, index, isExisting = false) => {
    if (isExisting) {
      // Deleting a file that is already on the server
      setExistingFiles(prev => ({
        ...prev,
        [type]: type === 'emd' ? null : prev[type].filter((_, i) => i !== index)
      }));
    } else {
      // Deleting a file you just picked from your computer
      if (type === 'technical') setTechDocs(prev => prev.filter((_, i) => i !== index));
      if (type === 'financial') setFinDocs(prev => prev.filter((_, i) => i !== index));
      if (type === 'emd') setEmdDoc(null);
    }
  };

  const getEmdFileName = () => {
    if (emdDoc) return emdDoc.name;
    if (existingFiles.emd) return existingFiles.emd.name || "Saved EMD Receipt";
    return null;
  };
  const handleAction = async (isFinalSubmit = false) => {
    if (readOnly) return;
    isFinalSubmit ? setSubmitting(true) : setIsSaving(true);
    
    try {
      const data = new FormData();
      const tId = tender?._id || existingBid?.tender?._id || existingBid?.tender;
      
      data.append('tenderId', tId);
      data.append('amount', formData.bidAmount);
      data.append('deliveryDays', formData.deliveryTime);
      data.append('notes', formData.proposal);
      data.append('transactionId', formData.transactionId);
      data.append('paymentMode', formData.paymentMode);

      // Append only the NEW files
      techDocs.forEach(f => data.append('technicalDocs', f));
      finDocs.forEach(f => data.append('financialDocs', f));
      if (emdDoc) data.append('emdReceipt', emdDoc);

      // Tell backend which old files we decided to KEEP
      data.append('keepTechnicalDocs', JSON.stringify(existingFiles.technical));
      data.append('keepFinancialDocs', JSON.stringify(existingFiles.financial));
      data.append('keepEmdReceipt', JSON.stringify(existingFiles.emd));

      let res;
      if (existingBid?._id) {
        res = await api.patch(`/bids/${existingBid._id}`, data);
      } else {
        res = await api.post('/bids', data);
      }

      // SYNC: Backend returns the updated file list
      const updatedBid = res.data;
      setExistingFiles({
        technical: updatedBid.technicalDocs || [],
        financial: updatedBid.financialDocs || [],
        emd: updatedBid.emdPaymentProof?.receiptDoc || null
      });

      // CLEAR BUFFERS: Empty the temp files so they aren't uploaded again
      setTechDocs([]);
      setFinDocs([]);
      setEmdDoc(null);

      if (isFinalSubmit) {
        await api.patch(`/bids/${updatedBid._id}/submit`);
        toast.success("Bid Submitted Successfully!");
        onClose();
      } else {
        toast.success("Draft Saved!");
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally {
      setSubmitting(false);
      setIsSaving(false);
    }
  };
  return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] bg-zinc-950 border-zinc-800 text-white p-0 overflow-hidden flex flex-col max-h-[95vh]">
          <DialogHeader className="sr-only">
            <DialogTitle>Bid Submission</DialogTitle>
            <DialogDescription>Submit your proposal for tender {tender?.title}</DialogDescription>
          </DialogHeader>

          {/* Header/Progress */}
          <div className="bg-zinc-900/50 border-b border-zinc-800 p-6">
            <div className="flex justify-between items-center mb-6">
              {STEPS.map((s) => (
                <div key={s.id} className={`flex flex-col items-center gap-2 relative z-10 ${step >= s.id ? 'text-blue-500' : 'text-zinc-600'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${step >= s.id ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 bg-zinc-950'}`}>
                    {step > s.id ? <CheckCircle2 className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">{s.title}</span>
                </div>
              ))}
            </div>
            <Progress value={(step / 4) * 100} className="h-1 bg-zinc-800" />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 pt-4">
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className={formErrors.deliveryTime ? "text-red-500" : ""}>Delivery Timeline (Days)</Label>
                  <Input 
                    type="number" 
                    value={formData.deliveryTime} 
                    onChange={(e) => setFormData({...formData, deliveryTime: e.target.value})} 
                    className={formErrors.deliveryTime ? "border-red-500" : ""} 
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={formErrors.proposal ? "text-red-500" : ""}>Proposal / Cover Letter</Label>
                  <Textarea 
                    value={formData.proposal} 
                    onChange={(e) => setFormData({...formData, proposal: e.target.value})} 
                    className={`min-h-[200px] ${formErrors.proposal ? "border-red-500" : ""}`}
                    disabled={readOnly}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <Label>Technical Documentation</Label>
                {!readOnly && <Input type="file" multiple onChange={(e) => setTechDocs([...techDocs, ...Array.from(e.target.files)])} />}
                <div className="space-y-2 mt-4">
                  {[...existingFiles.technical.map(f => ({...f, isSaved: true})), ...techDocs].map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-zinc-900 border border-zinc-800 rounded text-xs">
                      <span className="flex items-center gap-2">
                        <FileText className="w-3 h-3 text-blue-400" />
                        {file.name || "Document"} {file.isSaved && "(Saved)"}
                      </span>
                      {!readOnly && <Trash2 className="w-4 h-4 text-red-500 cursor-pointer" onClick={() => removeFile('technical', i, file.isSaved)} />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
    <div className="space-y-6">
      {/* 1. Financial Quote Section */}
      <div className="space-y-4 p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
        <h4 className="text-xs font-bold uppercase text-blue-500">1. Financial Quote</h4>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label>Bid Amount ($)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <Input 
                type="number" 
                className="pl-9"
                placeholder="0.00"
                value={formData.bidAmount} 
                onChange={(e) => setFormData({...formData, bidAmount: e.target.value})} 
                disabled={readOnly} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Financial Documents Section (THE MISSING FIELD) */}
      <div className="space-y-4 p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
        <h4 className="text-xs font-bold uppercase text-blue-500">2. Financial Envelope</h4>
        <div className="space-y-2">
          <Label>Upload Financial Documents (BoQ, Price Breakup, etc.)</Label>
          {!readOnly && (
            <Input 
              type="file" 
              multiple 
              onChange={(e) => setFinDocs([...finDocs, ...Array.from(e.target.files)])} 
            />
          )}
          <div className="space-y-2 mt-2">
            {[...existingFiles.financial.map(f => ({...f, isSaved: true})), ...finDocs].map((file, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-zinc-950 border border-zinc-800 rounded text-xs">
                <span className="flex items-center gap-2">
                  <FileText className="w-3 h-3 text-emerald-400" />
                  {file.name || "Financial Doc"} {file.isSaved && "(Saved)"}
                </span>
                {!readOnly && (
                  <Trash2 
                    className="w-4 h-4 text-red-500 cursor-pointer hover:text-red-400" 
                    onClick={() => removeFile('financial', i, file.isSaved)} 
                  />
                )}
              </div>
            ))}
            {(finDocs.length === 0 && existingFiles.financial.length === 0) && (
              <p className="text-[10px] text-zinc-500 italic">No financial documents uploaded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* 3. EMD Payment Section */}
      <div className="space-y-4 p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
        <h4 className="text-xs font-bold uppercase text-blue-500">3. Earnest Money Deposit (EMD)</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Transaction ID</Label>
            <Input 
              placeholder="TXN..."
              value={formData.transactionId} 
              onChange={(e) => setFormData({...formData, transactionId: e.target.value})} 
              disabled={readOnly} 
            />
          </div>
          <div className="space-y-2">
            <Label>Payment Mode</Label>
            <select 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-sm"
              value={formData.paymentMode}
              onChange={(e) => setFormData({...formData, paymentMode: e.target.value})}
              disabled={readOnly}
            >
              <option value="ONLINE">Online Transfer</option>
              <option value="BG">Bank Guarantee</option>
              <option value="DD">Demand Draft</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>EMD Receipt / Proof of Payment</Label>
          {!getEmdFileName() && !readOnly ? (
            <Input type="file" onChange={(e) => setEmdDoc(e.target.files[0])} />
          ) : (
            <div className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-sm">
              <span className="flex items-center gap-2 truncate">
                <FileCheck className="w-4 h-4 text-blue-500" />
                {getEmdFileName()}
              </span>
              {!readOnly && (
                <Trash2 
                  className="w-4 h-4 text-red-500 cursor-pointer" 
                  onClick={() => removeFile('emd', 0, !!existingFiles.emd)} 
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )}

            {step === 4 && (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl relative overflow-hidden">
          <DollarSign className="absolute -right-2 -bottom-2 h-12 w-12 text-emerald-500/10" />
          <p className="text-[10px] uppercase text-emerald-600 font-bold mb-1">Total Quote</p>
          <p className="text-xl font-mono text-emerald-500">${Number(formData.bidAmount).toLocaleString()}</p>
        </div>
        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl relative overflow-hidden">
          <Clock className="absolute -right-2 -bottom-2 h-12 w-12 text-blue-500/10" />
          <p className="text-[10px] uppercase text-blue-600 font-bold mb-1">Timeline</p>
          <p className="text-xl font-mono text-blue-500">{formData.deliveryTime} Days</p>
        </div>
      </div>

      <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/20">
        <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800">
          <span className="text-xs font-bold uppercase tracking-wider">Document Checklist</span>
        </div>
        <div className="p-4 space-y-3">
          <ReviewItem label="Technical Envelope" count={techDocs.length + existingFiles.technical.length} />
          <ReviewItem label="Financial Envelope" count={finDocs.length + existingFiles.financial.length} />
          <ReviewItem label="EMD Proof" count={getEmdFileName() ? 1 : 0} />
        </div>
      </div>

      <div className="bg-zinc-900/30 rounded-lg border border-zinc-800 overflow-hidden">
        <div className="p-4">
          <Label className="text-zinc-500 text-[10px] uppercase font-bold mb-2 block">Proposal Summary</Label>
          <div className={`text-sm text-zinc-300 relative transition-all duration-300 ${isExpanded ? "max-h-[500px]" : "max-h-[80px] overflow-hidden"}`}>
            <p className="whitespace-pre-wrap">{formData.proposal || "No proposal text provided."}</p>
            {!isExpanded && formData.proposal?.length > 150 && (
              <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-zinc-950/80 to-transparent" />
            )}
          </div>
          {formData.proposal?.length > 150 && (
            <Button variant="link" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="p-0 h-auto text-blue-400 mt-2">
              {isExpanded ? "Show Less" : "Read Full Proposal"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )}
          </div>

          {/* Footer */}
          <DialogFooter className="bg-zinc-900/50 border-t border-zinc-800 p-4 flex sm:justify-between items-center">
            <div className="flex gap-2">
              {step > 1 && (
                <Button variant="ghost" onClick={prevStep}>
                  <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              )}
              {!readOnly && (
                <Button variant="outline" onClick={() => handleAction(false)} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Draft"}
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {step < 4 ? (
                <Button onClick={nextStep} className="bg-blue-600 hover:bg-blue-700">Next</Button>
              ) : (
                !readOnly && (
                  <Button onClick={() => handleAction(true)} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Final Bid"}
                  </Button>
                )
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
}

function ReviewItem({ label, count }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-zinc-400">{label}</span>
      {count > 0 ? (
        <span className="text-emerald-500 flex items-center gap-1 font-medium italic">
          <CheckCircle2 className="w-3 h-3" /> {count} Uploaded
        </span>
      ) : (
        <span className="text-red-500 font-medium">Not Provided</span>
      )}
    </div>
  );
}