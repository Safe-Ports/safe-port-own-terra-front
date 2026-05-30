import { Fragment, useState, useRef, useEffect } from "react";
import { HiOutlineFolderPlus, HiOutlinePencil, HiOutlineTrash, HiOutlineEllipsisVertical } from "react-icons/hi2";
import EcoLayout from "./EcoLayout";

const todayStr = () => new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
const CATEGORIES = ["Identidad", "Plantilla", "Legal", "Fiscal", "Contrato maestro", "Otro"];

/* Bóveda del ecosistema con carpetas jerárquicas (parentId).
   Sistema (🔒 inborrables) + personales (CRUD, anidables). Mock front. */
const SEED_FOLDERS = [
  { id: "client-core", name: "CLIENT-CORE", system: true, parentId: null, desc: "identidades de clientes", docs: [
    { name: "INE_maria_gonzalez.pdf", meta: "PDF · 12 mar 2026 · 1.1 MB" },
  ] },
  { id: "cc-ine", name: "Identificaciones", system: false, parentId: "client-core", desc: "INE / IFE / pasaporte", docs: [
    { name: "INE_carlos_ramirez.pdf", meta: "PDF · 04 ene 2026 · 980 KB" },
  ] },
  { id: "cc-comprob", name: "Comprobantes", system: false, parentId: "client-core", desc: "domicilio", docs: [
    { name: "Comprobante_jorge_mendez.pdf", meta: "PDF · 22 nov 2025 · 320 KB" },
  ] },
  { id: "plantillas", name: "PLANTILLAS", system: true, parentId: null, desc: "formatos y plantillas", docs: [
    { name: "Plantilla_contrato_compraventa.docx", meta: "DOCX · 01 ene 2026 · 90 KB" },
  ] },
  { id: "legal", name: "LEGAL", system: true, parentId: null, desc: "documentos legales del ecosistema", docs: [
    { name: "Aviso_de_privacidad.pdf", meta: "PDF · 15 feb 2026 · 240 KB" },
  ] },
  { id: "fiscal", name: "Fiscal", system: false, parentId: null, desc: "personal", docs: [
    { name: "Constancia_situacion_fiscal.pdf", meta: "PDF · 10 abr 2026 · 410 KB" },
  ] },
];

const FileIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M6 2h7l5 5v15H6z" /><path d="M13 2v5h5" /></svg>);
const DownloadIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="M7 11l5 5 5-5" /><path d="M5 21h14" /></svg>);
const SearchIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>);

function EcosystemVault() {
  const [folders, setFolders] = useState(SEED_FOLDERS);
  const [activeId, setActiveId] = useState("client-core");
  const [expanded, setExpanded] = useState(() => new Set(["client-core"]));
  const [modal, setModal] = useState(null); // subir doc
  const [menuFor, setMenuFor] = useState(null);     // carpeta con menú abierto
  const [newIn, setNewIn] = useState(null);         // parentId | "__root__" | null
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null); // carpeta en renombre
  const [editName, setEditName] = useState("");
  const [search, setSearch] = useState("");
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuFor) return;
    const h = (e) => { if (!menuRef.current?.contains(e.target)) setMenuFor(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuFor]);

  const active = folders.find((f) => f.id === activeId) || folders[0] || null;
  const totalDocs = folders.reduce((s, f) => s + f.docs.length, 0);

  const childrenOf = (pid) => folders.filter((f) => f.parentId === pid);
  const hasChildren = (id) => folders.some((f) => f.parentId === id);
  const collectIds = (id) => [id, ...childrenOf(id).flatMap((c) => collectIds(c.id))];
  const ancestors = (id) => { const p = []; let c = folders.find((f) => f.id === id); while (c) { p.unshift(c); c = folders.find((f) => f.id === c.parentId); } return p; };
  const toggle = (id) => setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const startCreate = (parentId) => { setNewIn(parentId); setNewName(""); setMenuFor(null); if (parentId !== "__root__") setExpanded((p) => new Set(p).add(parentId)); };
  const commitCreate = () => {
    if (!newName.trim()) { setNewIn(null); return; }
    const id = `f${Date.now()}`;
    const parentId = newIn === "__root__" ? null : newIn;
    setFolders((prev) => [...prev, { id, name: newName.trim(), system: false, parentId, desc: "personal", docs: [] }]);
    setActiveId(id); setNewIn(null); setNewName("");
  };

  const startRename = (f) => { setEditingId(f.id); setEditName(f.name); setMenuFor(null); };
  const commitRename = () => {
    if (editName.trim()) setFolders((prev) => prev.map((f) => (f.id === editingId ? { ...f, name: editName.trim() } : f)));
    setEditingId(null);
  };

  const deleteFolder = (id) => {
    const f = folders.find((x) => x.id === id);
    setMenuFor(null);
    if (!f || f.system) return;
    const ids = collectIds(id);
    const docCount = folders.filter((x) => ids.includes(x.id)).reduce((s, x) => s + x.docs.length, 0);
    const sub = ids.length - 1;
    if ((sub || docCount) && !window.confirm(`"${f.name}" contiene ${sub} subcarpeta(s) y ${docCount} documento(s). ¿Eliminar todo?`)) return;
    setFolders((prev) => prev.filter((x) => !ids.includes(x.id)));
    if (ids.includes(activeId)) setActiveId("client-core");
  };

  const saveDoc = () => {
    const entry = { name: modal.name || "Documento.pdf", meta: `${modal.category} · ${todayStr()} · —` };
    setFolders((prev) => prev.map((f) => (f.id === activeId ? { ...f, docs: [entry, ...f.docs] } : f)));
    setModal(null);
  };

  const shownDocs = active ? active.docs.filter((d) => d.name.toLowerCase().includes(search.trim().toLowerCase())) : [];

  const FolderRow = (f, depth) => {
    const open = expanded.has(f.id);
    const kids = hasChildren(f.id);
    return (
      <Fragment key={f.id}>
        <div className={`vlt-frow ${active?.id === f.id ? "active" : ""}`} style={{ paddingLeft: 12 + depth * 18 }} role="button" tabIndex={0} onClick={() => setActiveId(f.id)}>
          <span className="vlt-caret" onClick={(e) => { e.stopPropagation(); if (kids) toggle(f.id); }}>{kids ? (open ? "▾" : "▸") : ""}</span>
          <span className="vlt-fico">{f.system ? "🔒" : "📁"}</span>
          {editingId === f.id ? (
            <input autoFocus className="vlt-rename" value={editName} onClick={(e) => e.stopPropagation()}
              onChange={(e) => setEditName(e.target.value)} onBlur={commitRename}
              onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingId(null); }} />
          ) : (
            <span className="vlt-finfo">
              <span className="vlt-fname" style={{ display: "flex" }}>{f.name}</span>
              <span className="vlt-fdesc" style={{ display: "block" }}>{f.desc}</span>
            </span>
          )}
          <span className="vlt-fcnt">{f.docs.length}</span>
          <button className="vlt-menu-btn" title="Opciones" onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === f.id ? null : f.id); }}>
            <HiOutlineEllipsisVertical />
          </button>
          {menuFor === f.id && (
            <div ref={menuRef} className="vlt-menu" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => startCreate(f.id)}><HiOutlineFolderPlus /> Nueva subcarpeta</button>
              <button disabled={f.system} onClick={() => !f.system && startRename(f)}><HiOutlinePencil /> Renombrar</button>
              <button className="danger" disabled={f.system} onClick={() => !f.system && deleteFolder(f.id)}><HiOutlineTrash /> Eliminar</button>
            </div>
          )}
        </div>

        {newIn === f.id && (
          <div className="vlt-newrow" style={{ paddingLeft: 12 + (depth + 1) * 18, paddingRight: 12, paddingBottom: 6 }}>
            <input autoFocus className="usr-input" placeholder="Nombre de la subcarpeta…" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitCreate(); if (e.key === "Escape") setNewIn(null); }} />
            <button className="vlt-ok" onClick={commitCreate}>✓</button>
          </div>
        )}

        {open && childrenOf(f.id).map((c) => FolderRow(c, depth + 1))}
      </Fragment>
    );
  };

  return (
    <EcoLayout active="vault" title="OwnTerra Vault" subtitle="Bóveda de documentos del ecosistema">

      <div className="section-head">
        <h3>Bóveda de documentos</h3>
        <span style={{ fontSize: 12, color: "var(--text3)", fontFamily: "'JetBrains Mono',monospace" }}>{folders.length} carpetas · {totalDocs} documentos</span>
      </div>

      <div className="usr-layout">
        {/* ÁRBOL DE CARPETAS */}
        <div className="usr-card">
          <div className="usr-list-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="usr-list-title">Carpetas</div>
          </div>
          <div className="usr-list">
            {childrenOf(null).map((f) => FolderRow(f, 0))}

            {newIn === "__root__" && (
              <div className="vlt-newrow" style={{ padding: "8px 12px" }}>
                <input autoFocus className="usr-input" placeholder="Nombre de la carpeta…" value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") commitCreate(); if (e.key === "Escape") setNewIn(null); }} />
                <button className="vlt-ok" onClick={commitCreate}>✓</button>
              </div>
            )}

            <button className="usr-folder-new" style={{ margin: "8px 12px", width: "calc(100% - 24px)", justifyContent: "center" }} onClick={() => startCreate("__root__")}>
              <HiOutlineFolderPlus /> Nueva carpeta
            </button>
          </div>
        </div>

        {/* DOCUMENTOS DE LA CARPETA */}
        <div className="usr-card">
          {!active ? (
            <div className="usr-empty">Selecciona una carpeta.</div>
          ) : (
            <>
              <div className="vlt-d-head">
                <span className="vlt-fico" style={{ width: 44, height: 44, fontSize: 19 }}>{active.system ? "🔒" : "📁"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="vlt-d-name">{active.name}{active.system && <span className="usr-app-soon">sistema</span>}</div>
                  <div className="vlt-d-desc">{active.desc} · {active.docs.length} documento(s)</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="usr-folder-new" onClick={() => startCreate(active.id)}>+ Subcarpeta</button>
                  <button className="usr-add-btn" onClick={() => setModal({ name: "", category: CATEGORIES[0] })}>+ Subir documento</button>
                </div>
              </div>

              <div className="vlt-d-body">
                <div className="vlt-bc">{ancestors(active.id).map((a, i, arr) => (
                  <span key={a.id}>{i > 0 ? " › " : ""}{i === arr.length - 1 ? <b>{a.name}</b> : a.name}</span>
                ))}</div>

                <label className="vlt-search">
                  <SearchIcon />
                  <input placeholder="Buscar documento en esta carpeta…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </label>

                {shownDocs.length ? (
                  <div className="usr-rows">
                    {shownDocs.map((d, i) => (
                      <div key={i} className="usr-row">
                        <span className="usr-row-ico doc"><FileIcon /></span>
                        <div className="usr-row-info">
                          <div className="usr-row-name">{d.name}</div>
                          <div className="usr-row-meta">{d.meta}</div>
                        </div>
                        <button className="usr-dl" title="Descargar"><DownloadIcon /></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="usr-rows-empty">{search ? "Sin resultados para esa búsqueda." : "Carpeta vacía. Usa “+ Subir documento” o crea una subcarpeta."}</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL subir documento */}
      {modal && active && (
        <div className="usr-modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="usr-modal">
            <div className="usr-modal-head">
              <div>
                <div className="usr-modal-title">Subir documento</div>
                <div className="usr-modal-sub">{ancestors(active.id).map((a) => a.name).join(" › ")} · bóveda del ecosistema</div>
              </div>
              <button className="usr-modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="usr-modal-body">
              <div className="usr-field">
                <label className="usr-field-lbl">Archivo</label>
                <input className="usr-input" type="file" onChange={(e) => setModal((m) => ({ ...m, name: e.target.files?.[0]?.name || m.name }))} />
              </div>
              <div className="usr-field">
                <label className="usr-field-lbl">Nombre del documento</label>
                <input className="usr-input" placeholder="Ej. Plantilla_pagare.docx" value={modal.name} onChange={(e) => setModal((m) => ({ ...m, name: e.target.value }))} />
              </div>
              <div className="usr-field">
                <label className="usr-field-lbl">Categoría</label>
                <select className="usr-select" value={modal.category} onChange={(e) => setModal((m) => ({ ...m, category: e.target.value }))}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="usr-modal-foot">
              <button className="usr-btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="usr-btn-primary" onClick={saveDoc}>✓ Guardar</button>
            </div>
          </div>
        </div>
      )}
    </EcoLayout>
  );
}

export default EcosystemVault;
