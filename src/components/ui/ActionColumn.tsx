import React from 'react';
import { Eye, Edit3, Trash2, Globe, MessageCircle } from 'lucide-react';
import { formatWhatsAppLink } from '../../lib/dates/dubaiDate';

interface ActionColumnProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  websiteUrl?: string;
  linkedinUrl?: string;
  phoneNumber?: string;
  recordTitle?: string;
}

export const ActionColumn: React.FC<ActionColumnProps> = ({
  onView,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = false,
  websiteUrl,
  linkedinUrl,
  phoneNumber,
  recordTitle = 'record',
}) => {
  return (
    <div className="flex items-center gap-1 sm:gap-1.5 justify-end">
      {/* LinkedIn Link (only if exists) */}
      {linkedinUrl && (
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open LinkedIn for ${recordTitle}`}
          title="Open LinkedIn Profile"
          className="min-w-[40px] min-h-[40px] sm:min-w-[32px] sm:min-h-[32px] p-2 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m1.37 9.74v-8.37H5.09v8.37h2.74z" />
          </svg>
        </a>
      )}

      {/* WhatsApp Link (only if valid phone exists) */}
      {phoneNumber && (
        <a
          href={formatWhatsAppLink(phoneNumber, `Hello, this is DAVIZ Solutions regarding our data analytics consultation.`)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open WhatsApp chat with ${recordTitle}`}
          title="Chat on WhatsApp"
          className="min-w-[40px] min-h-[40px] sm:min-w-[32px] sm:min-h-[32px] p-2 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
        >
          <MessageCircle className="w-4 h-4 text-emerald-500" />
        </a>
      )}

      {/* Website Link (only if website exists) */}
      {websiteUrl && (
        <a
          href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Visit website for ${recordTitle}`}
          title="Open Company Website"
          className="min-w-[40px] min-h-[40px] sm:min-w-[32px] sm:min-h-[32px] p-2 flex items-center justify-center text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
        >
          <Globe className="w-4 h-4 text-cyan-600" />
        </a>
      )}

      {/* View Details Action */}
      {onView && (
        <button
          type="button"
          onClick={onView}
          aria-label={`View details of ${recordTitle}`}
          title="View Details"
          className="min-w-[40px] min-h-[40px] sm:min-w-[32px] sm:min-h-[32px] p-2 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Eye className="w-4 h-4" />
        </button>
      )}

      {/* Edit Action (if permitted) */}
      {onEdit && canEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${recordTitle}`}
          title="Edit Record"
          className="min-w-[40px] min-h-[40px] sm:min-w-[32px] sm:min-h-[32px] p-2 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      )}

      {/* Delete Action (if permitted) */}
      {onDelete && canDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${recordTitle}`}
          title="Delete Record"
          className="min-w-[40px] min-h-[40px] sm:min-w-[32px] sm:min-h-[32px] p-2 flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
