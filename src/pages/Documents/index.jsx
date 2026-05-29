import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  HiDocumentArrowUp, HiOutlineFolder, HiFolderOpen, HiOutlineFolderPlus,
  HiOutlineTrash, HiOutlineArrowDownTray, HiOutlineEye, HiOutlinePencil,
  HiOutlineChevronRight, HiOutlineChevronDown, HiOutlineEllipsisVertical,
  HiOutlineArrowRight,
} from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { folderService } from "@/services/folderService";
import { documentService } from "@/services/documentService";

/* ── helpers ────────────────────────────────────────────────────────────── */
const CAT_LABEL = {
  contrato:"Contrato", identificacion:"Identificación", comprobante:"Comprobante",
  escritura:"Escritura", plano:"Plano", otro:"Otro",
};
const EXT_ICON = {
  pdf:"📕", doc:"📝", docx:"📝", xls:"📗", xlsx:"📗",
  png:"🖼", jpg:"🖼", jpeg:"🖼", gif:"🖼", webp:"🖼", svg:"🖼",
  mp4:"🎬", mov:"🎬", zip:"📦", rar:"📦", html:"🌐", htm:"🌐",
  txt:"📃", csv:"📊", dwg:"📐", dxf:"📐",
};
const fileIcon = (n="") => EXT_ICON[n.split(".").pop()?.toLowerCase()] || "📄";
const fmtSize  = (b) => !b?"—": b<1048576?`${Math.round(b/1024)} KB`:`${(b/1048576).toFixed(1)} MB`;
const fmtDate  = (iso) => !iso?"—": new Date(iso).toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"});

function childrenOf(folders, parentId) {
  return folders.filter(f => f.parent_id === (parentId ?? null));
}
function pathTo(folders, id) {
  const node = folders.find(f => f.id === id);
  if (!node) return [];
  return node.parent_id ? [...pathTo(folders, node.parent_id), node] : [node];
}

/* ── FolderNode ─────────────────────────────────────────────────────────── */
function FolderNode({ node, folders, activeId, onSelect, onAddChild, onRename, onDelete, depth=0 }) {
  const [open, setOpen]     = useState(false);
  const [menu, setMenu]     = useState(false);
  const [editing, setEdit]  = useState(false);
  const [draft, setDraft]   = useState(node.name);
  const menuRef = useRef();
  const kids    = childrenOf(folders, node.id);
  const isActive = activeId === node.id;

  useEffect(() => {
    if (!menu) return;
    const h = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menu]);

  const commit = () => { if (draft.trim()) onRename(node.id, draft.trim()); setEdit(false); };

  return (
    <div>
      <div
        className={`doc-folder-row${isActive ? " active" : ""}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => { onSelect(node.id); if (kids.length) setOpen(v => !v); }}
      >
        <span className="doc-folder-chevron">
          {kids.length ? (open ? <HiOutlineChevronDown /> : <HiOutlineChevronRight />) : null}
        </span>
        <span className="doc-folder-icon">
          {open && kids.length ? <HiFolderOpen /> : <HiOutlineFolder />}
        </span>

        {editing ? (
          <input
            autoFocus
            className="doc-folder-rename"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if(e.key==="Enter") commit(); if(e.key==="Escape") setEdit(false); }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="doc-folder-name" title={node.name}>{node.name}</span>
        )}

        <span className="doc-folder-count">{node.document_count}</span>

        <button
          className="doc-folder-menu-btn"
          onClick={e => { e.stopPropagation(); setMenu(v => !v); }}
        >
          <HiOutlineEllipsisVertical />
        </button>

        {menu && (
          <div ref={menuRef} className="doc-folder-menu">
            <button onClick={e => { e.stopPropagation(); onAddChild(node.id); setMenu(false); }}>
              <HiOutlineFolderPlus /> Nueva subcarpeta
            </button>
            <button onClick={e => { e.stopPropagation(); setDraft(node.name); setEdit(true); setMenu(false); }}>
              <HiOutlinePencil /> Renombrar
            </button>
            <button className="danger" onClick={e => { e.stopPropagation(); onDelete(node.id); setMenu(false); }}>
              <HiOutlineTrash /> Eliminar
            </button>
          </div>
        )}
      </div>

      {open && kids.map(kid => (
        <FolderNode key={kid.id} node={kid} folders={folders} activeId={activeId}
          onSelect={onSelect} onAddChild={onAddChild} onRename={onRename} onDelete={onDelete}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

/* ── MoveModal ──────────────────────────────────────────────────────────── */
function MoveModal({ folders, doc, onMove, onClose }) {
  const [expanded, setExpanded] = useState({});

  function Tree({ parentId = null, depth = 0 }) {
    const kids = childrenOf(folders, parentId);
    return (
      <>
        {kids.map(f => {
          const grand = childrenOf(folders, f.id);
          const isCurrent = doc.folder_id === f.id;
          return (
            <div key={f.id}>
              <div
                className={`move-tree-row${isCurrent ? " current" : ""}`}
                style={{ paddingLeft: 12 + depth * 16 }}
                onClick={() => onMove(isCurrent ? null : f.id)}
              >
                {grand.length > 0 ? (
                  <span className="move-chevron" onClick={e => { e.stopPropagation(); setExpanded(p => ({...p,[f.id]:!p[f.id]})); }}>
                    {expanded[f.id] ? <HiOutlineChevronDown/> : <HiOutlineChevronRight/>}
                  </span>
                ) : <span style={{width:16,display:"inline-block"}}/>}
                {isCurrent ? <HiFolderOpen style={{color:"var(--forest)"}} /> : <HiOutlineFolder />}
                <span style={{flex:1, fontSize:".85rem"}}>{f.name}</span>
                {isCurrent && <span className="move-current-badge">actual</span>}
              </div>
              {expanded[f.id] && <Tree parentId={f.id} depth={depth+1} />}
            </div>
          );
        })}
      </>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{maxWidth:340}} onClick={e => e.stopPropagation()}>
        <div className="modal-title">📁 Mover archivo</div>
        <div style={{fontSize:".8rem", color:"var(--mu)", marginBottom:12, fontWeight:500}}>{doc.name}</div>
        <div style={{maxHeight:300, overflowY:"auto", margin:"0 -18px", padding:"0 18px"}}>
          <div
            className={`move-tree-row${!doc.folder_id ? " current" : ""}`}
            style={{paddingLeft:12}}
            onClick={() => onMove(null)}
          >
            <HiOutlineFolder />
            <span style={{flex:1,fontSize:".85rem"}}>Sin carpeta (raíz)</span>
            {!doc.folder_id && <span className="move-current-badge">actual</span>}
          </div>
          {folders.length === 0
            ? <div style={{padding:"12px 0",fontSize:".82rem",color:"var(--mu)"}}>No hay carpetas.</div>
            : <Tree />}
        </div>
        <div className="fr-row" style={{marginTop:16,gap:8}}>
          <button className="btn-s" style={{flex:1}} onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ── main page ──────────────────────────────────────────────────────────── */
export default function DocumentsPage() {
  const { documents, openDocumentUpload, openDocumentPreview, downloadDocument, deleteDocument, showToast } = useAppContext();
  const qc = useQueryClient();

  const { data: folders = [] } = useQuery({
    queryKey: ["document-folders"],
    queryFn: folderService.list,
    staleTime: 30_000,
  });

  const createFolder = useMutation({
    mutationFn: folderService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["document-folders"] }),
    onError: (e) => showToast(e?.response?.data?.error?.message || "Error al crear carpeta"),
  });
  const renameFolder = useMutation({
    mutationFn: ({ id, name }) => folderService.update(id, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["document-folders"] }),
  });
  const deleteFolder = useMutation({
    mutationFn: folderService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["document-folders"] }); qc.invalidateQueries({ queryKey: ["documents"] }); },
  });
  const moveDoc = useMutation({
    mutationFn: ({ id, folderId }) => documentService.move(id, folderId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); qc.invalidateQueries({ queryKey: ["document-folders"] }); },
    onError: () => showToast("Error al mover el archivo"),
  });

  const [activeId,    setActiveId]    = useState("all");
  const [search,      setSearch]      = useState("");
  const [sortBy,      setSortBy]      = useState("recent");
  const [moveTarget,  setMoveTarget]  = useState(null);   // doc object
  const [delDoc,      setDelDoc]      = useState(null);
  const [newIn,       setNewIn]       = useState(null);   // parentId | "__root__"
  const [newDraft,    setNewDraft]    = useState("");

  const handleAddChild = (parentId) => { setNewIn(parentId); setNewDraft(""); };
  const handleCreate   = (parentId) => {
    if (!newDraft.trim()) { setNewIn(null); return; }
    createFolder.mutate({ name: newDraft.trim(), parent_id: parentId === "__root__" ? null : parentId });
    setNewIn(null); setNewDraft("");
  };

  const filtered = useMemo(() => {
    let base = [...documents];
    if (activeId === "unfiled") {
      const usedIds = new Set(documents.filter(d => d.folder_id).map(d => d.folder_id));
      base = base.filter(d => !d.folder_id);
    } else if (activeId !== "all") {
      base = base.filter(d => d.folder_id === activeId);
    }
    const term = search.trim().toLowerCase();
    if (term) base = base.filter(d =>
      `${d.name} ${d.category} ${d.entity_label||""}`.toLowerCase().includes(term)
    );
    return base.sort((a,b) =>
      sortBy==="oldest" ? new Date(a.uploaded_at)-new Date(b.uploaded_at) :
      sortBy==="name"   ? a.name.localeCompare(b.name,"es-MX") :
      sortBy==="size"   ? (b.file_size||0)-(a.file_size||0) :
      new Date(b.uploaded_at)-new Date(a.uploaded_at)
    );
  }, [documents, activeId, search, sortBy]);

  const breadcrumb = useMemo(() => {
    if (activeId==="all" || activeId==="unfiled") return [];
    return pathTo(folders, activeId);
  }, [folders, activeId]);

  const activeLabel =
    activeId==="all"     ? "Todos los archivos" :
    activeId==="unfiled" ? "Sin carpeta" :
    folders.find(f=>f.id===activeId)?.name || "";

  const countAll     = documents.length;
  const countUnfiled = documents.filter(d => !d.folder_id).length;

  const roots = childrenOf(folders, null);

  return (
    <>
      <style>{`
        .doc-layout { display:flex; gap:16px; align-items:flex-start; }
        .doc-sidebar {
          width:260px; flex-shrink:0;
          background:#fff; border:1px solid #ded5c8; border-radius:20px;
          padding:12px 8px; box-shadow:0 4px 20px rgba(24,18,14,.06);
          position:sticky; top:16px;
        }
        .doc-sidebar-label {
          font-size:.62rem; font-weight:800; letter-spacing:.16em;
          text-transform:uppercase; color:#8b7d6c;
          padding:8px 8px 4px;
        }
        .doc-sidebar-item {
          display:flex; align-items:center; gap:8px; width:100%;
          padding:7px 10px; border-radius:10px; border:none; cursor:pointer;
          background:transparent; color:#3f352c; font-size:.82rem; text-align:left;
        }
        .doc-sidebar-item:hover { background:#f5f0ea; }
        .doc-sidebar-item.active { background:var(--navy); color:#F7F3ED; font-weight:600; }
        .doc-sidebar-item .count {
          margin-left:auto; font-size:.68rem; font-weight:700;
          background:#EFE4D5; color:#6f5c3e; border-radius:99px; padding:1px 7px;
        }
        .doc-sidebar-item.active .count { background:rgba(255,255,255,.2); color:#F7F3ED; }

        /* folder tree */
        .doc-folder-row {
          display:flex; align-items:center; gap:6px;
          padding:6px 10px; border-radius:10px; cursor:pointer;
          color:#3f352c; font-size:.82rem; position:relative;
        }
        .doc-folder-row:hover { background:#f5f0ea; }
        .doc-folder-row.active { background:var(--navy); color:#F7F3ED; font-weight:600; }
        .doc-folder-chevron { width:14px; font-size:.72rem; display:flex; align-items:center; flex-shrink:0; }
        .doc-folder-icon { font-size:.95rem; flex-shrink:0; }
        .doc-folder-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
        .doc-folder-count {
          font-size:.66rem; font-weight:700; background:#EFE4D5; color:#6f5c3e;
          border-radius:99px; padding:1px 6px; flex-shrink:0;
        }
        .doc-folder-row.active .doc-folder-count { background:rgba(255,255,255,.2); color:#F7F3ED; }
        .doc-folder-menu-btn {
          opacity:0; background:none; border:none; cursor:pointer;
          color:inherit; font-size:1rem; padding:2px; border-radius:4px;
          display:flex; align-items:center;
        }
        .doc-folder-row:hover .doc-folder-menu-btn { opacity:.7; }
        .doc-folder-menu-btn:hover { opacity:1 !important; }
        .doc-folder-menu {
          position:absolute; right:4px; top:calc(100% + 2px); z-index:200;
          background:#fff; border:1px solid #ded5c8; border-radius:12px;
          padding:4px 0; min-width:170px;
          box-shadow:0 8px 24px rgba(0,0,0,.12);
        }
        .doc-folder-menu button {
          display:flex; align-items:center; gap:8px; width:100%;
          padding:8px 14px; background:none; border:none; cursor:pointer;
          font-size:.8rem; color:#3f352c; text-align:left;
        }
        .doc-folder-menu button:hover { background:#f5f0ea; }
        .doc-folder-menu button.danger { color:#C0392B; }
        .doc-folder-rename {
          flex:1; font-size:.8rem; padding:2px 6px; border-radius:6px;
          border:1px solid #dccfbe; outline:none; color:inherit; background:rgba(255,255,255,.9);
        }
        .doc-add-folder-btn {
          display:flex; align-items:center; gap:6px; width:100%;
          padding:7px 10px; border-radius:10px; border:none; background:transparent;
          color:var(--forest); font-size:.78rem; font-weight:600; cursor:pointer; margin-top:2px;
        }
        .doc-add-folder-btn:hover { background:#f5f0ea; }
        .doc-new-folder-row {
          display:flex; gap:6px; padding:4px 8px; margin-top:2px;
        }

        /* main */
        .doc-main { flex:1; min-width:0; }
        .doc-toolbar {
          display:flex; align-items:flex-end; justify-content:space-between;
          gap:12px; margin-bottom:12px; flex-wrap:wrap;
        }
        .doc-breadcrumb {
          display:flex; align-items:center; gap:4px;
          font-size:.72rem; color:var(--mu); margin-bottom:3px;
        }
        .doc-breadcrumb span { cursor:pointer; }
        .doc-breadcrumb span:last-child { color:#3f352c; font-weight:600; cursor:default; }
        .doc-page-title {
          font-size:1.5rem; font-weight:700; color:#1a130d; line-height:1.2;
        }
        .doc-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }

        /* table */
        .doc-table-wrap {
          background:#fff; border:1px solid #ded5c8; border-radius:20px;
          overflow:hidden; box-shadow:0 4px 20px rgba(24,18,14,.06);
        }
        .doc-empty {
          padding:52px 24px; text-align:center; color:var(--mu); font-size:.85rem;
        }
        .doc-row-actions {
          display:flex; gap:2px; justify-content:flex-end;
        }
        .doc-row-btn {
          background:none; border:none; cursor:pointer; font-size:1rem;
          padding:5px 6px; border-radius:8px; color:var(--forest); opacity:.6; transition:opacity .12s,background .12s;
        }
        .doc-row-btn:hover { opacity:1; background:#f0f7f3; }
        .doc-row-btn.danger { color:#C0392B; }
        .doc-row-btn.danger:hover { background:#fdf0ee; }
        .doc-count { font-size:.72rem; color:var(--mu); margin-top:8px; padding-left:4px; }

        /* move modal tree */
        .move-tree-row {
          display:flex; align-items:center; gap:8px; padding:8px 12px;
          border-radius:8px; cursor:pointer; font-size:.83rem; color:#3f352c;
        }
        .move-tree-row:hover { background:#f5f0ea; }
        .move-tree-row.current { background:#f0f7f3; font-weight:600; }
        .move-current-badge {
          font-size:.65rem; background:var(--forest); color:#fff;
          border-radius:99px; padding:2px 8px; font-weight:700;
        }
        .move-chevron { width:14px; font-size:.72rem; cursor:pointer; }

        /* confirm modal */
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:9000; display:flex; align-items:center; justify-content:center; }
        .modal-box { background:#FFFCF8; border-radius:20px; padding:24px; width:100%; box-shadow:0 24px 60px rgba(0,0,0,.22); }
        .modal-title { font-weight:700; font-size:1rem; margin-bottom:8px; color:#1a130d; }
      `}</style>

      <div className="doc-layout">

        {/* ══ SIDEBAR ══════════════════════════════════════════════════ */}
        <aside className="doc-sidebar">
          <div className="doc-sidebar-label">Archivos</div>

          {[
            { id:"all",     label:"Todos",        icon:"🗂", count: countAll },
            { id:"unfiled", label:"Sin carpeta",  icon:"📋", count: countUnfiled },
          ].map(item => (
            <button
              key={item.id}
              className={`doc-sidebar-item${activeId===item.id?" active":""}`}
              onClick={() => setActiveId(item.id)}
              title={item.label}
            >
              <span>{item.icon}</span>
              <span style={{flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{item.label}</span>
              <span className="count">{item.count}</span>
            </button>
          ))}

          <div className="doc-sidebar-label" style={{marginTop:8}}>Mis carpetas</div>

          {roots.map(node => (
            <FolderNode
              key={node.id} node={node} folders={folders} activeId={activeId}
              onSelect={setActiveId}
              onAddChild={handleAddChild}
              onRename={(id, name) => renameFolder.mutate({ id, name })}
              onDelete={(id) => { deleteFolder.mutate(id); if(activeId===id) setActiveId("all"); }}
            />
          ))}

          {/* inline new folder */}
          {newIn !== null && (
            <div className="doc-new-folder-row">
              <input
                autoFocus className="fi" placeholder="Nombre de carpeta…"
                value={newDraft}
                onChange={e => setNewDraft(e.target.value)}
                onKeyDown={e => { if(e.key==="Enter") handleCreate(newIn); if(e.key==="Escape") setNewIn(null); }}
                style={{fontSize:".78rem", padding:"6px 10px"}}
              />
              <button className="btn-p" style={{padding:"6px 12px",fontSize:".72rem"}} onClick={() => handleCreate(newIn)}>✓</button>
            </div>
          )}

          <button className="doc-add-folder-btn" onClick={() => { setNewIn("__root__"); setNewDraft(""); }}>
            <HiOutlineFolderPlus /> Nueva carpeta
          </button>
        </aside>

        {/* ══ MAIN ═════════════════════════════════════════════════════ */}
        <div className="doc-main">

          {/* toolbar */}
          <div className="doc-toolbar">
            <div>
              {breadcrumb.length > 0 && (
                <div className="doc-breadcrumb">
                  <span onClick={() => setActiveId("all")}>Documentos</span>
                  {breadcrumb.map((crumb, i) => (
                    <span key={crumb.id} style={{display:"flex",alignItems:"center",gap:4}}>
                      <HiOutlineChevronRight style={{fontSize:".65rem",opacity:.5}}/>
                      <span
                        style={{cursor: i<breadcrumb.length-1?"pointer":"default", color: i===breadcrumb.length-1?"#3f352c":"var(--mu)"}}
                        onClick={() => i<breadcrumb.length-1 && setActiveId(crumb.id)}
                      >{crumb.name}</span>
                    </span>
                  ))}
                </div>
              )}
              <div className="doc-page-title">{activeLabel}</div>
            </div>
            <div className="doc-actions">
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar…" className="fi"
                style={{width:160,padding:"8px 12px",fontSize:".8rem"}}
              />
              <select className="fi" value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{width:"auto",padding:"8px 12px",fontSize:".8rem"}}>
                <option value="recent">Más recientes</option>
                <option value="oldest">Más antiguos</option>
                <option value="name">Nombre A-Z</option>
                <option value="size">Tamaño</option>
              </select>
              <button className="btn-p" style={{padding:"8px 14px",fontSize:".82rem",gap:6}}
                onClick={() => openDocumentUpload({
                  folderId: activeId !== "all" && activeId !== "unfiled" ? activeId : undefined
                })}>
                <HiDocumentArrowUp /> Subir
              </button>
            </div>
          </div>

          {/* table */}
          <div className="doc-table-wrap">
            {filtered.length === 0 ? (
              <div className="doc-empty">
                {search ? "Sin resultados para esa búsqueda." : "Esta carpeta está vacía."}
                {!search && (
                  <div style={{marginTop:10}}>
                    <button className="btn-s" style={{fontSize:".78rem",padding:"8px 14px"}}
                      onClick={() => openDocumentUpload({
                        folderId: activeId !== "all" && activeId !== "unfiled" ? activeId : undefined
                      })}>
                      + Subir primer archivo
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th>Tamaño</th>
                    <th>Vínculo</th>
                    <th>Fecha</th>
                    <th/>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(doc => (
                    <tr key={doc.id}>
                      <td style={{maxWidth:220}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:"1.15rem",flexShrink:0}}>{fileIcon(doc.name)}</span>
                          <span style={{fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={doc.name}>
                            {doc.name}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="pc-chip pending" style={{fontSize:".7rem",padding:"3px 8px"}}>
                          {CAT_LABEL[doc.category] || doc.category}
                        </span>
                      </td>
                      <td style={{color:"var(--mu)",whiteSpace:"nowrap"}}>{fmtSize(doc.file_size)}</td>
                      <td style={{color:"var(--mu)",maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {doc.entity_label || "—"}
                      </td>
                      <td style={{color:"var(--mu)",whiteSpace:"nowrap",fontSize:".78rem"}}>{fmtDate(doc.uploaded_at)}</td>
                      <td>
                        <div className="doc-row-actions">
                          <button className="doc-row-btn" title="Mover a carpeta" onClick={() => setMoveTarget(doc)}>
                            <HiOutlineArrowRight />
                          </button>
                          <button className="doc-row-btn" title="Ver" onClick={() => openDocumentPreview(doc.id)}>
                            <HiOutlineEye />
                          </button>
                          <button className="doc-row-btn" title="Descargar" onClick={() => downloadDocument(doc.id, doc.download_url, doc.name)}>
                            <HiOutlineArrowDownTray />
                          </button>
                          <button className="doc-row-btn danger" title="Eliminar" onClick={() => setDelDoc(doc.id)}>
                            <HiOutlineTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {filtered.length > 0 && (
            <div className="doc-count">{filtered.length} archivo{filtered.length!==1?"s":""}</div>
          )}
        </div>
      </div>

      {/* ── Move modal ──────────────────────────────────── */}
      {moveTarget && (
        <MoveModal
          folders={folders}
          doc={moveTarget}
          onMove={(folderId) => {
            moveDoc.mutate({ id: moveTarget.id, folderId });
            setMoveTarget(null);
          }}
          onClose={() => setMoveTarget(null)}
        />
      )}

      {/* ── Confirm delete ───────────────────────────────── */}
      {delDoc && (
        <div className="modal-overlay" onClick={() => setDelDoc(null)}>
          <div className="modal-box" style={{maxWidth:300}} onClick={e => e.stopPropagation()}>
            <div className="modal-title">¿Eliminar documento?</div>
            <div style={{fontSize:".82rem",color:"var(--mu)",marginBottom:20}}>Esta acción no se puede deshacer.</div>
            <div className="fr-row" style={{gap:8}}>
              <button className="btn-s" style={{flex:1}} onClick={() => setDelDoc(null)}>Cancelar</button>
              <button className="btn-dan" style={{flex:1}} onClick={() => { deleteDocument(delDoc); setDelDoc(null); }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
