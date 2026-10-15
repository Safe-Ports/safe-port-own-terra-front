import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { HiArrowDownTray, HiCheckCircle, HiShare } from "react-icons/hi2";
import { passWindowText, visitorTypeLabel } from "./accessModel";
import "./qr-pass.css";

const slug = (text) => (text || "pase").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase();

/**
 * Pase recién creado. El QR sólo existe en este momento: el backend no lo vuelve a
 * entregar, así que la tarjeta invita a compartirlo o guardarlo ya.
 */
function QrPass({ pass, place, onDone }) {
  const canvasRef = useRef(null);
  const [note, setNote] = useState("");
  const fileName = `pase-${slug(pass.fullName)}.png`;
  const text = `Pase de acceso para ${pass.fullName}${place ? ` · ${place}` : ""}. Válido ${passWindowText(pass.validFrom, pass.validUntil)}. Muestra este código en caseta.`;

  const blob = () => new Promise((resolve) => canvasRef.current?.toBlob(resolve, "image/png"));
  const download = async () => {
    const file = await blob(); if (!file) return;
    const url = URL.createObjectURL(file);
    const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
    link.click(); URL.revokeObjectURL(url);
    setNote("Imagen guardada.");
  };
  const share = async () => {
    const file = await blob();
    const shareFile = file ? new File([file], fileName, { type: "image/png" }) : null;
    try {
      if (shareFile && navigator.canShare?.({ files: [shareFile] })) await navigator.share({ files: [shareFile], text });
      else { await download(); return; }
      setNote("Pase compartido.");
    } catch (failure) { if (failure?.name !== "AbortError") setNote("No se pudo compartir; descarga la imagen."); }
  };

  return <article className="qr-pass" aria-label={`Pase de ${pass.fullName}`}>
    <header><HiCheckCircle/><div><strong>Pase listo</strong><small>{visitorTypeLabel(pass.visitorType)}{place ? ` · ${place}` : ""}</small></div></header>
    <div className="qr-pass-body">
      <div className="qr-pass-code"><QRCodeCanvas ref={canvasRef} value={pass.qrToken} size={232} marginSize={2} level="M" title={`Código QR del pase de ${pass.fullName}`}/></div>
      <div className="qr-pass-info">
        <h3>{pass.fullName}</h3>
        <p>{passWindowText(pass.validFrom, pass.validUntil)}</p>
        <p>{pass.maxEntries > 1 ? `${pass.maxEntries} entradas` : "Una sola entrada"}{pass.vehiclePlate ? ` · Placas ${pass.vehiclePlate.toUpperCase()}` : ""}</p>
        <p className="qr-pass-warning">Compártelo o guárdalo ahora. Por seguridad este código no se vuelve a mostrar; si se pierde, crea un pase nuevo.</p>
      </div>
    </div>
    <footer>
      <button type="button" className="primary" onClick={share}><HiShare/> Compartir</button>
      <button type="button" onClick={download}><HiArrowDownTray/> Descargar</button>
      {onDone ? <button type="button" onClick={onDone}>Listo</button> : null}
      {note ? <span role="status">{note}</span> : null}
    </footer>
  </article>;
}

export default QrPass;
