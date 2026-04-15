import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:4000';
const SOCKET_URL = 'http://localhost:4000';
const TABS = [
  { id: 'telemetry', label: 'Live Telemetry' },
  { id: 'errors', label: 'Error Console' },
  { id: 'logs', label: 'System Logs' },
  { id: 'memories', label: 'Continual Learning' },
];

const PIPELINE = ['Orchestrator', 'Thinker Pro', 'Architect', 'Coder', '100x Reviewer'];
const TELEMETRY_LIMIT = 240;
const ALERT_LIMIT = 120;

function formatTime(timestamp) {
  if (!timestamp) return '00:00:00';
  return new Date(timestamp).toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function normalizeAgent(agent = '') {
  const value = String(agent).toLowerCase();
  if (value.includes('thinker')) return 'Thinker Pro';
  if (value.includes('architect')) return 'Architect';
  if (value.includes('coder')) return 'Coder';
  if (value.includes('review')) return '100x Reviewer';
  if (value.includes('orchestrator')) return 'Orchestrator';
  if (value.includes('telemetry')) return 'Orchestrator';
  return String(agent || 'Orchestrator').substring(0, 20);
}

function normalizePayload(payload) {
  if (typeof payload === 'string') return payload;
  if (payload === null || payload === undefined) return '';
  if (typeof payload === 'object') {
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  }
  return String(payload);
}

function clamp(list, limit) {
  if (list.length <= limit) {
    return list;
  }

  return list.slice(list.length - limit);
}

function AlertPill({ level, children }) {
  const base =
    level === 'critical'
      ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
      : 'border-amber-500/40 bg-amber-500/10 text-amber-200';

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.24em] ${base}`}
    >
      {children}
    </span>
  );
}

function PanelShell({ title, subtitle, children, className = '' }) {
  return (
    <section
      className={`rounded-3xl border border-control-edge bg-control-panel/92 shadow-panel ${className}`}
    >
      <header className="flex items-end justify-between gap-4 border-b border-white/5 px-5 py-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.34em] text-control-slate">{subtitle}</p>
          <h2 className="mt-1 text-sm font-semibold tracking-[0.22em] text-white">{title}</h2>
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function StatBar({ label, value, max, accentClass }) {
  const ratio = Math.min(value / max, 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-control-slate">
        <span>{label}</span>
        <span>
          {value} / {max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/30">
        <div
          className={`h-full rounded-full ${accentClass}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

function PipelineStepper({ activeAgent, socketStatus }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-control-slate">
        <span>Agent DAG</span>
        <span className={socketStatus === 'connected' ? 'text-emerald-300' : 'text-rose-300'}>
          {socketStatus === 'connected' ? 'Socket Online' : 'Socket Offline'}
        </span>
      </div>
      <div className="space-y-2">
        {PIPELINE.map((step, index) => {
          const active = step === activeAgent;
          return (
            <div key={step} className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border text-[10px] font-semibold uppercase tracking-[0.28em] ${
                  active
                    ? 'border-amber-300 bg-amber-300/20 text-amber-100'
                    : 'border-control-edge bg-black/20 text-control-slate'
                }`}
              >
                {index + 1}
              </div>
              <div
                className={`flex-1 rounded-2xl border px-4 py-3 text-sm transition ${
                  active
                    ? 'border-amber-300/40 bg-amber-300/10 text-white'
                    : 'border-white/5 bg-black/15 text-control-slate'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium tracking-[0.12em]">{step}</span>
                  <span className="text-[11px] uppercase tracking-[0.28em]">
                    {active ? 'Active' : 'Idle'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TelemetryEntry({ item }) {
  const isRequest = item.type === 'request';
  const tone = isRequest ? 'text-amber-200' : 'text-emerald-200';
  const border = isRequest ? 'border-amber-400/20' : 'border-emerald-400/20';
  const label = isRequest ? 'request' : 'response';

  return (
    <article className={`rounded-2xl border ${border} bg-black/25 p-4`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-[10px] uppercase tracking-[0.3em] text-control-slate">
        <span>{formatTime(item.timestamp)}</span>
        <span className={tone}>{item.agent || 'orchestrator'}</span>
        <span className={tone}>{label}</span>
      </div>
      <pre
        className={`overflow-x-auto whitespace-pre-wrap break-words text-[12px] leading-6 ${tone}`}
      >
        {normalizePayload(item.payload)}
      </pre>
    </article>
  );
}

function AlertCard({ item, index }) {
  const isCritical = item.level === 'critical';
  const border = isCritical ? 'border-rose-500/30' : 'border-amber-500/30';
  const tone = isCritical ? 'text-rose-200' : 'text-amber-200';

  return (
    <article className={`rounded-2xl border ${border} bg-black/25 p-4`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <AlertPill level={item.level}>{item.level}</AlertPill>
        <span className="text-[10px] uppercase tracking-[0.28em] text-control-slate">
          #{index + 1}
        </span>
        <span className="text-[10px] uppercase tracking-[0.28em] text-control-slate">
          {formatTime(item.timestamp)}
        </span>
      </div>
      <div className={`text-sm font-medium tracking-[0.08em] ${tone}`}>{item.message}</div>
      <div className="mt-2 text-[12px] leading-6 text-control-slate">
        <span className="text-white/70">Agent:</span> {item.agent || 'unknown'}
      </div>
      <div className="mt-2 rounded-xl border border-white/5 bg-black/25 p-3 text-[12px] leading-6 text-zinc-200">
        {item.feedback}
      </div>
      {item.level === 'warning' ? (
        <div className="mt-3 text-[10px] uppercase tracking-[0.24em] text-amber-200">
          Fix-loop attempt {item.attempt ?? index + 1}
        </div>
      ) : null}
    </article>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/25 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.28em] text-control-slate">{label}</div>
      <div className={`mt-2 text-lg font-semibold tracking-[0.08em] ${accent}`}>{value}</div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('telemetry');
  const [socketStatus, setSocketStatus] = useState('connecting');
  const [activeAgent, setActiveAgent] = useState('Orchestrator');
  const [telemetry, setTelemetry] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [paused, setPaused] = useState(false);
  const [criticalHalt, setCriticalHalt] = useState(null);
  const [logs, setLogs] = useState({ file: null, count: 0, lines: [] });
  const [logsQuery, setLogsQuery] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [memories, setMemories] = useState([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [memoryQuery, setMemoryQuery] = useState('');
  const telemetryRef = useRef(null);
  const pausedQueueRef = useRef([]);
  const pausedRef = useRef(false);
  const logsLoadedRef = useRef(false);
  const memoriesLoadedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
    if (!paused && pausedQueueRef.current.length > 0) {
      setTelemetry((current) => clamp([...current, ...pausedQueueRef.current], TELEMETRY_LIMIT));
      pausedQueueRef.current = [];
    }
  }, [paused]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: Infinity,
    });

    socket.on('connect', () => setSocketStatus('connected'));
    socket.on('disconnect', () => setSocketStatus('disconnected'));

    socket.on('llm_stream', (event) => {
      const mappedAgent = normalizeAgent(event?.agent);
      setActiveAgent(mappedAgent);

      if (pausedRef.current) {
        pausedQueueRef.current.push(event);
        return;
      }

      setTelemetry((current) => clamp([...current, event], TELEMETRY_LIMIT));
    });

    socket.on('system_alert', (event) => {
      const normalized = {
        ...event,
        agent: normalizeAgent(event?.agent),
        timestamp: event?.timestamp ?? Date.now(),
      };

      setAlerts((current) => clamp([...current, normalized], ALERT_LIMIT));
      setActiveAgent(normalized.agent);

      if (normalized.level === 'critical') {
        setCriticalHalt(normalized);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (telemetryRef.current && !paused) {
      telemetryRef.current.scrollTop = telemetryRef.current.scrollHeight;
    }
  }, [telemetry, paused]);

  useEffect(() => {
    let cancelled = false;

    async function loadLogs() {
      if (logsLoadedRef.current || activeTab !== 'logs') {
        return;
      }

      logsLoadedRef.current = true;
      setLogsLoading(true);

      try {
        const response = await fetch(`${API_BASE}/api/logs`);
        const data = await response.json();
        if (!cancelled) {
          setLogs({
            file: data.file ?? null,
            count: data.count ?? 0,
            lines: Array.isArray(data.lines) ? data.lines : [],
          });
        }
      } catch {
        if (!cancelled) {
          setLogs({ file: null, count: 0, lines: ['Unable to load logs.'] });
        }
      } finally {
        if (!cancelled) {
          setLogsLoading(false);
        }
      }
    }

    loadLogs();

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;

    async function loadMemories() {
      if (memoriesLoadedRef.current || activeTab !== 'memories') {
        return;
      }

      memoriesLoadedRef.current = true;
      setMemoriesLoading(true);

      try {
        const response = await fetch(`${API_BASE}/api/memories`);
        const data = await response.json();
        if (!cancelled) {
          setMemories(Array.isArray(data.items) ? data.items : []);
        }
      } catch {
        if (!cancelled) {
          setMemories([]);
        }
      } finally {
        if (!cancelled) {
          setMemoriesLoading(false);
        }
      }
    }

    loadMemories();

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const filteredLogs = useMemo(() => {
    const query = logsQuery.trim().toLowerCase();
    if (!query) {
      return logs.lines;
    }

    return logs.lines.filter((line) => String(line).toLowerCase().includes(query));
  }, [logs.lines, logsQuery]);

  const filteredMemories = useMemo(() => {
    const query = memoryQuery.trim().toLowerCase();
    if (!query) {
      return memories;
    }

    return memories.filter((item) => {
      const haystack = `${item.filename ?? ''} ${item.snippet ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [memories, memoryQuery]);

  const systemBusy = Boolean(criticalHalt);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(215,178,76,0.09),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(93,187,116,0.08),_transparent_20%),linear-gradient(180deg,_#07110f_0%,_#040807_100%)] text-zinc-100">
      <main
        className={`mx-auto flex min-h-full max-w-[1600px] flex-col px-4 pb-6 pt-4 sm:px-6 lg:px-8 ${systemBusy ? 'pointer-events-none select-none opacity-85' : ''}`}
      >
        <header className="mb-5 flex flex-col gap-4 rounded-[28px] border border-white/5 bg-black/25 px-5 py-4 shadow-panel backdrop-blur-sm lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.42em] text-control-slate">
              AOS Control Plane
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[0.18em] text-white sm:text-3xl">
              Fail-Closed Telemetry, Memory, and Fix-Loop Oversight
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-control-slate">
              Real-time request/response capture, historical state retrieval, and continual learning
              snapshots for the local Qwen-backed AOS.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <StatCard
              label="Telemetry"
              value={socketStatus === 'connected' ? 'ONLINE' : 'OFFLINE'}
              accent={socketStatus === 'connected' ? 'text-emerald-200' : 'text-rose-200'}
            />
            <StatCard label="Ollama Node" value="ONLINE" accent="text-emerald-200" />
            <StatCard label="RAM Ceiling" value="16GB" accent="text-amber-200" />
            <StatCard label="Auto-Launch" value="ARMED" accent="text-amber-200" />
          </div>
        </header>

        <nav className="mb-5 flex flex-wrap gap-2 rounded-3xl border border-white/5 bg-black/20 p-2 shadow-panel">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-2xl px-4 py-3 text-[11px] uppercase tracking-[0.3em] transition ${
                  active
                    ? 'bg-amber-300/15 text-amber-100 ring-1 ring-amber-300/30'
                    : 'text-control-slate hover:bg-white/5 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {activeTab === 'telemetry' ? (
          <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
            <div className="space-y-5">
              <PanelShell title="System Health" subtitle="hardware envelope">
                <div className="space-y-4 text-sm text-control-slate">
                  <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-control-slate">
                      <span>Node</span>
                      <span className="text-emerald-300">ONLINE</span>
                    </div>
                    <div className="mt-2 text-xl font-semibold tracking-[0.08em] text-white">
                      Ollama Node: ONLINE
                    </div>
                  </div>
                  <StatBar
                    label="Working Budget"
                    value={3000}
                    max={8192}
                    accentClass="bg-gradient-to-r from-amber-300 to-amber-200"
                  />
                  <StatBar
                    label="Session Budget"
                    value={5000}
                    max={8192}
                    accentClass="bg-gradient-to-r from-emerald-300 to-emerald-200"
                  />
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <StatCard label="Max Context" value="8192" accent="text-amber-200" />
                    <StatCard label="Browser" value="AUTO" accent="text-emerald-200" />
                  </div>
                </div>
              </PanelShell>

              <PanelShell title="Agent DAG" subtitle="active pipeline">
                <PipelineStepper activeAgent={activeAgent} socketStatus={socketStatus} />
              </PanelShell>
            </div>

            <PanelShell title="Live Telemetry Terminal" subtitle="streaming debate">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-[11px] uppercase tracking-[0.28em] text-control-slate">
                  {paused ? 'Stream paused' : 'Stream live'}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTelemetry([])}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.24em] text-white transition hover:bg-white/10"
                  >
                    Clear Logs
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaused((value) => !value)}
                    className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-[11px] uppercase tracking-[0.24em] text-amber-100 transition hover:bg-amber-300/15"
                  >
                    {paused ? 'Resume Stream' : 'Pause Stream'}
                  </button>
                </div>
              </div>

              <div
                ref={telemetryRef}
                className="h-[70vh] min-h-[540px] overflow-y-auto rounded-[24px] border border-white/5 bg-[#050b0a] p-4 shadow-inner shadow-black/40"
              >
                <div className="space-y-3">
                  {telemetry.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-sm leading-7 text-control-slate">
                      Waiting for telemetry events from the local provider. Requests and responses
                      will render here in chronological order.
                    </div>
                  ) : null}
                  {telemetry.map((item, index) => (
                    <TelemetryEntry key={`${item.timestamp ?? index}-${index}`} item={item} />
                  ))}
                </div>
              </div>
            </PanelShell>
          </div>
        ) : null}

        {activeTab === 'errors' ? (
          <PanelShell title="Error Console" subtitle="system alerts and halt states">
            <div className="mb-4 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.28em] text-control-slate">
              <span>{alerts.length} queued alerts</span>
              <span className={criticalHalt ? 'text-rose-300' : 'text-emerald-300'}>
                {criticalHalt ? 'Fail-Closed Halt' : 'Operational'}
              </span>
            </div>
            <div className="grid gap-3">
              {alerts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-sm leading-7 text-control-slate">
                  Alerts will appear here when the reviewer emits warnings or when a critical system
                  fault is broadcast.
                </div>
              ) : null}
              {alerts.map((alert, index) => (
                <AlertCard
                  key={`${alert.timestamp ?? index}-${index}`}
                  item={alert}
                  index={index}
                />
              ))}
            </div>
          </PanelShell>
        ) : null}

        {activeTab === 'logs' ? (
          <PanelShell title="System Logs" subtitle="historical state window">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1 text-sm text-control-slate">
                <div className="text-[11px] uppercase tracking-[0.28em] text-white/70">
                  {logs.file ? logs.file : 'No log source selected'}
                </div>
                <div>
                  {logsLoading ? 'Loading last 100 lines...' : `${logs.count} lines cached`}
                </div>
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/25 px-4 py-3 text-sm text-control-slate">
                <span className="text-[10px] uppercase tracking-[0.28em] text-white/70">
                  Search
                </span>
                <input
                  value={logsQuery}
                  onChange={(event) => setLogsQuery(event.target.value)}
                  placeholder="Filter log lines"
                  className="w-64 bg-transparent text-sm text-white outline-none placeholder:text-control-slate/70"
                />
              </label>
            </div>
            <div className="overflow-hidden rounded-[24px] border border-white/5 bg-[#050b0a]">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-[#050b0a] text-[10px] uppercase tracking-[0.28em] text-control-slate">
                    <tr>
                      <th className="border-b border-white/5 px-4 py-3">#</th>
                      <th className="border-b border-white/5 px-4 py-3">Line</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan="2" className="px-4 py-8 text-center text-control-slate">
                          No matching lines.
                        </td>
                      </tr>
                    ) : null}
                    {filteredLogs.map((line, index) => (
                      <tr
                        key={`${index}-${String(line).slice(0, 24)}`}
                        className="odd:bg-white/[0.02] even:bg-black/10"
                      >
                        <td className="border-b border-white/5 px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-control-slate">
                          {index + 1}
                        </td>
                        <td className="border-b border-white/5 px-4 py-3 font-mono text-[12px] leading-6 text-zinc-100">
                          {String(line)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </PanelShell>
        ) : null}

        {activeTab === 'memories' ? (
          <PanelShell title="Continual Learning" subtitle="repository lessons">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="text-sm text-control-slate">
                {memoriesLoading
                  ? 'Scanning lessons...'
                  : `${filteredMemories.length} lesson cards available`}
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/25 px-4 py-3 text-sm text-control-slate">
                <span className="text-[10px] uppercase tracking-[0.28em] text-white/70">
                  Filter
                </span>
                <input
                  value={memoryQuery}
                  onChange={(event) => setMemoryQuery(event.target.value)}
                  placeholder="Search lessons"
                  className="w-64 bg-transparent text-sm text-white outline-none placeholder:text-control-slate/70"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredMemories.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-sm leading-7 text-control-slate md:col-span-2 xl:col-span-3">
                  Lesson cards appear here when the control plane scans{' '}
                  <span className="text-white">memories/repo/lessons</span>.
                </div>
              ) : null}
              {filteredMemories.map((lesson) => (
                <article
                  key={lesson.filename}
                  className="rounded-[24px] border border-white/5 bg-black/25 p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-amber-300/20"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.3em] text-control-slate">
                        Lesson
                      </div>
                      <h3 className="mt-2 text-sm font-semibold tracking-[0.12em] text-white">
                        {lesson.filename}
                      </h3>
                    </div>
                    <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-emerald-200">
                      Learned
                    </span>
                  </div>
                  <p className="text-sm leading-7 text-control-slate">{lesson.snippet}</p>
                </article>
              ))}
            </div>
          </PanelShell>
        ) : null}
      </main>

      {criticalHalt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-rose-950/80 px-6 backdrop-blur-sm">
          <div className="max-w-2xl rounded-[32px] border border-rose-300/30 bg-[#1b090a] p-8 text-center shadow-panel">
            <div className="text-[10px] uppercase tracking-[0.42em] text-rose-200">
              Fail-Closed System Halt
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[0.12em] text-white">
              Critical alert received
            </h2>
            <p className="mt-4 text-sm leading-7 text-rose-100/80">{criticalHalt.message}</p>
            <div className="mt-6 rounded-2xl border border-rose-300/20 bg-black/25 p-4 text-left text-sm text-rose-100/90">
              <div className="text-[10px] uppercase tracking-[0.28em] text-rose-200">Feedback</div>
              <pre className="mt-2 whitespace-pre-wrap break-words font-mono leading-6">
                {criticalHalt.feedback}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
