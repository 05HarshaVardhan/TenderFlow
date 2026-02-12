import React, { useState, useEffect } from 'react';
import { 
  X, Upload, Loader2, DollarSign, 
  Calendar, FileText, Tag, Briefcase, Plus,
  Trash2, ExternalLink, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from '@/api/axios';
import { toast } from "react-hot-toast";

const INITIAL_STATE = {
  title: '',
  description: '',
  estimatedValue: '',
  emdAmount: '',
  endDate: '',
  category: '',
  tags: '',
  documents: [],
};

export default function CreateTenderModal({ isOpen, onClose, onSuccess, editData = null }) {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [newFiles, setNewFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editData && isOpen) {
      const formatDate = (dateInput) => {
        try {
          if (!dateInput) return '';
          const date = new Date(dateInput);
          return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
        } catch (e) { return ''; }
      };

      setFormData({
        title: editData.title || '',
        description: editData.description || '',
        estimatedValue: editData.estimatedValue || '',
        emdAmount: editData.emdAmount || '',
        endDate: formatDate(editData.endDate),
        category: editData.category || '',
        tags: Array.isArray(editData.tags) ? editData.tags.join(', ') : (editData.tags || ''),
        documents: editData.documents || [],
      });
      setNewFiles([]);
      setErrors({}); // Reset errors on open
    } else if (!editData && isOpen) {
      setFormData(INITIAL_STATE);
      setNewFiles([]);
      setErrors({});
    }
  }, [editData, isOpen]);

  // --- UPDATED VALIDATION LOGIC ---
  const validateForDraft = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Tender title is required";
    if (!formData.category) newErrors.category = "Please select a category";
    if (!formData.description.trim()) newErrors.description = "Brief description is required";
    if (!formData.endDate) newErrors.endDate = "Set a deadline date";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fill in the missing fields", {
        icon: '⚠️',
        style: { borderRadius: '10px', background: '#18181b', color: '#fff', border: '1px solid #3f3f46' }
      });
      return false;
    }
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for a specific field as user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[name];
        return newErrs;
      });
    }
  };

  const handleRemoveExistingFile = (index) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForDraft()) return;

    setLoading(true);
    try {
      const data = new FormData();
      data.append('documents', JSON.stringify(formData.documents));
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('category', formData.category);
      data.append('estimatedValue', formData.estimatedValue);
      data.append('emdAmount', formData.emdAmount);
      data.append('endDate', formData.endDate);
      data.append('tags', formData.tags);

      newFiles.forEach(file => data.append('documents', file));

      const url = editData ? `/tenders/${editData._id}` : '/tenders';
      await api[editData ? 'patch' : 'post'](url, data);
      
      toast.success(editData ? "Tender updated" : "Draft created successfully");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // --- HELPER COMPONENT FOR LABELS ---
  const FieldLabel = ({ label, name, required = true }) => (
    <div className="flex justify-between items-center mb-1.5">
      <label className="text-sm font-medium text-zinc-400">{label}</label>
      {errors[name] && (
        <span className="text-[11px] text-red-400 flex items-center gap-1 animate-in fade-in slide-in-from-right-1">
          <AlertCircle className="w-3 h-3" /> {errors[name]}
        </span>
      )}
    </div>
  );
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-left">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50 flex-shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {editData ? <FileText className="text-blue-500 w-5 h-5" /> : <Plus className="text-emerald-500 w-5 h-5" />}
            {editData ? 'Edit Tender Draft' : 'Create New Tender'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form id="tender-form" onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <FieldLabel label="Tender Title" name="title" />
              <input 
                name="title" 
                value={formData.title} 
                onChange={handleChange} 
                className={`w-full bg-zinc-900 border ${errors.title ? 'border-red-500/50 bg-red-500/5' : 'border-zinc-800'} rounded-lg py-2.5 px-4 text-white outline-none focus:border-blue-500 transition-all`} 
              />
            </div>

            <div className="space-y-1">
              <FieldLabel label="Category" name="category" />
              <select 
                name="category" 
                value={formData.category} 
                onChange={handleChange} 
                className={`w-full bg-zinc-900 border ${errors.category ? 'border-red-500/50 bg-red-500/5' : 'border-zinc-800'} rounded-lg py-2.5 px-4 text-white outline-none transition-all`}
              >
                <option value="">Select Category</option>
                <option value="IT Services">IT Services</option>
                <option value="Construction">Construction</option>
                <option value="Healthcare">Healthcare</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <FieldLabel label="Description" name="description" />
            <textarea 
              name="description" 
              rows="3" 
              value={formData.description} 
              onChange={handleChange} 
              className={`w-full bg-zinc-900 border ${errors.description ? 'border-red-500/50 bg-red-500/5' : 'border-zinc-800'} rounded-lg p-4 text-white outline-none transition-all`} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Est. Value ($)</label>
              <input type="number" name="estimatedValue" value={formData.estimatedValue} onChange={handleChange} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-white outline-none focus:border-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-400 mb-1.5 block">EMD Amount ($)</label>
              <input type="number" name="emdAmount" value={formData.emdAmount} onChange={handleChange} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-white outline-none focus:border-blue-500" />
            </div>
            <div className="space-y-1">
              <FieldLabel label="End Date" name="endDate" />
              <input 
                type="date" 
                name="endDate" 
                min={today}
                value={formData.endDate} 
                onChange={handleChange} 
                className={`w-full bg-zinc-900 border ${errors.endDate ? 'border-red-500/50 bg-red-500/5' : 'border-zinc-800'} rounded-lg py-2.5 px-4 text-white outline-none focus:border-blue-500 transition-all`} 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-400 flex items-center gap-2 mb-1.5">
              <Tag className="w-4 h-4" /> Search Tags
            </label>
            <input
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="e.g. Infrastructure, Software"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-white outline-none focus:border-blue-500"
            />
          </div>

          {/* Upload Sections remain the same but styled consistently */}
          {formData.documents.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Previous Files</label>
              <div className="grid gap-2">
                {formData.documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl group hover:border-zinc-700 transition-all">
                    <div className="flex items-center gap-3 truncate">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-zinc-300 truncate max-w-[200px]">{doc.name}</span>
                    </div>
                    <button type="button" onClick={() => handleRemoveExistingFile(idx)} className="p-1.5 hover:bg-red-500/10 text-zinc-600 hover:text-red-500 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Documents</label>
            <div className="border-2 border-dashed border-zinc-800 rounded-xl p-6 bg-zinc-900/30 text-center relative hover:border-zinc-700 transition-all">
              <input type="file" multiple onChange={(e) => setNewFiles(Array.from(e.target.files))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <Upload className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
              <p className="text-xs text-zinc-400">{newFiles.length > 0 ? `${newFiles.length} files selected` : "Drop technical files here"}</p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-900/50 flex-shrink-0">
          <Button variant="ghost" onClick={onClose} className="text-zinc-400">Cancel</Button>
          <Button form="tender-form" type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-8">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (editData ? 'Save Changes' : 'Create Draft')}
          </Button>
        </div>
      </div>
    </div>
  );
}