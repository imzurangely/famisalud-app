import {
  ExternalLink,
  FileImage,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react";
import Button from "../../../shared/components/ui/Button.jsx";
import {
  documentCategoryLabel,
  formatDocumentDate,
  formatFileSize,
  valueOf,
} from "../utils/documentUtils.js";

export default function DocumentCard({
  document,
  canManage,
  onEdit,
  onDelete,
  isTarget = false,
}) {
  const fileUrl = valueOf(document, "fileUrl", "file_url");
  const fileName =
    valueOf(document, "originalFileName", "original_file_name") ||
    "Archivo clínico";
  const mimeType = valueOf(document, "mimeType", "mime_type") || "";
  const Icon = mimeType.startsWith("image/") ? FileImage : FileText;
  return (
    <article
      id={`document-${document.id}`}
      className={`surface-card flex h-full flex-col p-5 transition ${isTarget ? "ring-2 ring-brand-400 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
          <Icon size={21} />
        </span>
        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
          {documentCategoryLabel(document)}
        </span>
      </div>
      <h3 className="mt-4 wrap-break-words text-sm font-extrabold text-slate-900 dark:text-white">
        {valueOf(document, "title") || fileName}
      </h3>
      <p className="mt-1 wrap-break-words text-[11px] text-slate-400">
        {fileName}
      </p>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400">
        <span>
          {formatDocumentDate(
            valueOf(document, "documentDate", "document_date"),
          )}
        </span>
        <span>
          {formatFileSize(valueOf(document, "fileSize", "file_size"))}
        </span>
      </div>
      <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="secondary-button min-h-9 px-3 py-2 text-[11px]"
          >
            <ExternalLink size={14} /> Abrir archivo
          </a>
        )}
        {canManage && (
          <>
            <Button
              variant="ghost"
              className="min-h-9 px-3 py-2"
              onClick={onEdit}
              aria-label="Editar documento"
            >
              <Pencil size={15} />
            </Button>
            <Button
              variant="danger"
              className="min-h-9 px-3 py-2"
              onClick={onDelete}
              aria-label="Eliminar documento"
            >
              <Trash2 size={15} />
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
