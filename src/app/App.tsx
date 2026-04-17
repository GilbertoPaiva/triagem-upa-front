import { useCallback, useEffect, useState } from "react";
import { api, type Patient, type Priority } from "../services/api";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Page = "queue" | "doctor" | "triage";

// ─── Protocolo de Manchester ──────────────────────────────────────────────────
const PRIORITY: Record<Priority, { label: string; color: string; bg: string; border: string; ring: string }> = {
  1: { label: "Emergência",    color: "#DC2626", bg: "#DC2626", border: "#DC2626", ring: "rgba(220,38,38,0.2)" },
  2: { label: "Muito Urgente", color: "#EA580C", bg: "#EA580C", border: "#EA580C", ring: "rgba(234,88,12,0.2)" },
  3: { label: "Urgente",       color: "#CA8A04", bg: "#CA8A04", border: "#CA8A04", ring: "rgba(202,138,4,0.2)" },
  4: { label: "Pouco Urgente", color: "#16A34A", bg: "#16A34A", border: "#16A34A", ring: "rgba(22,163,74,0.2)" },
  5: { label: "Não Urgente",   color: "#2563EB", bg: "#2563EB", border: "#2563EB", ring: "rgba(37,99,235,0.2)" },
};

// ─── Badge de prioridade ──────────────────────────────────────────────────────
function PriorityBadge({ priority, size = "sm" }: { priority: Priority; size?: "sm" | "lg" }) {
  const p = PRIORITY[priority];
  const pad = size === "lg" ? "8px 16px" : "4px 10px";
  const fontSize = size === "lg" ? "14px" : "11px";
  return (
    <span
      style={{
        background: p.bg,
        color: "#fff",
        borderRadius: 6,
        padding: pad,
        fontSize,
        fontWeight: 700,
        letterSpacing: "0.03em",
        whiteSpace: "nowrap",
      }}
    >
      P{priority} · {p.label}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function App() {
  const [queueData, setQueueData]   = useState<Patient[]>([]);
  const [attended, setAttended]     = useState<Patient[]>([]);
  const [page, setPage]             = useState<Page>("queue");
  const [isModalOpen, setIsModal]   = useState(false);
  const [showAttended, setShowAtt]  = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Form triagem
  const [form, setForm] = useState<{ name: string; priority: Priority }>({
    name: "",
    priority: 3,
  });

  // Derivados
  const inService = queueData.find((p) => p.status === "IN_SERVICE") ?? null;
  const queue     = queueData.filter((p) => p.status === "WAITING");

  const refresh = useCallback(async () => {
    try {
      const [q, h] = await Promise.all([api.getQueue(), api.getHistory()]);
      setQueueData(q);
      setAttended(h);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // Polling 5s para o painel público funcionar como TV
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  // ── Ações ────────────────────────────────────────────────────────────────────
  async function callNext() {
    if (queue.length === 0) return;
    try {
      await api.callNext();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function finishCurrent() {
    if (!inService) return;
    try {
      await api.finishCurrent(inService.id);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function addPatient() {
    if (!form.name.trim()) return;
    try {
      await api.addPatient(form.name.trim(), form.priority);
      setForm({ name: "", priority: 3 });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────────
  const headerNav: { label: string; value: Page }[] = [
    { label: "Painel Público",  value: "queue"   },
    { label: "Painel do Médico", value: "doctor" },
    { label: "Triagem",          value: "triage" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Header ── */}
      <header className="border-b border-border bg-card">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-foreground text-lg font-semibold">UPA Central — Mossoró</h1>
            <p className="text-muted-foreground text-sm">Sistema de Triagem · Protocolo de Manchester</p>
          </div>
          <nav className="flex gap-2">
            {headerNav.map((nav) => (
              <button
                key={nav.value}
                onClick={() => setPage(nav.value)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  page === nav.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {nav.label}
              </button>
            ))}
          </nav>
        </div>
        {error && (
          <div className="px-6 py-2 bg-destructive/10 text-destructive text-sm border-t border-destructive/30">
            {error}
          </div>
        )}
      </header>

      {/* ── Main ── */}
      <main className="flex-1 px-6 py-8">

        {/* ════════════════ PAINEL PÚBLICO ════════════════ */}
        {page === "queue" && (
          <>
            {/* Faixa de espera */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-muted-foreground text-sm">
                  Aguardando · {queue.length} paciente{queue.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => setIsModal(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Ver fila completa
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {queue.slice(0, 8).map((p) => {
                  const pr = PRIORITY[p.priority];
                  return (
                    <div
                      key={p.id}
                      className="flex-shrink-0 w-44 px-4 py-3 bg-card rounded-lg border"
                      style={{ borderColor: pr.border }}
                    >
                      <div className="text-xs font-bold mb-1" style={{ color: pr.color }}>
                        {p.ticket}
                      </div>
                      <div className="text-sm text-foreground truncate mb-2">{p.name}</div>
                      <PriorityBadge priority={p.priority} />
                    </div>
                  );
                })}
                {queue.length === 0 && (
                  <p className="text-muted-foreground text-sm italic">Nenhum paciente aguardando.</p>
                )}
              </div>
            </div>

            {/* Cards principais */}
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Em atendimento */}
                <div
                  className="p-8 rounded-xl text-white"
                  style={{ background: inService ? PRIORITY[inService.priority].bg : "#6b7280" }}
                >
                  <div className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-3">
                    Em Atendimento
                  </div>
                  {inService ? (
                    <>
                      <div className="text-5xl font-bold mb-2">{inService.ticket}</div>
                      <div className="text-lg mb-3">{inService.name}</div>
                      <div className="text-xs opacity-70">P{inService.priority} · {PRIORITY[inService.priority].label}</div>
                    </>
                  ) : (
                    <div className="text-lg opacity-70">Nenhum paciente</div>
                  )}
                </div>

                {/* Próximos 2 */}
                {queue.slice(0, 2).map((p, i) => {
                  const pr = PRIORITY[p.priority];
                  return (
                    <div
                      key={p.id}
                      className="bg-card border border-border p-8 rounded-xl"
                      style={{ borderLeft: `4px solid ${pr.border}` }}
                    >
                      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                        {i === 0 ? "Próximo" : "Em Breve"}
                      </div>
                      <div className="text-5xl font-bold text-foreground mb-2">{p.ticket}</div>
                      <div className="text-lg text-foreground mb-3">{p.name}</div>
                      <PriorityBadge priority={p.priority} />
                    </div>
                  );
                })}

                {queue.length === 0 && (
                  <div className="md:col-span-2 bg-card border border-border p-8 rounded-xl flex items-center justify-center">
                    <p className="text-muted-foreground">Fila vazia</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ════════════════ PAINEL DO MÉDICO ════════════════ */}
        {page === "doctor" && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-foreground font-semibold text-xl mb-8">Painel do Médico</h2>

            {/* Paciente atual */}
            <div
              className="rounded-xl p-8 mb-6 border-2"
              style={inService
                ? { borderColor: PRIORITY[inService.priority].border, background: PRIORITY[inService.priority].ring }
                : { borderColor: "var(--border)", background: "var(--card)" }
              }
            >
              <div className="text-sm text-muted-foreground mb-4">Paciente em Atendimento</div>
              {inService ? (
                <div className="flex items-start gap-6">
                  <div className="text-5xl font-bold" style={{ color: PRIORITY[inService.priority].color }}>
                    {inService.ticket}
                  </div>
                  <div>
                    <div className="text-2xl text-foreground font-medium mb-2">{inService.name}</div>
                    <PriorityBadge priority={inService.priority} size="lg" />
                    <div className="text-sm text-muted-foreground mt-2">Chegada: {inService.arrivalTime}</div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhum paciente em atendimento no momento.</p>
              )}
            </div>

            {/* Próximo */}
            {queue[0] && (
              <div className="bg-muted rounded-xl p-6 mb-8">
                <div className="text-sm text-muted-foreground mb-2">Próximo a ser chamado</div>
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold" style={{ color: PRIORITY[queue[0].priority].color }}>
                    {queue[0].ticket}
                  </div>
                  <div className="flex-1">
                    <div className="text-foreground">{queue[0].name}</div>
                  </div>
                  <PriorityBadge priority={queue[0].priority} />
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="flex flex-col gap-3">
              <button
                onClick={callNext}
                disabled={queue.length === 0}
                className="px-8 py-4 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                Chamar Próximo Paciente
              </button>
              <button
                onClick={finishCurrent}
                disabled={!inService}
                className="px-8 py-4 bg-destructive text-destructive-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                Encerrar Atendimento Atual
              </button>
            </div>

            {/* Legenda */}
            <div className="mt-10 p-4 bg-card border border-border rounded-xl">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Protocolo de Manchester
              </div>
              <div className="grid grid-cols-1 gap-2">
                {([1, 2, 3, 4, 5] as Priority[]).map((lvl) => (
                  <div key={lvl} className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: PRIORITY[lvl].bg }}
                    />
                    <span className="text-sm text-foreground">
                      P{lvl} — {PRIORITY[lvl].label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ TRIAGEM ════════════════ */}
        {page === "triage" && (
          <div className="max-w-xl mx-auto">
            <h2 className="text-foreground font-semibold text-xl mb-2">Cadastro de Triagem</h2>
            <p className="text-muted-foreground text-sm mb-8">
              Registre o paciente com o nível de urgência do Protocolo de Manchester.
              A fila é reordenada automaticamente por prioridade.
            </p>

            <div className="bg-card border border-border rounded-xl p-6 mb-8">
              {/* Nome */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">Nome do Paciente</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nome completo"
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Prioridade */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-3">Nível de Urgência</label>
                <div className="flex flex-col gap-2">
                  {([1, 2, 3, 4, 5] as Priority[]).map((lvl) => {
                    const pr = PRIORITY[lvl];
                    const selected = form.priority === lvl;
                    return (
                      <button
                        key={lvl}
                        onClick={() => setForm((f) => ({ ...f, priority: lvl }))}
                        className="flex items-center gap-4 px-4 py-3 rounded-lg border-2 transition-all text-left"
                        style={{
                          borderColor: selected ? pr.border : "var(--border)",
                          background: selected ? pr.ring : "transparent",
                        }}
                      >
                        <span
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ background: pr.bg }}
                        />
                        <span className="font-semibold" style={{ color: pr.color }}>P{lvl}</span>
                        <span className="text-foreground text-sm">{pr.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={addPatient}
                disabled={!form.name.trim()}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                Registrar Paciente na Fila
              </button>
            </div>

            {/* Fila atual resumida */}
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-3">
                Fila atual · {queue.length} aguardando
              </div>
              <div className="flex flex-col gap-2">
                {queue.slice(0, 6).map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg"
                  >
                    <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                    <span className="font-mono font-semibold text-sm" style={{ color: PRIORITY[p.priority].color }}>
                      {p.ticket}
                    </span>
                    <span className="flex-1 text-sm text-foreground truncate">{p.name}</span>
                    <PriorityBadge priority={p.priority} />
                  </div>
                ))}
                {queue.length === 0 && (
                  <p className="text-muted-foreground text-sm italic">Fila vazia.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card px-6 py-4">
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>© 2026 UPA Central · Sistema de Triagem</span>
          <span>Priority Queue · atualização a cada 5s</span>
        </div>
      </footer>

      {/* ── Modal fila completa ── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsModal(false)}
        >
          <div
            className="bg-card rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-foreground font-semibold">Fila Completa</h2>
                <button onClick={() => setIsModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
              <div className="flex gap-2 bg-muted p-1 rounded-lg">
                <button
                  onClick={() => setShowAtt(false)}
                  className={`flex-1 px-4 py-2 rounded text-sm transition-colors ${
                    !showAttended ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Aguardando ({queue.length})
                </button>
                <button
                  onClick={() => setShowAtt(true)}
                  className={`flex-1 px-4 py-2 rounded text-sm transition-colors ${
                    showAttended ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Atendidos ({attended.length})
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {!showAttended ? (
                <div className="space-y-3">
                  {inService && (
                    <div
                      className="flex items-center gap-4 p-4 rounded-lg border-2"
                      style={{ borderColor: PRIORITY[inService.priority].border, background: PRIORITY[inService.priority].ring }}
                    >
                      <div className="font-bold text-xl min-w-[64px]" style={{ color: PRIORITY[inService.priority].color }}>
                        {inService.ticket}
                      </div>
                      <div className="flex-1">
                        <div className="text-foreground">{inService.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">Em atendimento</div>
                      </div>
                      <PriorityBadge priority={inService.priority} />
                    </div>
                  )}
                  {queue.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border">
                      <div className="text-xs text-muted-foreground w-6">{i + 1}.</div>
                      <div className="font-bold text-xl min-w-[64px]" style={{ color: PRIORITY[p.priority].color }}>
                        {p.ticket}
                      </div>
                      <div className="flex-1">
                        <div className="text-foreground">{p.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">Chegada: {p.arrivalTime}</div>
                      </div>
                      <PriorityBadge priority={p.priority} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {attended.map((p) => (
                    <div key={p.id} className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border">
                      <div className="font-bold text-xl text-muted-foreground min-w-[64px]">{p.ticket}</div>
                      <div className="flex-1">
                        <div className="text-foreground">{p.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">Atendido às {p.attendedAt}</div>
                      </div>
                      <span className="text-green-600 font-bold">✓</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
