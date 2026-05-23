function SettingsPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card">
        <div className="card-hd">
          <div className="card-title">Arquitectura preparada para API</div>
        </div>
        <div className="card-body space-y-3 text-sm text-[#5C5040]">
          <div>El frontend quedó listo para consumir FastAPI vía `axios` con `VITE_API_URL`.</div>
          <div>La sesión ya está preparada para incorporar JWT en cuanto exista backend de autenticación.</div>
          <div>La PWA base ya está configurada con `vite-plugin-pwa` y manifest empresarial.</div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <div className="card-title">Próximos pasos sugeridos</div>
        </div>
        <div className="card-body space-y-3 text-sm text-[#5C5040]">
          <div>1. Conectar servicios reales para clientes, contratos, pagos y documentos.</div>
          <div>2. Sustituir el almacenamiento local por API + caché controlada.</div>
          <div>3. Integrar JWT, refresh token y guards por rol.</div>
          <div>4. Añadir pruebas de componentes y flujos críticos.</div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
