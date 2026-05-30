import { Fragment, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HiOutlineEllipsisVertical, HiOutlineFolderPlus, HiOutlinePencil, HiOutlineTrash } from "react-icons/hi2";
import { documentService } from "@/services/documentService";
import { folderService } from "@/services/folderService";
import EcoLayout from "./EcoLayout";

const CATEGORIES = ["otro", "contrato", "identificacion", "comprobante", "escritura", "plano"];
const CAT_LABEL = { otro: "Otro", contrato: "Contrato", identificacion: "Identificación", comprobante: "Comprobante", escritura: "Escritura", plano: "Plano" };

function fmtSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

const FileIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M6 2h7l5 5v15H6z" /><path d="M13 2v5h5" /></svg>);
const DownloadIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="M7 11l5 5 5-5" /><path d="M5 21h14" /></svg>);
const SearchIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>);

function EcosystemVault() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [modal, setModal] = useState(null);
  const [menuFor, setMenuFor] = useState(null);
  const [newIn, setNewIn] = useState(null);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [search, setSearch] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const menuRef = useRef(null);

  const { data: folders = [] } = useQuery({
    queryKey: ["folders"],
    queryFn: () => folderService.list(),
  });

  const { data: docsData } = useQuery({
    queryKey: ["docs", "folder", activeId],
    queryFn: () => documentService.list({ folder_id: activeId, limit: 100, search: search || undefined }),
    enabled: !!activeId,
  });
  const docs = docsData?.items ?? [];

  // Set first folder as active when loaded
  useEffect(() => {
    if (!activeId && folders.length > 0) {
      const roots = folders.filter((f) => !f.parent_id);
      if (roots.length > 0) setActiveId(String(roots[0].id));
    }
  }, [folders, activeId]);

  useEffect(() => {
    if (!menuFor) return;
    const h = (e) => { if (!menuRef.current?.contains(e.target)) setMenuFor(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuFor]);

  const createFolderMutation = useMutation({
    mutationFn: (body) => folderService.create(body),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["folders"] });
      setActiveId(String(created.id));
    },
  });

  const renameFolderMutation = useMutation({
    mutationFn: ({ id, name }) => folderService.update(id, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["folders"] }),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id) => folderService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["folders"] });
      const roots = folders.filter((f) => !f.parent_id);
      setActiveId(roots[0] ? String(roots[0].id) : null);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, name, category }) =>
      documentService.upload(file, { name, category, folderId: activeId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["docs", "folder", activeId] });
      qc.invalidateQueries({ queryKey: ["folders"] });
      setModal(null);
      setUploadFile(null);
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id) => documentService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["docs", "folder", activeId] }),
  });

  const active = folders.find((f) => String(f.id) === activeId) || null;
  const totalDocs = folders.reduce((s, f) => s + (f.document_count || 0), 0);

  const childrenOf = (pid) => folders.filter((f) => (pid ? String(f.parent_id) === String(pid) : !f.parent_id));
  const hasChildren = (id) => folders.some((f) => String(f.parent_id) === String(id));
  const ancestors = (id) => {
    const p = [];
    let c = folders.find((f) => String(f.id) === String(id));
    while (c) { p.unshift(c); c = folders.find((f) => String(f.id) === String(c.parent_id)); }
    return p;
  };
  const toggle = (id) => setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const startCreate = (parentId) => { setNewIn(parentId); setNewName(""); setMenuFor(null); if (parentId !== "__root__") setExpanded((p) => new Set(p).add(parentId)); };
  const commitCreate = () => {
    if (!newName.trim()) { setNewIn(null); return; }
    const parent_id = newIn === "__root__" ? undefined : newIn;
    createFolderMutation.mutate({ name: newName.trim(), parent_id });
    setNewIn(null); setNewName("");
  };

  const startRename = (f) => { setEditingId(String(f.id)); setEditName(f.name); setMenuFor(null); };
  const commitRename = () => {
    if (editName.trim()) renameFolderMutation.mutate({ id: editingId, name: editName.trim() });
    setEditingId(null);
  };

  const deleteFolder = (id) => {
    setMenuFor(null);
    if (!window.confirm("¿Eliminar esta carpeta y todos sus documentos?")) return;
    deleteFolderMutation.mutate(id);
  };

  const saveDoc = () => {
    if (!uploadFile && !modal?.name) return;
    const file = uploadFile || new File([], modal.name);
    uploadMutation.mutate({ file, name: modal.name || file.name, category: modal.category });
  };

  const shownDocs = search ? docs.filter((d) => d.name.toLowerCase().includes(search.toLowerCase())) : docs;

  const FolderRow = (f, depth) => {
    const fid = String(f.id);
    const open = expanded.has(fid);
    const kids = hasChildren(fid);
    return (
      <Fragment key={fid}>
        <div
          className={`vlt-frow ${activeId === fid ? "active" : ""}`}
          style={{ paddingLeft: 12 + depth * 18 }}
          role="button" tabIndex={0}
          onClick={() => setActiveId(fid)}
        >
          <span className="vlt-caret" onClick={(e) => { e.stopPropagation(); if (kids) toggle(fid); }}>{kids ? (open ? "▾" : "▸") : ""}</span>
          <span className="vlt-fico">📁</span>
          {editingId === fid ? (
            <input autoFocus className="vlt-rename" value={editName} onClick={(e) => e.stopPropagation()}
              onChange={(e) => setEditName(e.target.value)} onBlur={commitRename}
              onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingId(null); }} />
          ) : (
            <span className="vlt-finfo">
              <span className="vlt-fname" style={{ display: "flex" }}>{f.name}</span>
            </span>
          )}
          <span className="vlt-fcnt">{f.document_count || 0}</span>
          <button className="vlt-menu-btn" title="Opciones" onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === fid ? null : fid); }}>
            <HiOutlineEllipsisVertical />
          </button>
          {menuFor === fid && (
            <div ref={menuRef} className="vlt-menu" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => startCreate(fid)}><HiOutlineFolderPlus /> Nueva subcarpeta</button>
              <button onClick={() => startRename(f)}><HiOutlinePencil /> Renombrar</button>
              <button className="danger" onClick={() => deleteFolder(fid)}><HiOutlineTrash /> Eliminar</button>
            </div>
          )}
        </div>

        {newIn === fid && (
          <div className="vlt-newrow" style={{ paddingLeft: 12 + (depth + 1) * 18, paddingRight: 12, paddingBottom: 6 }}>
            <input autoFocus className="usr-input" placeholder="Nombre de la subcarpeta…" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitCreate(); if (e.key === "Escape") setNewIn(null); }} />
            <button className="vlt-ok" onClick={commitCreate}>✓</button>
          </div>
        )}

        {open && childrenOf(fid).map((c) => FolderRow(c, depth + 1))}
      </Fragment>
    );
  };

  return (
    <EcoLayout active="vault" title="OwnTerra Vault" subtitle="Bóveda de documentos del ecosistema">

      <div className="section-head">
        <h3>Bóveda de documentos</h3>
        <span style={{ fontSize: 12, color: "var(--text3)", fontFamily: "'JetBrains Mono',monospace" }}>
          {folders.length} carpetas · {totalDocs} documentos
        </span>
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

            <button
              className="usr-folder-new"
              style={{ margin: "8px 12px", width: "calc(100% - 24px)", justifyContent: "center" }}
              onClick={() => startCreate("__root__")}
            >
              <HiOutlineFolderPlus /> Nueva carpeta
            </button>
          </div>
        </div>

        {/* DOCUMENTOS DE LA CARPETA */}
        <div className="usr-card">
          {!active ? (
            <div className="usr-empty">Selecciona una carpeta o crea una nueva.</div>
          ) : (
            <>
              <div className="vlt-d-head">
                <span className="vlt-fico" style={{ width: 44, height: 44, fontSize: 19 }}>📁</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="vlt-d-name">{active.name}</div>
                  <div className="vlt-d-desc">{active.document_count || 0} documento(s)</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="usr-folder-new" onClick={() => startCreate(activeId)}>+ Subcarpeta</button>
                  <button className="usr-add-btn" onClick={() => setModal({ name: "", category: "otro" })}>+ Subir documento</button>
                </div>
              </div>

              <div className="vlt-d-body">
                <div className="vlt-bc">
                  {ancestors(activeId).map((a, i, arr) => (
                    <span key={a.id}>{i > 0 ? " › " : ""}{i === arr.length - 1 ? <b>{a.name}</b> : a.name}</span>
                  ))}
                </div>

                <label className="vlt-search">
                  <SearchIcon />
                  <input placeholder="Buscar documento en esta carpeta…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </label>

                {shownDocs.length ? (
                  <div className="usr-rows">
                    {shownDocs.map((d) => (
                      <div key={d.id} className="usr-row">
                        <span className="usr-row-ico doc"><FileIcon /></span>
                        <div className="usr-row-info">
                          <div className="usr-row-name">{d.name}</div>
                          <div className="usr-row-meta">
                            {CAT_LABEL[d.category] || d.category} · {fmtDate(d.created_at)} · {fmtSize(d.file_size)}
                          </div>
                        </div>
                        <a className="usr-dl" href={documentService.downloadUrl(d.id)} target="_blank" rel="noreferrer" title="Descargar">
                          <DownloadIcon />
                        </a>
                        <button
                          className="usr-dl"
                          style={{ color: "var(--danger)", marginLeft: 4 }}
                          title="Eliminar"
                          onClick={() => window.confirm(`¿Eliminar "${d.name}"?`) && deleteDocMutation.mutate(d.id)}
                        >
                          <HiOutlineTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="usr-rows-empty">
                    {search ? "Sin resultados para esa búsqueda." : 'Carpeta vacía. Usa "+ Subir documento" o crea una subcarpeta.'}
                  </div>
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
                <div className="usr-modal-sub">{ancestors(activeId).map((a) => a.name).join(" › ")} · bóveda del ecosistema</div>
              </div>
              <button className="usr-modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="usr-modal-body">
              <div className="usr-field">
                <label className="usr-field-lbl">Archivo</label>
                <input className="usr-input" type="file" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setUploadFile(f); setModal((m) => ({ ...m, name: m.name || f.name })); }
                }} />
              </div>
              <div className="usr-field">
                <label className="usr-field-lbl">Nombre del documento</label>
                <input className="usr-input" placeholder="Ej. Plantilla_pagare.docx" value={modal.name} onChange={(e) => setModal((m) => ({ ...m, name: e.target.value }))} />
              </div>
              <div className="usr-field">
                <label className="usr-field-lbl">Categoría</label>
                <select className="usr-select" value={modal.category} onChange={(e) => setModal((m) => ({ ...m, category: e.target.value }))}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
                </select>
              </div>
            </div>
            <div className="usr-modal-foot">
              <button className="usr-btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="usr-btn-primary" onClick={saveDoc} disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? "Subiendo…" : "✓ Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </EcoLayout>
  );
}

export default EcosystemVault;
