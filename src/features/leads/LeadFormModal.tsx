import React, { useState } from 'react';
import { X, Plus, Trash2, Building2, FileText, ArrowRight, Kanban, MapPin, Clock } from 'lucide-react';
import { Lead, LeadStatus, MultiEmail, MultiPhone, UserProfile } from '../../types/crm';
import { crmService } from '../../services/crmService';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUser: UserProfile;
  initialLead?: Lead | null;
}

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUser,
  initialLead,
}) => {
  const companies = crmService.getCompanies();
  const allUsers = crmService.getUsers();

  const [companyId, setCompanyId] = useState(initialLead?.company_id || (companies[0]?.id || ''));
  const [newCompanyName, setNewCompanyName] = useState(initialLead?.company_name || '');
  // Master Table default: always allow typing Company Name directly when creating a new Lead
  const [isNewCompany, setIsNewCompany] = useState(!initialLead || companies.length === 0);
  const [contactName, setContactName] = useState(initialLead?.contact_name || '');
  const [jobTitle, setJobTitle] = useState(initialLead?.job_title || '');
  const [industry, setIndustry] = useState(initialLead?.industry || 'Logistics & Supply Chain');
  const [website, setWebsite] = useState(initialLead?.website || '');
  const [linkedinUrl, setLinkedinUrl] = useState(initialLead?.linkedin_url || '');
  const [whatsappNumber, setWhatsappNumber] = useState(initialLead?.whatsapp_number || '');

  // Multiple phones
  const [phones, setPhones] = useState<MultiPhone[]>(
    initialLead?.phones || [
      { id: '1', phone_number: '+971 50 ', label: 'Direct Mobile', is_primary: true },
    ]
  );

  // Multiple emails
  const [emails, setEmails] = useState<MultiEmail[]>(
    initialLead?.emails || [{ id: '1', email: '', label: 'Work', is_primary: true }]
  );

  const [country] = useState(initialLead?.country || 'United Arab Emirates');
  const [emirateState, setEmirateState] = useState(initialLead?.emirate_state || 'Dubai');
  const [city, setCity] = useState(initialLead?.city || 'Dubai');
  const [area, setArea] = useState(initialLead?.area || '');
  const [address, setAddress] = useState(initialLead?.address || '');
  const [estimatedValue, setEstimatedValue] = useState<number>(initialLead?.estimated_value || 0);
  const [leadSource, setLeadSource] = useState(initialLead?.lead_source || 'Referral');
  const [status, setStatus] = useState<LeadStatus>(initialLead?.status || 'New');
  const [assignedTo, setAssignedTo] = useState(initialLead?.assigned_to || currentUser.id);
  const [priority, setPriority] = useState<Lead['priority']>(initialLead?.priority || 'medium');
  const [details, setDetails] = useState(initialLead?.details || '');
  const [nextFollowUpAt, setNextFollowUpAt] = useState(
    initialLead?.next_follow_up_at ||
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  );
  const [initialNote, setInitialNote] = useState('');

  if (!isOpen) return null;

  const handleAddPhone = () => {
    setPhones([
      ...phones,
      {
        id: Date.now().toString(),
        phone_number: '+971 ',
        label: 'Office Desk',
        is_primary: false,
      },
    ]);
  };

  const handleRemovePhone = (index: number) => {
    if (phones.length <= 1) return;
    setPhones(phones.filter((_, i) => i !== index));
  };

  const handleAddEmail = () => {
    setEmails([
      ...emails,
      { id: Date.now().toString(), email: '', label: 'Secondary', is_primary: false },
    ]);
  };

  const handleRemoveEmail = (index: number) => {
    if (emails.length <= 1) return;
    setEmails(emails.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let resolvedCompanyId = '';
    let resolvedCompanyName = newCompanyName.trim() || 'Enterprise Client';

    if (!isNewCompany && companies.length > 0) {
      const selected = companies.find((c) => c.id === companyId) || companies[0];
      if (selected) {
        resolvedCompanyId = selected.id;
        resolvedCompanyName = selected.name;
      }
    }

    const isPrivileged = currentUser.role_id === 'admin' || currentUser.role_id === 'sales_manager';
    const finalAssignedTo = isPrivileged ? assignedTo : (initialLead?.assigned_to || currentUser.id);
    const assignedUser = allUsers.find((u) => u.id === finalAssignedTo) || currentUser;

    if (initialLead) {
      crmService.updateLead(initialLead.id, {
        company_id: resolvedCompanyId || initialLead.company_id,
        company_name: resolvedCompanyName,
        contact_name: contactName.trim(),
        job_title: jobTitle.trim(),
        industry,
        website,
        linkedin_url: linkedinUrl,
        whatsapp_number: whatsappNumber.trim() || undefined,
        phones,
        emails,
        country,
        emirate_state: emirateState,
        city,
        area: area.trim() || undefined,
        address,
        estimated_value: Number(estimatedValue) || 0,
        lead_source: leadSource,
        assigned_to: finalAssignedTo,
        assigned_user_name: assignedUser ? assignedUser.display_name : currentUser.display_name,
        priority,
        details: details.trim(),
        next_follow_up_at: nextFollowUpAt || null,
      });
    } else {
      const created = crmService.createLead({
        company_id: resolvedCompanyId,
        company_name: resolvedCompanyName,
        contact_name: contactName.trim(),
        job_title: jobTitle.trim(),
        industry,
        website,
        linkedin_url: linkedinUrl,
        whatsapp_number: whatsappNumber.trim() || undefined,
        phones,
        emails,
        country,
        emirate_state: emirateState,
        city,
        area: area.trim() || undefined,
        address,
        estimated_value: Number(estimatedValue) || 0,
        lead_source: leadSource,
        status,
        assigned_to: finalAssignedTo,
        assigned_user_name: assignedUser ? assignedUser.display_name : currentUser.display_name,
        priority,
        details: details.trim(),
        next_follow_up_at: nextFollowUpAt || null,
        created_by: currentUser.id,
      });

      const combinedNote = [
        details.trim() ? `Lead Details (DTLs): ${details.trim()}` : '',
        initialNote.trim() ? `Initial Note: ${initialNote.trim()}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      if (combinedNote) {
        crmService.addLeadNote(created.id, combinedNote);
      }
    }

    onSuccess();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 bg-[#0B132B] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold">
              {initialLead
                ? `Edit Master Lead (${initialLead.lead_code})`
                : 'New Master Lead Entry'}
            </h3>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Auto-Splits Downstream
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
          {/* Master Table Propagation Indicator */}
          <div className="p-3 rounded-xl bg-cyan-50/60 border border-cyan-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-cyan-950">
            <span className="font-semibold">
              Master Table Flow: Entering company details here automatically populates:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 font-semibold text-[10px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-cyan-200 text-slate-700">
                <Kanban className="w-3 h-3 text-cyan-600" /> Sales Pipeline
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-cyan-200 text-slate-700">
                <Building2 className="w-3 h-3 text-indigo-600" /> Companies
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-cyan-200 text-slate-700">
                <MapPin className="w-3 h-3 text-purple-600" /> Client Visits
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-cyan-200 text-slate-700">
                <Clock className="w-3 h-3 text-amber-600" /> Follow-ups
              </span>
            </div>
          </div>

          {/* Company Linking / Creation */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800">Company Information</span>
              {companies.length > 0 && !initialLead && (
                <button
                  type="button"
                  onClick={() => setIsNewCompany(!isNewCompany)}
                  className="text-[11px] text-cyan-600 hover:text-cyan-700 font-medium"
                >
                  {isNewCompany ? 'Select From Existing Companies' : '+ Enter New Company Name'}
                </button>
              )}
            </div>

            {isNewCompany || companies.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="e.g. Emirates Logistics Group"
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Industry Sector</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 bg-white"
                  >
                    <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                    <option value="Oil & Gas Services">Oil & Gas Services</option>
                    <option value="Hospitality & Leisure">Hospitality & Leisure</option>
                    <option value="Banking & Financial Services">Banking & Financial Services</option>
                    <option value="Government & Public Sector">Government & Public Sector</option>
                    <option value="Retail & E-commerce">Retail & E-commerce</option>
                    <option value="Real Estate & Construction">Real Estate & Construction</option>
                    <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                    <option value="Technology & Telecom">Technology & Telecom</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Select Company</label>
                  <select
                    value={companyId}
                    onChange={(e) => {
                      setCompanyId(e.target.value);
                      const sel = companies.find((c) => c.id === e.target.value);
                      if (sel) {
                        setIndustry(sel.industry);
                        setEmirateState(sel.emirate_state);
                        setCity(sel.city);
                      }
                    }}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 bg-white"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.company_code} • {c.city})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Industry Sector</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Contact Person Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Contact Person Name *
              </label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Tariq Al-Nuaimi"
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Job Title / Role *</label>
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Head of Operations / IT Director"
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Multiple Phone Numbers */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-slate-700 font-semibold">
                Phone Numbers (Multiple) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddPhone}
                className="inline-flex items-center gap-1 text-[11px] text-cyan-600 font-medium hover:text-cyan-700"
              >
                <Plus className="w-3 h-3" /> Add Phone
              </button>
            </div>
            <div className="space-y-2">
              {phones.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={p.phone_number}
                    onChange={(e) => {
                      const updated = [...phones];
                      updated[idx].phone_number = e.target.value;
                      setPhones(updated);
                    }}
                    placeholder="+971 50 123 4567"
                    className="flex-1 p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                  />
                  <select
                    value={p.label}
                    onChange={(e) => {
                      const updated = [...phones];
                      updated[idx].label = e.target.value;
                      setPhones(updated);
                    }}
                    className="w-32 p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500 text-slate-700"
                  >
                    <option value="Direct Mobile">Direct Mobile</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Office Desk">Office Desk</option>
                    <option value="HQ Switchboard">Switchboard</option>
                  </select>
                  {phones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhone(idx)}
                      className="p-2 text-slate-400 hover:text-rose-600"
                      title="Remove phone"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Multiple Emails */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-slate-700 font-semibold">
                Email Addresses (Multiple) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddEmail}
                className="inline-flex items-center gap-1 text-[11px] text-cyan-600 font-medium hover:text-cyan-700"
              >
                <Plus className="w-3 h-3" /> Add Email
              </button>
            </div>
            <div className="space-y-2">
              {emails.map((em, idx) => (
                <div key={em.id} className="flex items-center gap-2">
                  <input
                    type="email"
                    required
                    value={em.email}
                    onChange={(e) => {
                      const updated = [...emails];
                      updated[idx].email = e.target.value;
                      setEmails(updated);
                    }}
                    placeholder="contact@company.ae"
                    className="flex-1 p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                  />
                  <select
                    value={em.label}
                    onChange={(e) => {
                      const updated = [...emails];
                      updated[idx].label = e.target.value;
                      setEmails(updated);
                    }}
                    className="w-32 p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500 text-slate-700"
                  >
                    <option value="Work">Work</option>
                    <option value="Personal">Personal</option>
                    <option value="Executive">Executive</option>
                  </select>
                  {emails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(idx)}
                      className="p-2 text-slate-400 hover:text-rose-600"
                      title="Remove email"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* UAE Regional & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Emirate / State</label>
                <select
                  value={emirateState}
                  onChange={(e) => setEmirateState(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500"
                >
                  <option value="Dubai">Dubai</option>
                  <option value="Abu Dhabi">Abu Dhabi</option>
                  <option value="Sharjah">Sharjah</option>
                  <option value="Ajman">Ajman</option>
                  <option value="Ras Al Khaimah">Ras Al Khaimah</option>
                  <option value="Fujairah">Fujairah</option>
                  <option value="Umm Al Quwain">Umm Al Quwain</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">City / District</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Dubai"
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Area / Free Zone</label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. Business Bay / DIFC / JAFZA"
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Address / Building</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Tower, Floor, Office No."
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                />
              </div>
            </div>

              {/* Web, WhatsApp & Social Links */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">WhatsApp Direct (UAE)</label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+971 50 123 4567"
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Company Website</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://company.ae"
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">LinkedIn Profile</label>
                  <input
                    type="text"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Lead Source, Priority & Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Lead Source</label>
                  <select
                    value={leadSource}
                    onChange={(e) => setLeadSource(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500"
                  >
                    <option value="Referral">Referral</option>
                    <option value="Direct Outbound">Direct Outbound</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Website Inbound">Website Inbound</option>
                    <option value="Field Visit">Field Visit</option>
                    <option value="Exhibition / Event">Exhibition / Event</option>
                    <option value="Partner Network">Partner Network</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assigned Agent</label>
                  {currentUser.role_id === 'admin' || currentUser.role_id === 'sales_manager' ? (
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500"
                    >
                      {allUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.display_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={currentUser.display_name}
                      className="w-full p-2 border border-slate-200 bg-slate-100 rounded-lg text-slate-600 font-medium cursor-not-allowed"
                    />
                  )}
                </div>
              </div>

                {/* Pipeline Stage, Deal Value & Scheduled Follow-up / Visit Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Sales Pipeline Stage
                    </label>
                    <select
                      value={status}
                      disabled={Boolean(initialLead)}
                      onChange={(e) => setStatus(e.target.value as LeadStatus)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500 disabled:opacity-60"
                    >
                      <option value="New">New Inbound</option>
                      <option value="Connected">Connected</option>
                      <option value="Qualified">Qualified</option>
                      <option value="Meeting">Scoping Meeting</option>
                      <option value="Proposal Sent">Proposal Sent</option>
                      <option value="Follow-up Required">Follow-up Required</option>
                      <option value="Won">Closed Won</option>
                      <option value="Lost">Closed Lost</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Estimated Deal Value (AED)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={estimatedValue || ''}
                      onChange={(e) => setEstimatedValue(Number(e.target.value) || 0)}
                      placeholder="e.g. 50,000"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Scheduled Visit & Follow-up Date (Dubai)
                    </label>
                    <input
                      type="datetime-local"
                      value={nextFollowUpAt ? nextFollowUpAt.slice(0, 16) : ''}
                      onChange={(e) =>
                        setNextFollowUpAt(
                          e.target.value ? new Date(e.target.value).toISOString() : ''
                        )
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Lead Details (DTLs) */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Lead Details / Requirements (DTLs)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Enter lead details (DTLs), client requirements, technical scope, services needed, or key background..."
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 leading-relaxed"
                  />
                </div>

                {!initialLead && (
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Additional Call / Discovery Note (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={initialNote}
                      onChange={(e) => setInitialNote(e.target.value)}
                      placeholder="Initial conversation summary or next touchpoint context..."
                      className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                    />
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    {initialLead ? 'Save Changes' : 'Create Lead'}
                  </button>
                </div>
              </form>
            </div>
          </div>
          );
};
