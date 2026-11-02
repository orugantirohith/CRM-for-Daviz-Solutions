import React, { useState, useMemo } from 'react';
import { Building2, Plus, Search, ExternalLink, Globe, Phone, Mail, Users } from 'lucide-react';
import { Company, UserProfile } from '../../types/crm';
import { crmService } from '../../services/crmService';
import { ActionColumn } from '../../components/ui/ActionColumn';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { hasPermission } from '../../lib/permissions/permissionCheck';

interface CompanyListViewProps {
  currentUser: UserProfile;
}

export const CompanyListView: React.FC<CompanyListViewProps> = ({ currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  // Form inputs
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('Logistics & Supply Chain');
  const [website, setWebsite] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emirateState, setEmirateState] = useState('Dubai');
  const [city, setCity] = useState('Dubai');
  const [address, setAddress] = useState('');
  const [sizeBand, setSizeBand] = useState('51-200');
  const [description, setDescription] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const canCreate = hasPermission('companies', 'create', {
    userId: currentUser.id,
    roleId: currentUser.role_id,
  });

  const canDelete = hasPermission('companies', 'delete', {
    userId: currentUser.id,
    roleId: currentUser.role_id,
  });

  const companies = useMemo(() => {
    return crmService.getCompanies(searchQuery);
  }, [searchQuery, refreshKey, currentUser]);

  const handleOpenCreate = () => {
    setEditingCompany(null);
    setName('');
    setIndustry('Logistics & Supply Chain');
    setWebsite('');
    setLinkedinUrl('');
    setPhone('+971 4 ');
    setEmail('');
    setEmirateState('Dubai');
    setCity('Dubai');
    setAddress('');
    setSizeBand('51-200');
    setDescription('');
    setDuplicateWarning(null);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCompany && val.trim().length > 3) {
      const dup = crmService.findDuplicateCompany(val);
      if (dup) {
        setDuplicateWarning(
          `Notice: An existing company record matches this name: "${dup.name}" (${dup.company_code}).`
        );
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingCompany) {
      crmService.updateCompany(editingCompany.id, {
        name: name.trim(),
        normalized_name: name.toLowerCase().trim(),
        industry,
        website,
        linkedin_url: linkedinUrl,
        general_phone: phone,
        general_email: email,
        emirate_state: emirateState,
        city,
        address,
        size_band: sizeBand,
        description,
      });
    } else {
      crmService.createCompany({
        name: name.trim(),
        normalized_name: name.toLowerCase().trim(),
        industry,
        website,
        linkedin_url: linkedinUrl,
        general_phone: phone,
        general_email: email,
        country: 'United Arab Emirates',
        emirate_state: emirateState,
        city,
        address,
        size_band: sizeBand,
        description,
        source: 'Direct Outbound',
        assigned_to: currentUser.id,
        created_by: currentUser.id,
      });
    }

    setRefreshKey((k) => k + 1);
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!companyToDelete) return;
    crmService.deleteCompany(companyToDelete.id);
    setCompanyToDelete(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Enterprise Companies</h2>
          <p className="text-xs text-slate-500">
            Corporate accounts directory, duplicate checking, and associated analytics pipelines
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Company</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 text-xs">
        <div className="flex flex-1 max-w-sm relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search companies by code, name, industry, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-cyan-500"
          />
        </div>
        <span className="text-slate-400 text-[11px] font-medium">
          {companies.length} Registered Companies
        </span>
      </div>

      {/* Table */}
      {/* Mobile Card Stack (Screens < 768px) */}
      <div className="md:hidden space-y-3">
        {companies.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs shadow-xs">
            No registered company accounts found.
          </div>
        ) : (
          companies.map((comp) => (
            <div
              key={comp.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3"
            >
              {/* Card Header: Code & Size Band */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-xs bg-slate-100 text-cyan-700 px-2 py-0.5 rounded border border-slate-200">
                  {comp.company_code}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {comp.size_band || '51-200 Employees'}
                </span>
              </div>

              {/* Company Info */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{comp.name}</h4>
                <p className="text-[11px] text-cyan-700 font-medium mt-0.5">{comp.industry}</p>
                {comp.description && (
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{comp.description}</p>
                )}
              </div>

              {/* Location & Contact Meta */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Location:</span>
                  <span className="font-medium text-slate-800">
                    {comp.city}, {comp.emirate_state}
                  </span>
                </div>
                {comp.general_phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Phone:</span>
                    <span className="font-mono text-slate-700">{comp.general_phone}</span>
                  </div>
                )}
                {comp.general_email && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Email:</span>
                    <span className="text-slate-700 truncate max-w-[190px]">{comp.general_email}</span>
                  </div>
                )}
              </div>

              {/* Card Footer: Leads count & Actions */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <Users className="w-3.5 h-3.5 text-cyan-600" />
                  <span>{comp.lead_count ?? 0} Linked Leads</span>
                </span>

                <ActionColumn
                  websiteUrl={comp.website}
                  linkedinUrl={comp.linkedin_url}
                  phoneNumber={comp.general_phone}
                  recordTitle={comp.name}
                  onEdit={() => {
                    setEditingCompany(comp);
                    setName(comp.name);
                    setIndustry(comp.industry);
                    setWebsite(comp.website || '');
                    setLinkedinUrl(comp.linkedin_url || '');
                    setPhone(comp.general_phone || '');
                    setEmail(comp.general_email || '');
                    setEmirateState(comp.emirate_state);
                    setCity(comp.city);
                    setAddress(comp.address);
                    setSizeBand(comp.size_band || '51-200');
                    setDescription(comp.description || '');
                    setIsModalOpen(true);
                  }}
                  onDelete={canDelete ? () => setCompanyToDelete(comp) : undefined}
                  canEdit={true}
                  canDelete={canDelete}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop & Tablet Table (Screens >= 768px) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Company ID</th>
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-4">Industry</th>
                <th className="py-3 px-4">Location (UAE)</th>
                <th className="py-3 px-4">General Contact</th>
                <th className="py-3 px-4">Size Band</th>
                <th className="py-3 px-4">Related Leads</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {companies.map((comp) => (
                <tr key={comp.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-cyan-700">
                    {comp.company_code}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{comp.name}</span>
                    <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">
                      {comp.description || 'Enterprise account'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{comp.industry}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {comp.city}, {comp.emirate_state}
                  </td>
                  <td className="py-3 px-4 text-[11px]">
                    <span className="font-mono text-slate-700 block">{comp.general_phone || '—'}</span>
                    <span className="text-slate-400 truncate max-w-[140px] block">
                      {comp.general_email || '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {comp.size_band || '51-200'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-cyan-600" />
                      {comp.lead_count ?? 0}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <ActionColumn
                      websiteUrl={comp.website}
                      linkedinUrl={comp.linkedin_url}
                      phoneNumber={comp.general_phone}
                      recordTitle={comp.name}
                      onEdit={() => {
                        setEditingCompany(comp);
                        setName(comp.name);
                        setIndustry(comp.industry);
                        setWebsite(comp.website || '');
                        setLinkedinUrl(comp.linkedin_url || '');
                        setPhone(comp.general_phone || '');
                        setEmail(comp.general_email || '');
                        setEmirateState(comp.emirate_state);
                        setCity(comp.city);
                        setAddress(comp.address);
                        setSizeBand(comp.size_band || '51-200');
                        setDescription(comp.description || '');
                        setIsModalOpen(true);
                      }}
                      onDelete={canDelete ? () => setCompanyToDelete(comp) : undefined}
                      canEdit={true}
                      canDelete={canDelete}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-[#0B132B] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold">
                  {editingCompany ? `Edit Company (${editingCompany.company_code})` : 'Register Company'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {duplicateWarning && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px]">
                  {duplicateWarning}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Al-Futtaim Logistics Division"
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500"
                  >
                    <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                    <option value="Oil & Gas Services">Oil & Gas Services</option>
                    <option value="Hospitality & Leisure">Hospitality & Leisure</option>
                    <option value="Banking & Financial Services">Banking & Financial Services</option>
                    <option value="Government & Public Sector">Government & Public Sector</option>
                    <option value="Retail & E-commerce">Retail & E-commerce</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Company Size Band</label>
                  <select
                    value={sizeBand}
                    onChange={(e) => setSizeBand(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500"
                  >
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="500+">500+ employees</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">General Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+971 4 000 0000"
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">General Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@company.ae"
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Website URL</label>
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
                    placeholder="https://linkedin.com/company/..."
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Emirate</label>
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
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">City / Area</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Business Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Primary core business, data stack, or commercial background..."
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold"
                >
                  Save Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {companyToDelete && (
        <ConfirmDialog
          isOpen={Boolean(companyToDelete)}
          title="Delete Company Account"
          message={`Are you sure you want to delete ${companyToDelete.name} (${companyToDelete.company_code})?`}
          confirmLabel="Delete Company"
          isDestructive={true}
          onConfirm={handleConfirmDelete}
          onCancel={() => setCompanyToDelete(null)}
        />
      )}
    </div>
  );
};
