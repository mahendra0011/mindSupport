import { FileText, Paperclip, X } from "lucide-react";
import { formatChatAttachmentSize, isChatImageAttachment, isChatPdfAttachment } from "@/lib/chatAttachments";

export function MessageAttachment({ attachment, sent = false }) {
  if (!attachment?.fileUrl) return null;

  const label = attachment.fileName || (isChatPdfAttachment(attachment) ? "PDF attachment" : "Open attachment");

  if (isChatImageAttachment(attachment)) {
    return (
      <a href={attachment.fileUrl} target="_blank" rel="noreferrer" download={attachment.fileName || undefined} className="mt-2 block overflow-hidden rounded-xl border border-white/10 bg-black/15">
        <img src={attachment.fileUrl} alt={label} className="max-h-64 w-full object-cover" />
        <span className={`block truncate px-3 py-2 text-xs ${sent ? "text-emerald-50" : "text-slate-200"}`}>{label}</span>
      </a>
    );
  }

  return (
    <a
      className={`mt-2 inline-flex max-w-full items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs no-underline transition hover:bg-white/15 ${
        sent ? "text-emerald-50" : "text-emerald-200"
      }`}
      href={attachment.fileUrl}
      target="_blank"
      rel="noreferrer"
      download={attachment.fileName || undefined}
    >
      {isChatPdfAttachment(attachment) ? <FileText className="h-4 w-4 shrink-0" /> : <Paperclip className="h-4 w-4 shrink-0" />}
      <span className="truncate">{label}</span>
    </a>
  );
}

export function ComposerAttachmentPreview({ attachment, onRemove }) {
  if (!attachment?.fileUrl) return null;

  const label = attachment.fileName || "Attachment";
  const meta = [attachment.fileType || (isChatPdfAttachment(attachment) ? "PDF" : "File"), formatChatAttachmentSize(attachment.fileSize)].filter(Boolean).join(" - ");

  return (
    <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0f1921] p-2 text-slate-100">
      {isChatImageAttachment(attachment) ? (
        <img src={attachment.fileUrl} alt={label} className="h-14 w-14 rounded-xl object-cover" />
      ) : (
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-rose-500/15 text-rose-200">
          <FileText className="h-6 w-6" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{label}</span>
        <span className="mt-1 block truncate text-xs text-slate-400">{meta}</span>
      </span>
      <button type="button" onClick={onRemove} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Remove attachment">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
