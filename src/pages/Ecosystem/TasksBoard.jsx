import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { taskService } from "@/services/taskService";
import { SkeletonRows } from "@/components/ui/Skeleton";
import "./tasksboard.css";

const COLUMNS = [
  { key: "todo",        label: "Por hacer",   accent: "var(--muted)" },
  { key: "in_progress", label: "En progreso", accent: "#2C7BB6" },
  { key: "blocked",     label: "Bloqueado",   accent: "var(--danger)" },
  { key: "done",        label: "Terminado",   accent: "var(--leaf)" },
];

const PRIO = {
  low:    { label: "Baja",  cls: "low" },
  medium: { label: "Media", cls: "med" },
  high:   { label: "Alta",  cls: "high" },
};
const PRIO_CYCLE = { low: "medium", medium: "high", high: "low" };

function dueLabel(d) {
  if (!d) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(`${d}T00:00:00`);
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return { text: `Venció hace ${Math.abs(days)}d`, tone: "over" };
  if (days === 0) return { text: "Vence hoy", tone: "soon" };
  if (days <= 3) return { text: `En ${days}d`, tone: "soon" };
  return { text: due.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }), tone: "ok" };
}

export default function TasksBoard() {
  const qc = useQueryClient();
  const { showError } = useAppContext();
  const [adding, setAdding] = useState(false);  // form de "nueva tarea" abierto
  const [draft, setDraft] = useState("");
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: taskService.list,
    staleTime: 30_000,
  });

  const byCol = useMemo(() => {
    const m = { todo: [], in_progress: [], blocked: [], done: [] };
    for (const t of tasks) (m[t.status] || m.todo).push(t);
    return m;
  }, [tasks]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks"] });

  const createMut = useMutation({
    mutationFn: (body) => taskService.create(body),
    onSuccess: () => { invalidate(); setDraft(""); },
    onError: (err) => showError(err, "No se pudo crear la tarea"),
  });
  // Optimista: la tarjeta se mueve/cambia al instante en el cache y luego se
  // reconcilia con el servidor (evita el retraso al arrastrar de lado a lado).
  const updateMut = useMutation({
    mutationFn: ({ id, body }) => taskService.update(id, body),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const prev = qc.getQueryData(["tasks"]);
      qc.setQueryData(["tasks"], (old = []) => old.map((t) => (t.id === id ? { ...t, ...body } : t)));
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks"], ctx.prev);
      showError(err, "No se pudo actualizar la tarea");
    },
    onSettled: invalidate,
  });
  const deleteMut = useMutation({
    mutationFn: (id) => taskService.remove(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const prev = qc.getQueryData(["tasks"]);
      qc.setQueryData(["tasks"], (old = []) => old.filter((t) => t.id !== id));
      return { prev };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks"], ctx.prev);
      showError(err, "No se pudo eliminar la tarea");
    },
    onSettled: invalidate,
  });

  const submitNew = () => {
    const title = draft.trim();
    if (!title) { setAdding(false); return; }
    createMut.mutate({ title, status: "todo" });  // siempre entra en "Por hacer"
  };

  const onDrop = (status) => {
    setOverCol(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const task = tasks.find((t) => t.id === id);
    if (task && task.status !== status) updateMut.mutate({ id, body: { status } });
  };

  return (
    <div className="tb">
      <div className="tb-head">
        <div>
          <div className="tb-title">Mis tareas</div>
          <div className="tb-sub">Tu tablero personal · arrastra las tarjetas entre columnas</div>
        </div>
        <button className="tb-add-btn" onClick={() => { setAdding((v) => !v); setDraft(""); }}>
          <HiOutlinePlus /> Agregar tarea
        </button>
      </div>

      {adding && (
        <div className="tb-add-bar">
          <input
            autoFocus
            value={draft}
            placeholder="¿Qué hay que hacer? — Enter para agregarla a Por hacer"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); submitNew(); }
              if (e.key === "Escape") { setAdding(false); setDraft(""); }
            }}
          />
          <button className="tb-add-confirm" onClick={submitNew} disabled={!draft.trim() || createMut.isPending}>
            Agregar
          </button>
        </div>
      )}

      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : (
        <div className="tb-board">
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className={`tb-col ${overCol === col.key ? "over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col.key); }}
              onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
              onDrop={() => onDrop(col.key)}
            >
              <div className="tb-col-head">
                <span className="tb-col-name"><i style={{ background: col.accent }} />{col.label}</span>
                <span className="tb-col-count">{byCol[col.key].length}</span>
              </div>

              <div className="tb-col-body">
                {byCol[col.key].map((t) => {
                  const due = dueLabel(t.due_date);
                  return (
                    <div
                      key={t.id}
                      className={`tb-card ${dragId === t.id ? "dragging" : ""}`}
                      draggable
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => { setDragId(null); setOverCol(null); }}
                    >
                      <div className="tb-card-top">
                        <span className="tb-card-title">{t.title}</span>
                        <button className="tb-del" title="Eliminar" onClick={() => deleteMut.mutate(t.id)}>
                          <HiOutlineTrash />
                        </button>
                      </div>
                      <div className="tb-card-foot">
                        <button
                          className={`tb-prio ${PRIO[t.priority]?.cls}`}
                          title="Cambiar prioridad"
                          onClick={() => updateMut.mutate({ id: t.id, body: { priority: PRIO_CYCLE[t.priority] || "medium" } })}
                        >
                          {PRIO[t.priority]?.label || "Media"}
                        </button>
                        {due && <span className={`tb-due ${due.tone}`}>{due.text}</span>}
                      </div>
                    </div>
                  );
                })}

                {col.key === "todo" && byCol.todo.length === 0 && !adding ? (
                  <button className="tb-empty-hint" onClick={() => { setAdding(true); setDraft(""); }}>
                    + Agrega tu primera tarea
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
