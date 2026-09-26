import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HiPhoto, HiPlus, HiStar, HiTrash } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import propertiesService from "@/services/propertiesService";
import "./media-gallery.css";

// Mismos límites que properties-back (media/service.py): así el error se ve
// antes de subir y no después de esperar la carga.
const MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export const mediaQueryKey = (entityType, entityId) => ["properties", "media", entityType, entityId];

/** Fotos de una entidad; la primera es la portada. Las URLs vienen firmadas y
 *  vencen, por eso la caché dura poco. */
export function useEntityMedia(entityType, entityId) {
  const query = useQuery({
    queryKey: mediaQueryKey(entityType, entityId),
    queryFn: () => propertiesService.media.list(entityType, entityId),
    enabled: Boolean(entityId),
    staleTime: 4 * 60 * 1000,
    retry: false,
  });
  const all = query.data || [];
  return { ...query, all, images: all.filter((asset) => asset.content_type?.startsWith("image/") && asset.url) };
}

/**
 * Galería de fotos de una comunidad (`inmueble`) o de una unidad (`property`).
 * En modo lectura sólo muestra; con `editable` permite subir, elegir portada y borrar.
 */
function MediaGallery({ entityType, entityId, editable = false, label = "Fotos", emptyText = "Aún no hay fotos." }) {
  const { showToast } = useAppContext();
  const client = useQueryClient();
  const input = useRef(null);
  const { all, images, isLoading } = useEntityMedia(entityType, entityId);
  const refresh = () => client.invalidateQueries({ queryKey: mediaQueryKey(entityType, entityId) });
  const fail = (error) => showToast(error.response?.data?.error?.message || error.message, "warning");

  const upload = useMutation({
    mutationFn: async (files) => { for (const file of files) await propertiesService.media.upload(entityType, entityId, file); },
    onSuccess: (_, files) => showToast(files.length > 1 ? `${files.length} fotos agregadas` : "Foto agregada", "success"),
    onError: fail,
    onSettled: refresh,
  });
  const remove = useMutation({ mutationFn: (id) => propertiesService.media.remove(id), onSuccess: () => showToast("Foto eliminada", "success"), onError: fail, onSettled: refresh });
  // El backend exige la lista completa de la galería (incluye PDFs) para reordenar.
  const makeCover = useMutation({
    mutationFn: (id) => propertiesService.media.reorder(entityType, entityId, [id, ...all.map((asset) => asset.id).filter((assetId) => assetId !== id)]),
    onSuccess: () => showToast("Portada actualizada", "success"),
    onError: fail,
    onSettled: refresh,
  });

  const pick = (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = "";
    const rejected = files.filter((file) => !IMAGE_TYPES.includes(file.type) || file.size > MAX_BYTES);
    if (rejected.length) showToast(`${rejected.map((file) => file.name).join(", ")}: sólo JPG, PNG, WEBP o HEIC de hasta 10 MB.`, "warning");
    const valid = files.filter((file) => !rejected.includes(file));
    if (valid.length) upload.mutate(valid);
  };

  const busy = upload.isPending || remove.isPending || makeCover.isPending;
  return <section className={`media-gallery ${editable ? "is-editable" : ""}`} aria-label={label}>
    {editable ? <header><strong>{label}</strong><small>La primera foto es la portada. JPG, PNG, WEBP o HEIC · máx. 10 MB.</small></header> : null}
    <div className="media-gallery-grid">
      {images.map((asset, index) => <figure key={asset.id} className={index === 0 ? "is-cover" : ""}>
        <img src={asset.url} alt={asset.filename} loading="lazy" />
        {index === 0 ? <figcaption>Portada</figcaption> : null}
        {editable ? <span className="media-gallery-actions">
          {index > 0 ? <button type="button" disabled={busy} onClick={() => makeCover.mutate(asset.id)} aria-label={`Usar ${asset.filename} como portada`} title="Usar como portada"><HiStar /></button> : null}
          <button type="button" disabled={busy} onClick={() => remove.mutate(asset.id)} aria-label={`Eliminar ${asset.filename}`} title="Eliminar"><HiTrash /></button>
        </span> : null}
      </figure>)}
      {editable ? <button type="button" className="media-gallery-add" disabled={busy || !entityId} onClick={() => input.current?.click()}>
        <HiPlus /><span>{upload.isPending ? "Subiendo…" : "Agregar fotos"}</span>
      </button> : null}
      {!editable && !images.length && !isLoading ? <p className="media-gallery-empty"><HiPhoto /> {emptyText}</p> : null}
    </div>
    {editable ? <input ref={input} type="file" accept={IMAGE_TYPES.join(",")} multiple hidden onChange={pick} data-testid="media-gallery-input" /> : null}
  </section>;
}

export default MediaGallery;
