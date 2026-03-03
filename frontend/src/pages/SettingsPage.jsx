import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/api/axios';
import { useAuth } from '@/context/authContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Upload } from 'lucide-react';

const emptyCompany = {
  name: '',
  emailDomain: '',
  industry: '',
  services: [],
  bio: '',
  website: '',
  registrationNumber: '',
  contactEmail: '',
  contactPhone: '',
  location: { country: '', state: '', city: '' },
  logoUrl: null,
  certificates: [],
};

const emptyCertificateForm = {
  title: '',
  description: '',
  issuedBy: '',
  validFrom: '',
  validTill: '',
  isPublic: true,
};

export default function SettingsPage() {
  const { updateUser } = useAuth();
  const [company, setCompany] = useState(emptyCompany);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const [savingCertificate, setSavingCertificate] = useState(false);
  const [certFile, setCertFile] = useState(null);
  const [newCertificate, setNewCertificate] = useState(emptyCertificateForm);
  const [editingCertificateId, setEditingCertificateId] = useState(null);
  const [editingCertificateForm, setEditingCertificateForm] = useState(emptyCertificateForm);
  const logoInputRef = useRef(null);
  const certInputRef = useRef(null);

  const servicesText = useMemo(() => (company.services || []).join(', '), [company.services]);
  const [servicesInput, setServicesInput] = useState('');

  const loadCompany = async () => {
    try {
      const { data } = await api.get('/companies/me');
      setCompany({ ...emptyCompany, ...data, location: { ...emptyCompany.location, ...(data.location || {}) } });
      setServicesInput((data.services || []).join(', '));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompany();
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload = {
        name: company.name,
        industry: company.industry,
        bio: company.bio,
        website: company.website,
        registrationNumber: company.registrationNumber,
        contactEmail: company.contactEmail,
        contactPhone: company.contactPhone,
        services: servicesInput.split(',').map((v) => v.trim()).filter(Boolean),
        location: company.location,
      };
      const { data } = await api.patch('/companies/me', payload);
      setCompany({ ...emptyCompany, ...data.company, location: { ...emptyCompany.location, ...(data.company.location || {}) } });
      setServicesInput((data.company.services || []).join(', '));
      updateUser({ companyName: data.company.name });
      toast.success('Company profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update company profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('logo', file);

    setSavingLogo(true);
    try {
      const { data } = await api.patch('/companies/me/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCompany((prev) => ({ ...prev, logoUrl: data.logoUrl || null }));
      toast.success('Company logo updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload company logo');
    } finally {
      setSavingLogo(false);
      event.target.value = '';
    }
  };

  const handleLogoRemove = async () => {
    setSavingLogo(true);
    try {
      await api.delete('/companies/me/logo');
      setCompany((prev) => ({ ...prev, logoUrl: null }));
      toast.success('Company logo removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove company logo');
    } finally {
      setSavingLogo(false);
    }
  };

  const handleCertificateCreate = async (e) => {
    e.preventDefault();
    if (!certFile) {
      toast.error('Please choose a certificate file');
      return;
    }

    const formData = new FormData();
    formData.append('certificateFile', certFile);
    Object.entries(newCertificate).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) formData.append(key, value);
    });

    setSavingCertificate(true);
    try {
      const { data } = await api.post('/companies/me/certificates', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCompany((prev) => ({ ...prev, certificates: [data.certificate, ...(prev.certificates || [])] }));
      setNewCertificate(emptyCertificateForm);
      setCertFile(null);
      if (certInputRef.current) certInputRef.current.value = '';
      toast.success('Certificate uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload certificate');
    } finally {
      setSavingCertificate(false);
    }
  };

  const startCertificateEdit = (cert) => {
    setEditingCertificateId(cert.id);
    setEditingCertificateForm({
      title: cert.title || '',
      description: cert.description || '',
      issuedBy: cert.issuedBy || '',
      validFrom: cert.validFrom ? String(cert.validFrom).slice(0, 10) : '',
      validTill: cert.validTill ? String(cert.validTill).slice(0, 10) : '',
      isPublic: cert.isPublic !== false,
    });
  };

  const handleCertificateEditSave = async (certId) => {
    try {
      const { data } = await api.patch(`/companies/me/certificates/${certId}`, editingCertificateForm);
      setCompany((prev) => ({
        ...prev,
        certificates: (prev.certificates || []).map((item) => (item.id === certId ? data.certificate : item)),
      }));
      setEditingCertificateId(null);
      toast.success('Certificate updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update certificate');
    }
  };

  const handleCertificateDelete = async (certId) => {
    try {
      await api.delete(`/companies/me/certificates/${certId}`);
      setCompany((prev) => ({
        ...prev,
        certificates: (prev.certificates || []).filter((item) => item.id !== certId),
      }));
      toast.success('Certificate deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete certificate');
    }
  };

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-2xl font-semibold">Company Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your company profile, public certifications, and branding. Email domain and access controls are locked.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Company Logo</h2>
            <p className="text-sm text-muted-foreground">Displayed on your dashboard and public company profile areas.</p>
          </div>
          <div className="h-16 w-16 overflow-hidden rounded-full border border-border bg-muted">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt={company.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-muted-foreground">
                {company.name?.charAt(0)?.toUpperCase() || 'C'}
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          <Button type="button" onClick={() => logoInputRef.current?.click()} disabled={savingLogo}>
            <Upload className="mr-2 h-4 w-4" />
            {company.logoUrl ? 'Change Logo' : 'Upload Logo'}
          </Button>
          {company.logoUrl && (
            <Button type="button" variant="outline" onClick={handleLogoRemove} disabled={savingLogo}>
              Remove Logo
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Company Profile</h2>
        <form onSubmit={handleProfileSave} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Company Name</Label>
            <Input value={company.name} onChange={(e) => setCompany((p) => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="grid gap-2">
            <Label>Email Domain (Locked)</Label>
            <Input value={company.emailDomain} disabled />
          </div>
          <div className="grid gap-2">
            <Label>Industry</Label>
            <Input value={company.industry} onChange={(e) => setCompany((p) => ({ ...p, industry: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Website</Label>
            <Input
              value={company.website}
              onChange={(e) => setCompany((p) => ({ ...p, website: e.target.value }))}
              placeholder="https://example.com"
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Services (comma separated)</Label>
            <Input value={servicesInput} onChange={(e) => setServicesInput(e.target.value)} />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Company Bio</Label>
            <Textarea
              value={company.bio}
              onChange={(e) => setCompany((p) => ({ ...p, bio: e.target.value }))}
              rows={4}
              placeholder="Describe your company capabilities and strengths..."
            />
          </div>
          <div className="grid gap-2">
            <Label>Registration Number</Label>
            <Input
              value={company.registrationNumber}
              onChange={(e) => setCompany((p) => ({ ...p, registrationNumber: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Contact Email</Label>
            <Input
              type="email"
              value={company.contactEmail}
              onChange={(e) => setCompany((p) => ({ ...p, contactEmail: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Contact Phone</Label>
            <Input
              value={company.contactPhone}
              onChange={(e) => setCompany((p) => ({ ...p, contactPhone: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Country</Label>
            <Input
              value={company.location.country || ''}
              onChange={(e) => setCompany((p) => ({ ...p, location: { ...p.location, country: e.target.value } }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>State</Label>
            <Input
              value={company.location.state || ''}
              onChange={(e) => setCompany((p) => ({ ...p, location: { ...p.location, state: e.target.value } }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>City</Label>
            <Input
              value={company.location.city || ''}
              onChange={(e) => setCompany((p) => ({ ...p, location: { ...p.location, city: e.target.value } }))}
            />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Company Profile'}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Public Certificates</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload compliance certificates, registrations, and quality documents. Marked public certificates can be shown in bidder/company trust views.
        </p>

        <form onSubmit={handleCertificateCreate} className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Certificate Title</Label>
            <Input
              value={newCertificate.title}
              onChange={(e) => setNewCertificate((p) => ({ ...p, title: e.target.value }))}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>Issued By</Label>
            <Input
              value={newCertificate.issuedBy}
              onChange={(e) => setNewCertificate((p) => ({ ...p, issuedBy: e.target.value }))}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Description</Label>
            <Input
              value={newCertificate.description}
              onChange={(e) => setNewCertificate((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Valid From</Label>
            <Input
              type="date"
              value={newCertificate.validFrom}
              onChange={(e) => setNewCertificate((p) => ({ ...p, validFrom: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Valid Till</Label>
            <Input
              type="date"
              value={newCertificate.validTill}
              onChange={(e) => setNewCertificate((p) => ({ ...p, validTill: e.target.value }))}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Certificate File</Label>
            <Input
              ref={certInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => setCertFile(e.target.files?.[0] || null)}
              required
            />
          </div>
          <label className="md:col-span-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newCertificate.isPublic}
              onChange={(e) => setNewCertificate((p) => ({ ...p, isPublic: e.target.checked }))}
            />
            Make this certificate public
          </label>
          <div className="md:col-span-2">
            <Button type="submit" disabled={savingCertificate}>
              {savingCertificate ? 'Uploading...' : 'Upload Certificate'}
            </Button>
          </div>
        </form>

        <div className="mt-6 space-y-3">
          {(company.certificates || []).length === 0 && (
            <p className="text-sm text-muted-foreground">No certificates uploaded yet.</p>
          )}
          {(company.certificates || []).map((cert) => (
            <div key={cert.id} className="rounded-lg border border-border p-4">
              {editingCertificateId === cert.id ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    value={editingCertificateForm.title}
                    onChange={(e) => setEditingCertificateForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Title"
                  />
                  <Input
                    value={editingCertificateForm.issuedBy}
                    onChange={(e) => setEditingCertificateForm((p) => ({ ...p, issuedBy: e.target.value }))}
                    placeholder="Issued by"
                  />
                  <Input
                    className="md:col-span-2"
                    value={editingCertificateForm.description}
                    onChange={(e) => setEditingCertificateForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Description"
                  />
                  <Input
                    type="date"
                    value={editingCertificateForm.validFrom}
                    onChange={(e) => setEditingCertificateForm((p) => ({ ...p, validFrom: e.target.value }))}
                  />
                  <Input
                    type="date"
                    value={editingCertificateForm.validTill}
                    onChange={(e) => setEditingCertificateForm((p) => ({ ...p, validTill: e.target.value }))}
                  />
                  <label className="md:col-span-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editingCertificateForm.isPublic}
                      onChange={(e) => setEditingCertificateForm((p) => ({ ...p, isPublic: e.target.checked }))}
                    />
                    Public certificate
                  </label>
                  <div className="md:col-span-2 flex gap-2">
                    <Button type="button" onClick={() => handleCertificateEditSave(cert.id)}>Save</Button>
                    <Button type="button" variant="outline" onClick={() => setEditingCertificateId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{cert.title}</h3>
                      <Badge variant={cert.isPublic ? 'default' : 'secondary'}>
                        {cert.isPublic ? 'Public' : 'Private'}
                      </Badge>
                    </div>
                    {!!cert.description && <p className="text-sm text-muted-foreground mt-1">{cert.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {cert.issuedBy && <span>Issued by: {cert.issuedBy}</span>}
                      {cert.validFrom && <span>From: {String(cert.validFrom).slice(0, 10)}</span>}
                      {cert.validTill && <span>Till: {String(cert.validTill).slice(0, 10)}</span>}
                    </div>
                    <a href={cert.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-blue-500 hover:underline">
                      View Certificate
                    </a>
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => startCertificateEdit(cert)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleCertificateDelete(cert.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
