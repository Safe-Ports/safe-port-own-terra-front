import InlineError from "@/components/shared/InlineError";
import { parseApiError } from "@/errors/parseApiError";
import { COMMUNITY_IMAGES } from "../community/communityImages";
import { useRef, useState } from "react";
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
    queryFn: async () => { const assets=await propertiesService.media.list(entityType, entityId); if(!Array.isArray(assets))throw new Error("La galería recibió una respuesta inesperada.");return assets; },
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
function MediaGallery({ entityType, entityId, editable = false, label = "Fotos", library = false, emptyText = "Aún no hay fotos." }) {
  const { showToast } = useAppContext();
  const client = useQueryClient();
  const input = useRef(null);
  const [actionError,setActionError]=useState(null);
  const [broken,setBroken]=useState([]);
  const pendingFiles=useRef([]);
  const [preparing,setPreparing]=useState(false);
  const { all, images, isLoading, isError, error, refetch, isFetching } = useEntityMedia(entityType, entityId);
  const refresh = () => client.invalidateQueries({ queryKey: mediaQueryKey(entityType, entityId) });
  const fail = error => setActionError(parseApiError(error,"No se pudo guardar el archivo. Puedes reintentar."));

  const upload = useMutation({
    mutationFn: async (files) => {
      setActionError(null);pendingFiles.current=files;
      for(let index=0;index<files.length;index++){
        const asset=await propertiesService.media.upload(entityType,entityId,files[index]);
        if(!asset?.id)throw new Error("No recibimos la confirmación del archivo guardado.");
        pendingFiles.current=files.slice(index+1);
        client.setQueryData(mediaQueryKey(entityType,entityId),previous=>[...(previous||[]).filter(item=>item.id!==asset.id),asset]);
      }
    },
    onSuccess: (_, files) => showToast(files.length > 1 ? `${files.length} fotos guardadas en la galería` : "Foto guardada en la galería", "success"),
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

  const busy = preparing || upload.isPending || remove.isPending || makeCover.isPending;
  const chooseLibrary=async image=>{
    if(busy||isError||isLoading||!entityId)return;
    setPreparing(true);setActionError(null);
    try{const response=await fetch(image.src);if(!response.ok)throw new Error("No se pudo abrir la imagen elegida.");const blob=await response.blob();upload.mutate([new File([blob],image.filename,{type:blob.type||"image/jpeg"})]);}
    catch(error){fail(error)}finally{setPreparing(false)}
  };
  const retryRead=()=>{setBroken([]);return refetch()};
  return <section className={`media-gallery ${editable ? "is-editable" : ""}`} aria-label={label}>
    {editable ? <header><strong>{label}</strong><small>La primera foto es la portada. JPG, PNG, WEBP o HEIC · máx. 10 MB.</small></header> : null}
    {isLoading?<p role="status">Cargando archivos guardados…</p>:null}
    {isError?<InlineError error={parseApiError(error,"No pudimos consultar los archivos guardados.")}><button type="button" onClick={retryRead} disabled={isFetching}>Reintentar galería</button></InlineError>:null}
    {actionError?<InlineError error={actionError}>{pendingFiles.current.length?<button type="button" disabled={busy} onClick={()=>upload.mutate(pendingFiles.current)}>Reintentar archivos pendientes</button>:null}</InlineError>:null}
    {broken.length?<p className="media-gallery-warning" role="alert">El archivo figura en la galería, pero no pudimos abrir su imagen. <button type="button" onClick={retryRead} disabled={isFetching}>Actualizar imágenes</button></p>:null}
    {!isLoading&&!isError?<p className="media-gallery-status">{images.length?`${images.length} foto${images.length===1?"":"s"} en la galería`:"Aún no hay fotos guardadas."}</p>:null}
    <div className="media-gallery-grid">
      {images.map((asset, index) => <figure key={asset.id} className={index === 0 ? "is-cover" : ""}>
        <img src={asset.url} alt={asset.filename} loading="lazy" onError={()=>setBroken(previous=>previous.includes(asset.id)?previous:[...previous,asset.id])} onLoad={()=>setBroken(previous=>previous.filter(id=>id!==asset.id))} />
        {index === 0 ? <figcaption>Portada</figcaption> : null}
        {editable ? <span className="media-gallery-actions">
          {index > 0 ? <button type="button" disabled={busy} onClick={() => makeCover.mutate(asset.id)} aria-label={`Usar ${asset.filename} como portada`} title="Usar como portada"><HiStar /></button> : null}
          <button type="button" disabled={busy} onClick={() => remove.mutate(asset.id)} aria-label={`Eliminar ${asset.filename}`} title="Eliminar"><HiTrash /></button>
        </span> : null}
      </figure>)}
      {editable ? <button type="button" className="media-gallery-add" disabled={busy || !entityId || isLoading || isError} onClick={() => input.current?.click()}>
        <HiPlus /><span>{upload.isPending ? "Subiendo…" : "Agregar fotos"}</span>
      </button> : null}
      {!editable && !images.length && !isLoading && !isError ? <p className="media-gallery-empty"><HiPhoto /> {emptyText}</p> : null}
    </div>
    {editable&&library?<details className="community-image-library"><summary>Elegir una imagen de images_condos</summary><p>Al elegirla, se sube a la galería de esta comunidad.</p><div>{COMMUNITY_IMAGES.map(image=><button key={image.src} type="button" disabled={busy||isError||isLoading||!entityId} onClick={()=>chooseLibrary(image)} aria-label={`Agregar ${image.filename} a la comunidad`}><img src={image.src} alt="" loading="lazy"/><span>{image.filename}</span></button>)}</div></details>:null}
    {editable ? <input ref={input} type="file" accept={IMAGE_TYPES.join(",")} multiple hidden onChange={pick} data-testid="media-gallery-input" /> : null}
  </section>;
}

export default MediaGallery;
