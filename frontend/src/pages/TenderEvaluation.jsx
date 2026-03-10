import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '@/api/axios';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, User, Clock, DollarSign, 
  ArrowLeft, FileText, CheckCircle2, AlertCircle, XCircle, ShieldCheck, BarChart3, TrendingUp, Loader2
} from "lucide-react";
import { toast } from "react-hot-toast";
import ConfirmDialog from '@/components/ConfirmDialog';

export default function TenderEvaluation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tender, setTender] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState(false);
  const [awardModal, setAwardModal] = useState({ open: false, bid: null });
  const [awardStep, setAwardStep] = useState(1);
  const [awardJustification, setAwardJustification] = useState('');
  const [rejectConfirm, setRejectConfirm] = useState({ open: false, bidId: null });
  const [complianceChecks, setComplianceChecks] = useState({
    technicalReviewed: false,
    financialReviewed: false,
    conflictOfInterest: false,
    policyCompliance: false,
    budgetExceptionApproved: false,
  });

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
    } catch {
      toast.error("Error loading evaluation data");
    } finally {
      setLoading(false);
    }
  };

  const getBidDocsCompleteness = (bid) => {
    const technicalCount = Array.isArray(bid?.technicalDocs) ? bid.technicalDocs.length : 0;
    const financialCount = Array.isArray(bid?.financialDocs) ? bid.financialDocs.length : 0;
    const hasEmd = Boolean(bid?.emdPaymentProof?.receiptDoc?.url);

    return {
      technicalCount,
      financialCount,
      hasEmd,
      isComplete: technicalCount > 0 && financialCount > 0 && hasEmd,
    };
  };

  const getTenderAnalytics = () => {
    const submitted = (bids || []).filter((bid) => bid.status !== 'REJECTED' && bid.status !== 'WITHDRAWN');
    const amounts = submitted.map((bid) => Number(bid.amount || 0)).filter((amt) => amt > 0);
    const avgAmount = amounts.length ? amounts.reduce((sum, x) => sum + x, 0) / amounts.length : 0;
    const minAmount = amounts.length ? Math.min(...amounts) : 0;
    const maxAmount = amounts.length ? Math.max(...amounts) : 0;

    return { submitted, avgAmount, minAmount, maxAmount };
  };

  const getRiskSummary = (bid) => {
    if (!bid || !tender) return { level: 'LOW', notes: [] };

    const notes = [];
    const estimated = Number(tender.estimatedValue || 0);
    const amount = Number(bid.amount || 0);
    const delivery = Number(bid.deliveryDays || 0);
    const docs = getBidDocsCompleteness(bid);

    if (!docs.isComplete) notes.push('Missing one or more required bid documents.');
    if (estimated > 0 && amount < estimated * 0.7) notes.push('Bid amount is significantly below estimate (abnormally low risk).');
    if (estimated > 0 && amount > estimated * 1.2) notes.push('Bid amount is significantly above estimate (budget overrun risk).');
    if (delivery > 90) notes.push('Long delivery timeline may impact schedule commitments.');
    if (Number(bid.anomalyScore || 0) >= 70) notes.push('System anomaly score is high for this bid.');

    if (notes.length >= 3) return { level: 'HIGH', notes };
    if (notes.length >= 1) return { level: 'MEDIUM', notes };
    return { level: 'LOW', notes: ['No major risk indicators found based on current bid data.'] };
  };

  const openAwardModal = (bid) => {
    setAwardModal({ open: true, bid });
    setAwardStep(1);
    setAwardJustification('');
    setComplianceChecks({
      technicalReviewed: false,
      financialReviewed: false,
      conflictOfInterest: false,
      policyCompliance: false,
      budgetExceptionApproved: false,
    });
  };

  const closeAwardModal = () => {
    setAwardModal({ open: false, bid: null });
  };

  const handleAward = async (bidId) => {
    setAwarding(true);
    try {
      // Award only after tender is closed
      await api.patch(`/tenders/${id}/award`, {
        winningBidId: bidId,
        awardJustification: awardJustification.trim(),
      });
      toast.success("Tender awarded successfully!");
      closeAwardModal();
      fetchTenderAndBids(); 
    } catch (err) {
      toast.error(err.response?.data?.message || "Awarding failed");
    } finally {
      setAwarding(false);
    }
  };

  const handleReject = async (bidId) => {
    try {
      await api.patch(`/bids/${bidId}/reject`);
      toast.success("Bid rejected");
      fetchTenderAndBids();
    } catch {
      toast.error("Failed to reject bid");
    }
  };

  const requestReject = (bidId) => {
    setRejectConfirm({ open: true, bidId });
  };

  if (loading) return <div className="p-8 text-white text-center">Loading Bids...</div>;
  if (!tender) return <div className="p-8 text-white text-center">Tender not found.</div>;

  const selectedBid = awardModal.bid;
  const analytics = getTenderAnalytics();
  const selectedDocs = getBidDocsCompleteness(selectedBid);
  const selectedRisk = getRiskSummary(selectedBid);
  const estimatedValue = Number(tender.estimatedValue || 0);
  const selectedAmount = Number(selectedBid?.amount || 0);
  const overBudget = estimatedValue > 0 && selectedAmount > estimatedValue;
  const underpriced = estimatedValue > 0 && selectedAmount < estimatedValue * 0.7;
  const priceVsBudgetPct = estimatedValue > 0 ? ((selectedAmount - estimatedValue) / estimatedValue) * 100 : 0;
  const justificationValid = awardJustification.trim().length >= 20;
  const requiredChecksDone =
    complianceChecks.technicalReviewed &&
    complianceChecks.financialReviewed &&
    complianceChecks.conflictOfInterest &&
    complianceChecks.policyCompliance &&
    (!overBudget || complianceChecks.budgetExceptionApproved);
  const canProceedToStep2 = selectedDocs.isComplete;
  const canSubmitAward = canProceedToStep2 && justificationValid && requiredChecksDone;

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
                      {bid.bidderCompany?._id && (
                        <Link
                          to={`/companies/public/${bid.bidderCompany._id}`}
                          className="text-xs text-blue-400 hover:underline"
                        >
                          View Company Profile
                        </Link>
                      )}
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
                            onClick={() => openAwardModal(bid)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-9"
                          >
                            <Trophy className="mr-2 h-4 w-4" /> Award
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => requestReject(bid._id)}
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

      {awardModal.open && selectedBid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-4xl rounded-xl border border-zinc-800 bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-800 p-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500">Pre-Award Validation</p>
                <h3 className="text-xl font-bold">Award Review - {selectedBid.bidderCompany?.name || 'Bidder'}</h3>
              </div>
              <button className="text-zinc-400 hover:text-white" onClick={closeAwardModal}>Close</button>
            </div>

            <div className="p-5">
              <div className="mb-5 flex items-center gap-2 text-xs text-zinc-400">
                <span className={awardStep >= 1 ? 'text-blue-400' : ''}>1. Validation</span>
                <span>{'->'}</span>
                <span className={awardStep >= 2 ? 'text-blue-400' : ''}>2. Analytics</span>
                <span>{'->'}</span>
                <span className={awardStep >= 3 ? 'text-blue-400' : ''}>3. Compliance & Confirm</span>
              </div>

              {awardStep === 1 && (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                      <p className="text-xs uppercase text-zinc-500">Financial verification</p>
                      <p className="mt-2 text-sm">Bid Amount: <span className="font-bold text-emerald-400">${selectedAmount.toLocaleString()}</span></p>
                      <p className="text-sm">Budget: <span className="font-bold">${estimatedValue.toLocaleString()}</span></p>
                      <p className={`text-xs mt-2 ${overBudget ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {estimatedValue > 0 ? `${priceVsBudgetPct.toFixed(2)}% vs budget` : 'Budget data unavailable'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                      <p className="text-xs uppercase text-zinc-500">Document completeness</p>
                      <p className="mt-2 text-sm">Technical Docs: <span className="font-bold">{selectedDocs.technicalCount}</span></p>
                      <p className="text-sm">Financial Docs: <span className="font-bold">{selectedDocs.financialCount}</span></p>
                      <p className="text-sm">EMD Proof: <span className={`font-bold ${selectedDocs.hasEmd ? 'text-emerald-400' : 'text-red-400'}`}>{selectedDocs.hasEmd ? 'Present' : 'Missing'}</span></p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                    <p className="text-xs uppercase text-zinc-500">Validation checklist</p>
                    <ul className="mt-2 space-y-2 text-sm">
                      <li className={selectedDocs.technicalCount > 0 ? 'text-emerald-400' : 'text-red-400'}>Technical envelope attached</li>
                      <li className={selectedDocs.financialCount > 0 ? 'text-emerald-400' : 'text-red-400'}>Financial envelope attached</li>
                      <li className={selectedDocs.hasEmd ? 'text-emerald-400' : 'text-red-400'}>EMD payment proof available</li>
                      <li className={underpriced ? 'text-amber-400' : 'text-emerald-400'}>{underpriced ? 'Possible abnormally low bid risk' : 'No low-price anomaly detected'}</li>
                    </ul>
                  </div>
                </div>
              )}

              {awardStep === 2 && (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                      <div className="flex items-center gap-2 text-zinc-400"><BarChart3 className="h-4 w-4" />Market Avg</div>
                      <p className="mt-2 text-lg font-bold">${analytics.avgAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                      <div className="flex items-center gap-2 text-zinc-400"><TrendingUp className="h-4 w-4" />Range</div>
                      <p className="mt-2 text-lg font-bold">${analytics.minAmount.toLocaleString()} - ${analytics.maxAmount.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                      <div className="flex items-center gap-2 text-zinc-400"><ShieldCheck className="h-4 w-4" />Risk</div>
                      <p className={`mt-2 text-lg font-bold ${selectedRisk.level === 'HIGH' ? 'text-red-400' : selectedRisk.level === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {selectedRisk.level}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                    <p className="text-xs uppercase text-zinc-500 mb-2">Bid comparison matrix</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-zinc-500">
                            <th className="py-2 text-left">Bidder</th>
                            <th className="py-2 text-left">Amount</th>
                            <th className="py-2 text-left">Delivery</th>
                            <th className="py-2 text-left">Docs</th>
                            <th className="py-2 text-left">Risk</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.submitted.map((row) => {
                            const docs = getBidDocsCompleteness(row);
                            const risk = getRiskSummary(row).level;
                            return (
                              <tr key={row._id} className={row._id === selectedBid._id ? 'bg-blue-500/10' : ''}>
                                <td className="py-2">{row.bidderCompany?.name || 'Company'}</td>
                                <td>${Number(row.amount || 0).toLocaleString()}</td>
                                <td>{row.deliveryDays} days</td>
                                <td>{docs.isComplete ? 'Complete' : 'Missing'}</td>
                                <td>{risk}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                    <p className="text-xs uppercase text-zinc-500 mb-2">Risk assessment summary</p>
                    <ul className="space-y-2 text-sm text-zinc-300">
                      {selectedRisk.notes.map((note) => (
                        <li key={note}>- {note}</li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-zinc-500">Historical bidder performance: Not available in current dataset.</p>
                  </div>
                </div>
              )}

              {awardStep === 3 && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                    <p className="text-xs uppercase text-zinc-500">Award justification (required)</p>
                    <textarea
                      className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 p-3 text-sm outline-none focus:border-blue-500"
                      rows={4}
                      placeholder="Document why this bidder is being awarded (minimum 20 characters)."
                      value={awardJustification}
                      onChange={(e) => setAwardJustification(e.target.value)}
                    />
                    <p className={`mt-1 text-xs ${justificationValid ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {awardJustification.trim().length}/20 minimum characters
                    </p>
                  </div>

                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                    <p className="text-xs uppercase text-zinc-500 mb-2">Compliance checklist</p>
                    <div className="space-y-2 text-sm">
                      <label className="flex items-center gap-2"><input type="checkbox" checked={complianceChecks.technicalReviewed} onChange={(e) => setComplianceChecks((prev) => ({ ...prev, technicalReviewed: e.target.checked }))} /> Technical proposal reviewed</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={complianceChecks.financialReviewed} onChange={(e) => setComplianceChecks((prev) => ({ ...prev, financialReviewed: e.target.checked }))} /> Financial proposal reviewed</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={complianceChecks.conflictOfInterest} onChange={(e) => setComplianceChecks((prev) => ({ ...prev, conflictOfInterest: e.target.checked }))} /> Conflict of interest check completed</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={complianceChecks.policyCompliance} onChange={(e) => setComplianceChecks((prev) => ({ ...prev, policyCompliance: e.target.checked }))} /> Procurement policy compliance confirmed</label>
                      {overBudget && (
                        <label className="flex items-center gap-2 text-amber-400">
                          <input type="checkbox" checked={complianceChecks.budgetExceptionApproved} onChange={(e) => setComplianceChecks((prev) => ({ ...prev, budgetExceptionApproved: e.target.checked }))} />
                          Budget exception approved for over-budget award
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-zinc-800 p-4">
              <Button
                variant="outline"
                disabled={awardStep === 1 || awarding}
                onClick={() => setAwardStep((prev) => Math.max(1, prev - 1))}
              >
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={closeAwardModal} disabled={awarding}>Cancel</Button>
                {awardStep < 3 ? (
                  <Button
                    onClick={() => {
                      if (awardStep === 1 && !canProceedToStep2) {
                        toast.error('Complete required document checks before proceeding.');
                        return;
                      }
                      setAwardStep((prev) => Math.min(3, prev + 1));
                    }}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={!canSubmitAward || awarding}
                    onClick={() => handleAward(selectedBid._id)}
                  >
                    {awarding ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Awarding...
                      </>
                    ) : (
                      'Confirm Award'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={rejectConfirm.open}
        onOpenChange={(open) => {
          if (!open) setRejectConfirm({ open: false, bidId: null });
        }}
        title="Reject This Bid?"
        description="This bidder will be marked as rejected for this tender."
        confirmLabel="Reject Bid"
        confirmVariant="destructive"
        onConfirm={async () => {
          if (!rejectConfirm.bidId) return;
          await handleReject(rejectConfirm.bidId);
          setRejectConfirm({ open: false, bidId: null });
        }}
      />
    </div>
  );
}
