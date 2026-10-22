import { useEffect, useMemo, useState } from "react";
import { HiChevronDown, HiChevronRight, HiEllipsisVertical, HiPlus } from "react-icons/hi2";

function buildTree(nodes) {
  const byParent = new Map();
  nodes.forEach((n) => {
    const key = n.parentId || "root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(n);
  });
  byParent.forEach((list) => list.sort((a, b) => a.order - b.order));
  return byParent;
}

/* WBS de 3 niveles FIJOS (el control real de la constructora, no el árbol
   infinito que sugería el PRD): Proyecto (implícito) → Fase (raíz) → Partida
   (hoja, cuelga de una Fase y ya no admite sub-nodos, solo conceptos).
   Reordenar hermanos usa HTML5 drag & drop nativo — sin nueva dependencia. */
function WbsTree({ nodes, selectedId, onSelect, countsByNode = {}, canEdit, onAddChild, onRename, onDuplicate, onDelete, onReorder }) {
  const byParent = useMemo(() => buildTree(nodes), [nodes]);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [openMenuId, setOpenMenuId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [dragId, setDragId] = useState(null);

  // Cierra el menú "⋮" con cualquier clic fuera (no solo con mouseleave) o con Escape.
  useEffect(() => {
    if (!openMenuId) return undefined;
    const closeOnOutsideClick = (e) => {
      if (!e.target.closest(".obr-tree-menu-wrap")) setOpenMenuId(null);
    };
    const closeOnEscape = (e) => { if (e.key === "Escape") setOpenMenuId(null); };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openMenuId]);

  const toggleCollapse = (id) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const startRename = (node) => {
    setRenamingId(node.id);
    setRenameValue(node.name);
    setOpenMenuId(null);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) onRename(renamingId, renameValue.trim());
    setRenamingId(null);
  };

  const handleDrop = (parentKey, targetId) => {
    if (!dragId || dragId === targetId) return;
    const siblings = (byParent.get(parentKey) || []).map((n) => n.id);
    const from = siblings.indexOf(dragId);
    const to = siblings.indexOf(targetId);
    if (from === -1 || to === -1) { setDragId(null); return; }
    siblings.splice(to, 0, siblings.splice(from, 1)[0]);
    onReorder(parentKey === "root" ? null : parentKey, siblings);
    setDragId(null);
  };

  const renderNodes = (parentKey, depth) => {
    const list = byParent.get(parentKey) || [];
    return list.map((node) => {
      const children = byParent.get(node.id) || [];
      const hasChildren = children.length > 0;
      const isCollapsed = collapsed.has(node.id);
      return (
        <div key={node.id}>
          <div
            className={`obr-tree-row depth-${Math.min(depth, 4)} ${selectedId === node.id ? "selected" : ""}`}
            draggable={canEdit}
            onDragStart={() => setDragId(node.id)}
            onDragOver={(e) => canEdit && e.preventDefault()}
            onDrop={() => canEdit && handleDrop(parentKey, node.id)}
          >
            <button type="button" className="obr-tree-toggle" onClick={() => toggleCollapse(node.id)} disabled={!hasChildren}>
              {hasChildren ? (isCollapsed ? <HiChevronRight /> : <HiChevronDown />) : <span className="obr-tree-dot" />}
            </button>
            {renamingId === node.id ? (
              <input
                className="obr-tree-rename"
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenamingId(null);
                }}
              />
            ) : (
              <button type="button" className="obr-tree-name" onClick={() => onSelect(node.id)}>
                {node.name}
                {countsByNode[node.id] ? <span className="obr-tree-count">{countsByNode[node.id]}</span> : null}
              </button>
            )}
            {canEdit && (
              <div className="obr-tree-menu-wrap">
                <button type="button" className="obr-tree-menu-btn" onClick={() => setOpenMenuId(openMenuId === node.id ? null : node.id)} aria-label="Acciones del nodo">
                  <HiEllipsisVertical />
                </button>
                {openMenuId === node.id && (
                  <div className="obr-tree-menu">
                    {node.kind !== "partida" && (
                      <button type="button" onClick={() => { onAddChild(node.id); setOpenMenuId(null); }}>+ Agregar partida</button>
                    )}
                    <button type="button" onClick={() => startRename(node)}>Renombrar</button>
                    <button type="button" onClick={() => { onDuplicate(node.id); setOpenMenuId(null); }}>Duplicar</button>
                    <button type="button" className="danger" onClick={() => { onDelete(node.id); setOpenMenuId(null); }}>Eliminar</button>
                  </div>
                )}
              </div>
            )}
          </div>
          {hasChildren && !isCollapsed && renderNodes(node.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="obr-tree">
      {renderNodes("root", 0)}
      {canEdit && (
        <button type="button" className="obr-tree-add" onClick={() => onAddChild(null)}>
          <HiPlus /> Agregar fase
        </button>
      )}
    </div>
  );
}

export default WbsTree;
