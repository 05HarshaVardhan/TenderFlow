import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '@/api/axios';
import { BadgeCheck, Building2, FileCheck2, Globe, MapPin, ShieldCheck } from 'lucide-react';

export default function PublicCompanyProfilePage() {
  const { companyId } = useParams();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/companies/public/${companyId}`);
        setCompany(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load company profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId]);

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading company profile...</div>;
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center shadow-2xl">
          <h1 className="text-xl font-semibold">Public Company Profile</h1>
          <p className="mt-2 text-sm text-zinc-400">{error || 'Company not found'}</p>
          <Link to="/dashboard" className="mt-4 inline-block text-sm text-blue-400 hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-7 shadow-2xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-400" />
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Trusted Company Profile</p>
              </div>
              <h1 className="text-3xl font-black tracking-tight">{company.name}</h1>
              <p className="text-sm text-zinc-400">{company.industry || 'Industry not specified'}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[11px] uppercase text-zinc-300">
                  Badge: {company.badge}
                </span>
                {company.isVerified && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase text-emerald-300">
                    Verified
                  </span>
                )}
                <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[11px] uppercase text-blue-300">
                  {company.certificates?.length || 0} Public Certificates
                </span>
              </div>
              {!!company.bio && <p className="pt-1 text-sm leading-relaxed text-zinc-300">{company.bio}</p>}
            </div>

            <div className="h-24 w-24 rounded-full border border-zinc-700 overflow-hidden bg-zinc-900 shadow-lg shrink-0">
              {company.logoUrl ? (
                <img src={company.logoUrl} alt={company.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-3xl font-black text-zinc-500">
                  {company.name?.charAt(0)?.toUpperCase() || 'C'}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-wide">
              <Globe className="h-4 w-4" />
              Website
            </div>
            <div className="mt-2 text-sm">
              {company.website ? (
                <a className="text-blue-400 hover:underline break-all" href={company.website} target="_blank" rel="noreferrer">
                  {company.website}
                </a>
              ) : (
                <span className="text-zinc-400">Not provided</span>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-wide">
              <MapPin className="h-4 w-4" />
              Location
            </div>
            <div className="mt-2 text-sm text-zinc-300">
              {[company.location?.city, company.location?.state, company.location?.country].filter(Boolean).join(', ') || 'Not provided'}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-wide">
              <Building2 className="h-4 w-4" />
              Core Services
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(company.services || []).length > 0 ? (
                company.services.map((service) => (
                  <span key={service} className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">
                    {service}
                  </span>
                ))
              ) : (
                <span className="text-sm text-zinc-400">No services listed</span>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold">Public Certificates</h2>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Compliance and trust documents shared by this company.
          </p>

          <div className="mt-5 grid gap-3">
            {!company.certificates?.length && (
              <p className="text-sm text-zinc-500">No public certificates shared.</p>
            )}
            {(company.certificates || []).map((cert) => (
              <div key={cert.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-zinc-100">{cert.title}</h3>
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] uppercase text-blue-300">
                        <BadgeCheck className="h-3 w-3" /> Public
                      </span>
                    </div>
                    {!!cert.description && <p className="mt-1 text-sm text-zinc-400">{cert.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                      {cert.issuedBy && <span>Issued by: {cert.issuedBy}</span>}
                      {cert.validFrom && <span>From: {String(cert.validFrom).slice(0, 10)}</span>}
                      {cert.validTill && <span>Till: {String(cert.validTill).slice(0, 10)}</span>}
                    </div>
                  </div>
                  <a
                    href={cert.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500/20"
                  >
                    View Certificate
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Access restricted to authenticated TenderFlow users
          </p>
        </section>
      </div>
    </div>
  );
}
