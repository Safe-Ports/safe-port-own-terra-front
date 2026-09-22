import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HiPrinter } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import Modal from "@/components/ui/Modal";
import { currency, dateLabel, progress } from "@/services/formatters";
import { clientService } from "@/services/clientService";

function buildPrintHTML(data) {
  const rows = data.clientPayments
    .map(
      (p) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border:1px solid #EBEFED;border-radius:14px;background:#fff;margin-bottom:8px">
      <div>
        <div style="font-size:13px;font-weight:600;color:#1E3D2B">Cuota ${p.installment_n}</div>
        <div style="font-size:11px;color:#83867C;margin-top:2px">${dateLabel(p.due_date)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:13px;font-weight:700;color:#1E3D2B">${currency(p.amount)}</div>
        <div style="font-size:11px;color:#83867C;margin-top:2px">${p.status}</div>
      </div>
    </div>`
    )
    .join("");

  const contracts = data.clientContracts
    .map((c) => {
      const paid = c.payments_summary?.paid ?? 0;
      const total = c.payments_summary?.total ?? 0;
      return `
    <div style="padding:12px 14px;border:1px solid #EBEFED;border-radius:14px;background:#fff;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div>
          <div style="font-size:13px;font-weight:600;color:#1E3D2B">${c.contract_number}</div>
          <div style="font-size:11px;color:#83867C;margin-top:2px">${c.lot?.code || "—"} · ${dateLabel(c.contract_date)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:13px;font-weight:700;color:#1E3D2B">${currency(c.amount)}</div>
          <div style="font-size:11px;color:#83867C;margin-top:2px">${progress(paid, total)}%</div>
        </div>
      </div>
    </div>`;
    })
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Estado de cuenta · ${data.client.name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', Arial, sans-serif; background: #fff; color: #1E3D2B; padding: 32px; }
  h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .sub { font-size: 12px; color: #83867C; margin-bottom: 20px; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
  .stat { background: #FFFFFF; border-radius: 14px; padding: 14px; }
  .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #83867C; }
  .stat-val { font-size: 16px; font-weight: 700; margin-top: 6px; }
  .section { background: #FFFFFF; border: 1px solid #EBEFED; border-radius: 18px; padding: 14px; margin-bottom: 16px; }
  .section-title { font-size: 13px; font-weight: 600; margin-bottom: 10px; }
  @media print { body { padding: 20px; } }
</style></head><body>
<h1>Estado de cuenta · ${data.client.name}</h1>
<div class="sub">Resumen de contratos y pagos · ${new Date().toLocaleDateString("es-MX")}</div>
<div class="stats">
  <div class="stat"><div class="stat-label">Inversión</div><div class="stat-val">${currency(data.totalInvestment)}</div></div>
  <div class="stat"><div class="stat-label">Pagado</div><div class="stat-val">${currency(data.totalPaid)}</div></div>
  <div class="stat"><div class="stat-label">Saldo</div><div class="stat-val" style="color:#C0392B">${currency(data.balance)}</div></div>
</div>
<div class="section"><div class="section-title">Contratos</div>${contracts}</div>
<div class="section"><div class="section-title">Historial de pagos</div>${rows}</div>
</body></html>`;
}

function ClientReportModal() {
  const { ui, reportClientId, closeClientReport, showToast, showError } = useAppContext();
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);

  // Los datos de ESTE cliente, pedidos al servidor.
  //
  // Antes salían de filtrar los arreglos globales del contexto, que vienen
  // recortados (contratos 100, cuotas 200 como mucho). O sea que a un cliente con
  // contratos fuera de ese corte se le mostraba —y se le IMPRIMÍA— un estado de
  // cuenta al que le faltaban cuotas: "pagado" y "saldo" quedaban mal. Y como el
  // botón "Descargar PDF" pide el estado de cuenta al backend, que sí ve todo,
  // los dos papeles del mismo cliente podían no coincidir.
  //
  // Estos endpoints devuelven las cuotas y contratos del cliente COMPLETOS, sin
  // paginar; son los mismos que ya usa el estado de cuenta de la pantalla de
  // Reportes, que por eso siempre estuvo bien.
  const habilitado = Boolean(ui.clientReport && reportClientId);
  const { data: cliente } = useQuery({
    queryKey: ["client-detail", reportClientId],
    queryFn: () => clientService.get(reportClientId),
    enabled: habilitado,
  });
  const { data: contractsData, isPending: contratosCargando } = useQuery({
    queryKey: ["client-contracts", reportClientId],
    queryFn: () => clientService.contracts(reportClientId),
    enabled: habilitado,
  });
  const { data: paymentsData, isPending: cuotasCargando } = useQuery({
    queryKey: ["client-payments", reportClientId],
    queryFn: () => clientService.payments(reportClientId),
    enabled: habilitado,
  });

  const cargando = habilitado && (contratosCargando || cuotasCargando || !cliente);

  const data = useMemo(() => {
    if (!cliente) return null;
    const clientContracts = contractsData?.items || [];
    const clientPayments = paymentsData?.items || [];
    const totalInvestment = clientContracts.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const totalPaid = clientPayments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return {
      client: cliente,
      clientContracts,
      clientPayments,
      totalInvestment,
      totalPaid,
      balance: Math.max(0, totalInvestment - totalPaid),
    };
  }, [cliente, contractsData, paymentsData]);

  // Mientras llegan, no se pinta un estado de cuenta a medias: los importes de
  // este modal se imprimen y se le entregan al cliente.
  if (cargando) {
    return (
      <Modal
        open={ui.clientReport}
        icon={<HiPrinter />}
        title="Estado de cuenta"
        subtitle="Cargando los movimientos del cliente…"
        onClose={closeClientReport}
        width="max-w-[920px]"
      >
        <div className="py-10 text-center text-sm text-[#83867C]">Cargando…</div>
      </Modal>
    );
  }

  if (!data) return null;

  const downloadBackendPdf = async () => {
    setDownloading(true);
    try {
      const blob = await clientService.statementPdf(data.client.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `estado_cuenta_${data.client.name.replace(/\s+/g, "_").toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast("Estado de cuenta descargado");
    } catch (err) {
      showError(err, "No se pudo descargar el estado de cuenta");
    } finally {
      setDownloading(false);
    }
  };

  const sendBackendPdf = async () => {
    setSending(true);
    try {
      await clientService.sendStatement(data.client.id);
      showToast("Estado de cuenta enviado por correo");
    } catch (err) {
      showError(err, "No se pudo enviar el estado de cuenta");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={ui.clientReport}
      icon={<HiPrinter />}
      title={`Estado de cuenta · ${data.client.name}`}
      subtitle="Resumen de contratos y pagos"
      onClose={closeClientReport}
      width="max-w-[920px]"
      footer={
        <>
          <button className="btn-s" onClick={closeClientReport}>Cerrar</button>
          <button className="btn-s" onClick={sendBackendPdf} disabled={sending || !data.client.email}>
            {sending ? "Enviando..." : "Enviar por correo"}
          </button>
          <button className="btn-s" onClick={downloadBackendPdf} disabled={downloading}>
            {downloading ? "Descargando..." : "Descargar PDF"}
          </button>
          <button className="btn-p" onClick={() => {
            const iframe = document.createElement("iframe");
            iframe.style.cssText = "position:fixed;width:0;height:0;border:0;visibility:hidden";
            document.body.appendChild(iframe);
            iframe.contentDocument.open();
            iframe.contentDocument.write(buildPrintHTML(data));
            iframe.contentDocument.close();
            iframe.onload = () => {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
              setTimeout(() => document.body.removeChild(iframe), 2000);
            };
          }}>Imprimir / PDF</button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[22px] bg-[#FFFFFF] p-4">
            <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#83867C]">Inversión</div>
            <div className="mt-2 text-lg font-bold text-[#1E3D2B]">{currency(data.totalInvestment)}</div>
          </div>
          <div className="rounded-[22px] bg-[#FFFFFF] p-4">
            <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#83867C]">Pagado</div>
            <div className="mt-2 text-lg font-bold text-[#1E3D2B]">{currency(data.totalPaid)}</div>
          </div>
          <div className="rounded-[22px] bg-[#FFFFFF] p-4">
            <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#83867C]">Saldo</div>
            <div className="mt-2 text-lg font-bold text-[#C0392B]">{currency(data.balance)}</div>
          </div>
        </div>

        <div className="rounded-[24px] border border-[#EBEFED] bg-[#FFFFFF] p-4">
          <div className="text-sm font-semibold text-[#1E3D2B]">Contratos</div>
          <div className="mt-3 space-y-3">
            {data.clientContracts.map((contract) => {
              const paid = contract.payments_summary?.paid ?? 0;
              const total = contract.payments_summary?.total ?? 0;
              return (
                <div key={contract.id} className="rounded-[20px] border border-[#EBEFED] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#1E3D2B]">{contract.contract_number}</div>
                      <div className="mt-1 text-xs text-[#83867C]">
                        {contract.lot?.code || "—"} · {dateLabel(contract.contract_date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#1E3D2B]">{currency(contract.amount)}</div>
                      <div className="mt-1 text-xs text-[#83867C]">{progress(paid, total)}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[24px] border border-[#EBEFED] bg-[#FFFFFF] p-4">
          <div className="text-sm font-semibold text-[#1E3D2B]">Historial de pagos</div>
          <div className="mt-3 space-y-3">
            {data.clientPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-[20px] border border-[#EBEFED] bg-white p-4">
                <div>
                  <div className="text-sm font-semibold text-[#1E3D2B]">Cuota {payment.installment_n}</div>
                  <div className="mt-1 text-xs text-[#83867C]">{dateLabel(payment.due_date)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[#1E3D2B]">{currency(payment.amount)}</div>
                  <div className="mt-1 text-xs text-[#83867C]">{payment.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default ClientReportModal;
