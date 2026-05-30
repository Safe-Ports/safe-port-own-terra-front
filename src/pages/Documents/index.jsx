import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  HiDocumentArrowUp, HiOutlineFolder, HiFolderOpen, HiOutlineFolderPlus,
  HiOutlineTrash, HiOutlineArrowDownTray, HiOutlineEye, HiOutlinePencil,
  HiOutlineChevronRight, HiOutlineChevronDown, HiOutlineEllipsisVertical,
  HiOutlineArrowRight, HiOutlineMagnifyingGlass,
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
          {kids.length ? (open ? "▾" : "▸") : null}
        </span>
        <span className="doc-folder-icon">
          {open && kids.length ? "📂" : "📁"}
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
        .doc-layout { display:grid; grid-template-columns:320px 1fr; gap:16px; align-items:start; }
        .doc-sidebar {
          background:var(--sf); border:1px solid rgba(67,69,63,.1); border-radius:22px;
          padding:0; overflow:hidden; box-shadow:0 12px 30px rgba(30,61,43,.06);
          position:sticky; top:16px;
        }
        .doc-sidebar-label {
          font-size:.56rem; font-weight:600; letter-spacing:.14em;
          text-transform:uppercase; color:#83867C; font-family:'JetBrains Mono',monospace;
          padding:14px 16px 6px;
        }
        .doc-sidebar-item {
          display:flex; align-items:center; gap:11px; width:100%;
          padding:11px 16px; border:none; border-left:3px solid transparent; cursor:pointer;
          background:transparent; color:#43453F; font-size:.82rem; text-align:left;
          border-bottom:1px solid rgba(67,69,63,.08); transition:background .14s;
          font-family:'Outfit',sans-serif;
        }
        .doc-sidebar-item:hover { background:#F1EEE6; }
        .doc-sidebar-item.active { background:rgba(111,175,107,.08); color:#1E3D2B; font-weight:600; border-left-color:#6FAF6B; }
        .doc-sidebar-item .count {
          margin-left:auto; font-size:.7rem; font-weight:500; font-family:'JetBrains Mono',monospace;
          color:#83867C; background:none; padding:0;
        }
        .doc-sidebar-item.active .count { color:#2F6A38; }

        /* folder tree (lista plana con separadores, igual que el Vault) */
        .doc-folder-row {
          display:flex; align-items:center; gap:11px;
          padding:11px 16px; border-left:3px solid transparent; cursor:pointer;
          color:#43453F; font-size:.82rem; position:relative;
          border-bottom:1px solid rgba(67,69,63,.08); transition:background .14s;
          font-family:'Outfit',sans-serif;
        }
        .doc-folder-row:hover { background:#F1EEE6; }
        .doc-folder-row.active { background:rgba(111,175,107,.08); color:#1E3D2B; font-weight:600; border-left-color:#6FAF6B; }
        .doc-folder-chevron { width:13px; font-size:.58rem; color:#83867C; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .doc-folder-icon { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:rgba(111,175,107,.12); font-size:.95rem; flex-shrink:0; }
        .doc-folder-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; font-size:.82rem; }
        .doc-folder-count { font-size:.7rem; font-weight:500; font-family:'JetBrains Mono',monospace; color:#83867C; flex-shrink:0; }
        .doc-folder-row.active .doc-folder-count { color:#2F6A38; }
        .doc-folder-menu-btn {
          opacity:0; background:none; border:none; cursor:pointer;
          color:#83867C; font-size:1.05rem; padding:2px 5px; border-radius:7px;
          display:flex; align-items:center;
        }
        .doc-folder-row:hover .doc-folder-menu-btn { opacity:.65; }
        .doc-folder-menu-btn:hover { opacity:1 !important; background:rgba(67,69,63,.08); }
        .doc-folder-menu {
          position:absolute; right:8px; top:calc(100% - 6px); z-index:200;
          background:var(--sf); border:1px solid var(--bd); border-radius:12px;
          padding:5px; min-width:182px;
          box-shadow:0 14px 32px rgba(30,61,43,.18);
        }
        .doc-folder-menu button {
          display:flex; align-items:center; gap:9px; width:100%;
          padding:8px 11px; background:none; border:none; cursor:pointer; border-radius:8px;
          font-size:.78rem; color:#43453F; text-align:left; font-family:'Outfit',sans-serif;
        }
        .doc-folder-menu button:hover { background:#F1EEE6; }
        .doc-folder-menu button.danger { color:#C0392B; }
        .doc-folder-rename {
          flex:1; font-size:.8rem; padding:4px 8px; border-radius:8px;
          border:1px solid #6FAF6B; outline:none; color:#1E3D2B; background:var(--sf); font-family:'Outfit',sans-serif;
        }
        .doc-add-folder-btn {
          display:flex; align-items:center; gap:7px; width:calc(100% - 24px); margin:10px 12px;
          padding:9px 11px; border-radius:11px; border:1px dashed rgba(67,69,63,.18); background:transparent;
          color:var(--mid); font-size:.78rem; font-weight:600; cursor:pointer; justify-content:center;
          font-family:'Outfit',sans-serif;
        }
        .doc-add-folder-btn:hover { background:rgba(111,175,107,.06); border-color:#6FAF6B; }
        .doc-new-folder-row { display:flex; gap:6px; padding:8px 12px; align-items:center; }

        /* main = tarjeta (igual que el panel derecho del Vault) */
        .doc-main {
          min-width:0; background:var(--sf); border:1px solid rgba(67,69,63,.1);
          border-radius:22px; overflow:hidden; box-shadow:0 12px 30px rgba(30,61,43,.06);
        }
        .doc-main-head {
          display:flex; align-items:center; justify-content:space-between;
          gap:12px; padding:18px 20px; border-bottom:1px solid rgba(67,69,63,.1); flex-wrap:wrap;
        }
        .doc-main-body { padding:18px 20px; }
        .doc-breadcrumb {
          display:flex; align-items:center; gap:4px;
          font-size:.66rem; color:#83867C; margin-bottom:4px; font-family:'JetBrains Mono',monospace;
        }
        .doc-breadcrumb span { cursor:pointer; }
        .doc-breadcrumb span:last-child { color:#43453F; font-weight:600; cursor:default; }
        .doc-page-title {
          font-family:'Playfair Display',serif; font-size:1.35rem; font-weight:600; color:#1E3D2B; line-height:1.15;
        }
        .doc-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .doc-empty {
          padding:48px 24px; text-align:center; color:#83867C; font-size:.84rem;
          border:1px dashed rgba(67,69,63,.18); border-radius:14px;
        }
        .doc-row-actions { display:flex; gap:2px; justify-content:flex-end; }
        .doc-row-btn {
          background:none; border:none; cursor:pointer; font-size:1rem;
          padding:6px 7px; border-radius:9px; color:var(--mid); opacity:.6; transition:opacity .12s,background .12s;
        }
        .doc-row-btn:hover { opacity:1; background:rgba(111,175,107,.1); }
        .doc-row-btn.danger { color:#C0392B; }
        .doc-row-btn.danger:hover { background:#FDECEA; }
        .doc-count { font-size:.68rem; color:#83867C; margin-top:12px; font-family:'JetBrains Mono',monospace; }

        /* move modal tree */
        .move-tree-row {
          display:flex; align-items:center; gap:8px; padding:8px 12px;
          border-radius:8px; cursor:pointer; font-size:.83rem; color:#43453F;
        }
        .move-tree-row:hover { background:#F1EEE6; }
        .move-tree-row.current { background:rgba(111,175,107,.1); font-weight:600; }
        .move-current-badge {
          font-size:.65rem; background:var(--forest); color:#fff;
          border-radius:99px; padding:2px 8px; font-weight:700;
        }
        .move-chevron { width:14px; font-size:.72rem; cursor:pointer; }

        /* confirm modal */
        .modal-overlay { position:fixed; inset:0; background:rgba(20,30,22,.45); backdrop-filter:blur(6px); z-index:9000; display:flex; align-items:center; justify-content:center; }
        .modal-box { background:#FBFAF6; border:1px solid var(--bd); border-radius:22px; padding:24px; width:100%; box-shadow:0 24px 60px rgba(0,0,0,.22); }
        .modal-title { font-family:'Playfair Display',serif; font-weight:600; font-size:1.15rem; margin-bottom:8px; color:#1E3D2B; }

        /* header chip + buscador pill + tarjetas de documento (idéntico a usr-row del Vault) */
        .doc-dhead-ico { width:44px; height:44px; border-radius:13px; display:flex; align-items:center; justify-content:center; background:rgba(111,175,107,.12); font-size:1.25rem; flex-shrink:0; }
        .doc-search { display:flex; align-items:center; gap:8px; background:var(--bg2); border:1px solid rgba(67,69,63,.1); border-radius:11px; padding:8px 12px; margin-bottom:14px; }
        .doc-search input { border:none; background:none; outline:none; width:100%; font-size:.82rem; color:var(--tx); font-family:'Outfit',sans-serif; }
        .doc-search svg { color:#83867C; flex-shrink:0; font-size:.95rem; }
        .doc-rows { display:flex; flex-direction:column; gap:8px; }
        .doc-card-row { display:flex; align-items:center; gap:12px; padding:11px 14px; border:1px solid rgba(67,69,63,.1); border-radius:13px; background:var(--sf); transition:border-color .15s; }
        .doc-card-row:hover { border-color:rgba(67,69,63,.18); }
        .doc-card-ico { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:var(--bg2); color:var(--mid); font-size:1rem; flex-shrink:0; }
        .doc-card-info { flex:1; min-width:0; }
        .doc-card-name { font-size:.82rem; font-weight:600; color:#1E3D2B; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .doc-card-meta { font-size:.69rem; color:#83867C; font-family:'JetBrains Mono',monospace; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
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
              <span className="doc-folder-icon">{item.icon}</span>
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

          {/* header */}
          <div className="doc-main-head">
            <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}>
              <span className="doc-dhead-ico">{activeId==="all"?"🗂":activeId==="unfiled"?"📋":"📁"}</span>
              <div style={{minWidth:0}}>
                {breadcrumb.length > 0 && (
                  <div className="doc-breadcrumb">
                    <span onClick={() => setActiveId("all")}>Documentos</span>
                    {breadcrumb.map((crumb, i) => (
                      <span key={crumb.id} style={{display:"flex",alignItems:"center",gap:4}}>
                        <HiOutlineChevronRight style={{fontSize:".65rem",opacity:.5}}/>
                        <span
                          style={{cursor: i<breadcrumb.length-1?"pointer":"default", color: i===breadcrumb.length-1?"#43453F":"var(--mu)"}}
                          onClick={() => i<breadcrumb.length-1 && setActiveId(crumb.id)}
                        >{crumb.name}</span>
                      </span>
                    ))}
                  </div>
                )}
                <div className="doc-page-title">{activeLabel}</div>
              </div>
            </div>
            <div className="doc-actions">
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

          <div className="doc-main-body">

          {/* buscador */}
          <label className="doc-search">
            <HiOutlineMagnifyingGlass />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar documento…" />
          </label>

          {/* documentos (tarjetas) */}
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
            <div className="doc-rows">
              {filtered.map(doc => (
                <div key={doc.id} className="doc-card-row">
                  <span className="doc-card-ico">{fileIcon(doc.name)}</span>
                  <div className="doc-card-info">
                    <div className="doc-card-name" title={doc.name}>{doc.name}</div>
                    <div className="doc-card-meta">
                      {CAT_LABEL[doc.category] || doc.category} · {fmtSize(doc.file_size)} · {fmtDate(doc.uploaded_at)}{doc.entity_label ? ` · ${doc.entity_label}` : ""}
                    </div>
                  </div>
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
                </div>
              ))}
            </div>
          )}

          {filtered.length > 0 && (
            <div className="doc-count">{filtered.length} archivo{filtered.length!==1?"s":""}</div>
          )}
          </div>
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
