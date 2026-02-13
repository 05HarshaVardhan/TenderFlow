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
      if (isViewOnly) setStep(4);
    } else if (!existingBid && isOpen) {
      setStep(1);
      setFormData({ bidAmount: '', deliveryTime: '', proposal: '', transactionId: '', paymentMode: 'ONLINE' });
      setTechDocs([]); setFinDocs([]); setEmdDoc(null);
      setExistingFiles({ technical: [], financial: [], emd: null });
      setFormErrors({});
    }
  }, [existingBid, isOpen, isViewOnly]);

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
      setExistingFiles(prev => ({
        ...prev,
        [type]: type === 'emd' ? null : prev[type].filter((_, i) => i !== index)
      }));
    } else {
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
    if (readOnly && !isFinalSubmit) return;
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

      techDocs.forEach(f => data.append('technicalDocs', f));
      finDocs.forEach(f => data.append('financialDocs', f));
      if (emdDoc) data.append('emdReceipt', emdDoc);

      data.append('keepTechnicalDocs', JSON.stringify(existingFiles.technical));
      data.append('keepFinancialDocs', JSON.stringify(existingFiles.financial));
      data.append('keepEmdReceipt', JSON.stringify(existingFiles.emd));

      let res;
      if (existingBid?._id) {
        res = await api.patch(`/bids/${existingBid._id}`, data);
      } else {
        res = await api.post('/bids', data);
      }

      const updatedBid = res.data;
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
      <DialogContent className="sm:max-w-[800px] bg-zinc-950 border-zinc-800 text-white p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 border-b border-zinc-800">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl">
                {isViewOnly ? "Bid Details" : existingBid ? "Edit Draft Bid" : "New Bid Submission"}
              </DialogTitle>
              <DialogDescription className="text-zinc-500">
                Tender: {tender?.title || existingBid?.tender?.title}
              </DialogDescription>
            </div>
            {isViewOnly && (
              <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${existingBid?.status === 'SUBMITTED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'
                }`}>
                {existingBid?.status}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Header/Progress */}
        <div className="bg-zinc-900/30 px-6 py-4 border-b border-zinc-800">
          <div className="flex justify-between items-center mb-4">
            {STEPS.map((s) => (
              <div key={s.id} className={`flex items-center gap-2 ${step >= s.id ? 'text-blue-500' : 'text-zinc-600'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step >= s.id ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800'}`}>
                  {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tighter hidden sm:block">{s.title}</span>
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
                  onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                  className={formErrors.deliveryTime ? "border-red-500" : ""}
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-2">
                <Label className={formErrors.proposal ? "text-red-500" : ""}>Proposal / Cover Letter</Label>
                <Textarea
                  value={formData.proposal}
                  onChange={(e) => setFormData({ ...formData, proposal: e.target.value })}
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
                {[...existingFiles.technical.map(f => ({ ...f, isSaved: true })), ...techDocs].map((file, i) => (
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
              {/* Financial Quote Section */}
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
                        onChange={(e) => setFormData({ ...formData, bidAmount: e.target.value })}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Documents Section */}
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
                    {[...existingFiles.financial.map(f => ({ ...f, isSaved: true })), ...finDocs].map((file, i) => (
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

              {/* EMD Payment Section */}
              <div className="space-y-4 p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
                <h4 className="text-xs font-bold uppercase text-blue-500">3. Earnest Money Deposit (EMD)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Transaction ID</Label>
                    <Input
                      placeholder="TXN..."
                      value={formData.transactionId}
                      onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <select
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-sm"
                      value={formData.paymentMode}
                      onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
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
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                  <p className="text-[10px] uppercase text-emerald-600 font-bold mb-1">Total Quote</p>
                  <p className="text-xl font-mono text-emerald-500">${Number(formData.bidAmount).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                  <p className="text-[10px] uppercase text-blue-600 font-bold mb-1">Timeline</p>
                  <p className="text-xl font-mono text-blue-500">{formData.deliveryTime} Days</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-500 text-[10px] uppercase font-bold">Proposal / Cover Letter</Label>
                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {formData.proposal || "No proposal provided."}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-zinc-500 text-[10px] uppercase font-bold">Submitted Documents</Label>
                <div className="grid gap-2">
                  {[...existingFiles.technical.map(f => ({...f, type: 'Technical'})), 
                    ...existingFiles.financial.map(f => ({...f, type: 'Financial'}))].map((file, i) => (
                    <a key={i} href={file.url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-blue-500/50 transition-all">
                      <span className="flex items-center gap-3 text-xs">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <div>
                          <p className="text-[9px] text-zinc-500 uppercase">{file.type}</p>
                          <p>{file.name || "View Document"}</p>
                        </div>
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </a>
                  ))}
                  {existingFiles.emd && (
                    <a href={existingFiles.emd.url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                       <span className="flex items-center gap-3 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-amber-500" />
                        <div>
                          <p className="text-[9px] text-zinc-500 uppercase">EMD Proof ({formData.paymentMode})</p>
                          <p>TXN: {formData.transactionId}</p>
                        </div>
                      </span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

         
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 bg-zinc-900/50 border-t border-zinc-800">
          {isViewOnly ? (
            <Button onClick={onClose} className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700">Close Window</Button>
          ) : (
            <div className="flex justify-between w-full">
               <div className="flex gap-2">
                {step > 1 && <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 h-4 w-4"/> Back</Button>}
                <Button variant="outline" onClick={() => handleAction(false)}>{isSaving ? <Loader2 className="animate-spin" /> : "Save Draft"}</Button>
              </div>
              {step < 4 ? (
                <Button onClick={nextStep} className="bg-blue-600">Next <ChevronRight className="ml-2 h-4 w-4"/></Button>
              ) : (
                <Button onClick={() => handleAction(true)} className="bg-emerald-600">Submit Final Bid</Button>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FileLink({ file, label, icon }) {
  return (
    <a 
      href={file.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-600 transition-all group"
    >
      <div className="flex items-center gap-3 overflow-hidden">
        {icon}
        <div className="overflow-hidden">
          <p className="text-[10px] uppercase text-zinc-500 font-bold">{label}</p>
          <p className="text-xs text-zinc-300 truncate">{file.name || 'View Document'}</p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
    </a>
  );
}