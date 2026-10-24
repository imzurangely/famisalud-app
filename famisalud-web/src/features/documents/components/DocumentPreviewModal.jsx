import { useEffect, useState } from "react";
import { Download, ExternalLink, FileText, Image as ImageIcon, LoaderCircle, X } from "lucide-react";
import { getDocumentFile } from "../services/documentsService.js";
import { valueOf } from "../utils/documentUtils.js";

function fileType(document) {
  return valueOf(document, "mimeType", "mime_type") || "application/octet-stream";
}

export default function DocumentPreviewModal({ memberId, document, onClose, onError }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const mimeType = fileType(document);
  const fileName = valueOf(document, "originalFileName", "original_file_name") || valueOf(document, "title") || "documento";
  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setLoading(true);
    setError("");
    getDocumentFile(memberId, document.id)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: mimeType }));
        setPreviewUrl(objectUrl);
      })
      .catch((requestError) => {
        if (!active) return;
        const message = requestError?.message || "No fue posible abrir el documento.";
        setError(message);
        onError?.(message);
      })
      .finally(() => { if (active) setLoading(false); });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPreviewUrl("");
    };
  }, [memberId, document.id, mimeType, onError]);

  async function downloadFile() {
    setDownloading(true);
    try {
      const blob = await getDocumentFile(memberId, document.id, { download: true });
      const url = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: mimeType }));
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.rel = "noopener";
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      const message = requestError?.message || "No fue posible descargar el documento.";
      setError(message);
      onError?.(message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6" role="presentation">
      <section className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950" role="dialog" aria-modal="true" aria-label={`Vista previa de ${fileName}`}>
        <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200">{isImage ? <ImageIcon size={18} /> : <FileText size={18} />}</span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{valueOf(document, "title") || fileName}</h2>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{fileName}</p>
          </div>
          <button type="button" onClick={downloadFile} disabled={downloading} className="secondary-button min-h-9 px-3 py-2 text-[11px]" aria-label="Descargar documento">{downloading ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />} <span className="hidden sm:inline">Descargar</span></button>
          {previewUrl && <a href={previewUrl} target="_blank" rel="noreferrer" className="icon-button size-9" aria-label="Abrir en otra pestaña" title="Abrir en otra pestaña"><ExternalLink size={15} /></a>}
          <button type="button" onClick={onClose} className="icon-button size-9" aria-label="Cerrar vista previa"><X size={16} /></button>
        </header>
        <div className="soft-scrollbar min-h-0 flex-1 overflow-auto bg-slate-100 p-2 dark:bg-slate-900 sm:p-4">
          {loading ? (
            <div className="flex min-h-80 items-center justify-center gap-2 text-xs text-slate-500"><LoaderCircle size={18} className="animate-spin" /> Cargando documento…</div>
          ) : error ? (
            <div role="alert" className="mx-auto my-12 max-w-lg rounded-2xl border border-rose-200 bg-white p-6 text-center dark:border-rose-900 dark:bg-slate-950"><p className="text-sm font-bold text-slate-900 dark:text-white">No pudimos abrir este archivo</p><p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{error}</p><button type="button" className="primary-button mt-4" onClick={downloadFile}><Download size={15} /> Intentar descargar</button></div>
          ) : isImage ? (
            <div className="flex min-h-80 items-center justify-center"><img src={previewUrl} alt={fileName} className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-sm" /></div>
          ) : isPdf ? (
            <iframe title={`Vista previa de ${fileName}`} src={previewUrl} className="h-[70vh] min-h-96 w-full rounded-lg border-0 bg-white" />
          ) : (
            <div className="mx-auto my-12 max-w-lg rounded-2xl bg-white p-6 text-center dark:bg-slate-950"><FileText size={32} className="mx-auto text-brand-600" /><p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">La vista previa no está disponible para este formato</p><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Puedes descargar el archivo para abrirlo en tu dispositivo.</p><button type="button" className="primary-button mt-4" onClick={downloadFile}><Download size={15} /> Descargar documento</button></div>
          )}
        </div>
      </section>
    </div>
  );
}
