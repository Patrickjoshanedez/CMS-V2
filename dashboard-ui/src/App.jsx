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
const THEME_KEY = 'aos-control-plane-theme';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

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
  if (list.length <= limit) return list;
  return list.slice(list.length - limit);
}

function AlertPill({ level, children }) {
  const isCritical = level === 'critical';
  const base = isCritical
    ? 'bg-rose-100 text-rose-700 border-rose-200'
    : 'bg-amber-100 text-amber-700 border-amber-200';

  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${base}`}>
      {children}
    </span>
  );
}

function PanelShell({ title, subtitle, children, className = '' }) {
  return (
    <section
      className={`bg-white rounded-2xl shadow-soft border border-slate-200/60 overflow-hidden ${className}`}
    >
      <header className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

function StatBar({ label, value, max, accentClass }) {
  const ratio = Math.min(value / max, 1);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-medium text-slate-700">
        <span>{label}</span>
        <span className="text-slate-500">
          {value} / {max}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${accentClass}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, isAlert }) {
  return (
    <div
      className={`p-4 rounded-xl border ${isAlert ? 'bg-rose-50 border-rose-100' : 'bg-white shadow-sm border-slate-200/60'}`}
    >
      <div className="text-sm text-slate-500 font-medium mb-1">{label}</div>
      <div className={`text-lg md:text-xl font-semibold ${accent}`}>{value}</div>
    </div>
  );
}

function PipelineStepper({ activeAgent, socketStatus }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center text-sm font-medium">
        <span className="text-slate-900">Active Pipeline</span>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${socketStatus === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'}`}
          ></span>
          <span className={socketStatus === 'connected' ? 'text-emerald-600' : 'text-rose-600'}>
            {socketStatus === 'connected' ? 'Socket Online' : 'Socket Offline'}
          </span>
        </div>
      </div>
      <div className="space-y-3">
        {PIPELINE.map((step, index) => {
          const active = step === activeAgent;
          return (
            <div
              key={step}
              className={`flex items-center gap-4 p-4 rounded-xl transition border ${active ? 'bg-indigo-50 border-indigo-100 shadow-sm' : 'bg-white border-slate-100 text-slate-400'}`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 flex justify-center items-center rounded-full text-sm font-bold ${active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}
              >
                {index + 1}
              </div>
              <div className="flex-1 flex justify-between items-center text-sm">
                <span className={`font-medium ${active ? 'text-indigo-900' : 'text-slate-600'}`}>
                  {step}
                </span>
                {active && (
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    Active
                  </span>
                )}
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
  const headerBg = isRequest ? 'bg-indigo-50' : 'bg-emerald-50';
  const headerText = isRequest ? 'text-indigo-700' : 'text-emerald-700';
  const label = isRequest ? 'Request' : 'Response';

  return (
    <article className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm mb-4">
      <div
        className={`px-4 py-2.5 flex items-center justify-between text-xs font-medium ${headerBg} ${headerText} border-b border-slate-100`}
      >
        <div className="flex gap-4 items-center">
          <span className="font-mono text-[11px] opacity-80">{formatTime(item.timestamp)}</span>
          <span className="uppercase tracking-wider">{item.agent || 'Orchestrator'}</span>
        </div>
        <span className="bg-white/50 px-2 py-0.5 rounded-md uppercase tracking-wider">{label}</span>
      </div>
      <div className="p-4 bg-slate-900 overflow-x-auto text-slate-300 font-mono text-[13px] leading-relaxed">
        <pre>{normalizePayload(item.payload)}</pre>
      </div>
    </article>
  );
}

function AlertCard({ item, index }) {
  const isCritical = item.level === 'critical';

  return (
    <article
      className={`p-5 rounded-xl border shadow-sm mb-4 ${isCritical ? 'bg-rose-50 border-rose-200/60' : 'bg-amber-50 border-amber-200/60'}`}
    >
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <AlertPill level={item.level}>{item.level}</AlertPill>
        <span className="text-xs font-mono text-slate-500">{formatTime(item.timestamp)}</span>
        <span className="text-xs font-medium text-slate-600 rounded-md bg-white/60 px-2 py-0.5">
          #{index + 1}
        </span>
      </div>
      <div
        className={`text-base font-medium mb-3 ${isCritical ? 'text-rose-900' : 'text-amber-900'}`}
      >
        {item.message}
      </div>
      <div className="text-sm font-medium text-slate-600 mb-3">
        Agent: <span className="text-slate-900">{item.agent || 'unknown'}</span>
      </div>
      <div className="bg-white rounded-lg border border-slate-200/60 p-4 text-sm text-slate-700 leading-relaxed shadow-sm">
        {item.feedback}
      </div>
    </article>
  );
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const [telemetry, setTelemetry] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [criticalHalt, setCriticalHalt] = useState(null);

  const [activeTab, setActiveTab] = useState('telemetry');
  const [paused, setPaused] = useState(false);
  const telemetryRef = useRef(null);

  const [logs, setLogs] = useState({ file: null, lines: [], count: 0 });
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsQuery, setLogsQuery] = useState('');

  const [memories, setMemories] = useState([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [memoryQuery, setMemoryQuery] = useState('');

  const activeAgent = useMemo(() => {
    if (telemetry.length === 0) return 'Orchestrator';
    return normalizeAgent(telemetry[telemetry.length - 1].agent);
  }, [telemetry]);

  const filteredLogs = useMemo(() => {
    if (!logsQuery.trim()) return logs.lines;
    const lower = logsQuery.toLowerCase();
    return logs.lines.filter((line) => String(line).toLowerCase().includes(lower));
  }, [logs.lines, logsQuery]);

  const filteredMemories = useMemo(() => {
    if (!memoryQuery.trim()) return memories;
    const lower = memoryQuery.toLowerCase();
    return memories.filter(
      (m) =>
        String(m.filename).toLowerCase().includes(lower) ||
        String(m.snippet).toLowerCase().includes(lower),
    );
  }, [memories, memoryQuery]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      reconnectionDelayMax: 2000,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => setSocketStatus('connected'));
    socket.on('disconnect', () => setSocketStatus('disconnected'));

    socket.on('telemetry', (data) => {
      setTelemetry((prev) => {
        if (paused) return prev;
        return clamp([...prev, data], TELEMETRY_LIMIT);
      });
    });

    socket.on('alert', (alert) => {
      setAlerts((prev) => clamp([...prev, alert], ALERT_LIMIT));
      if (alert.level === 'critical') {
        setCriticalHalt({ message: alert.message, feedback: alert.feedback });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [paused]);

  useEffect(() => {
    if (activeTab === 'telemetry' && telemetryRef.current && !paused) {
      const el = telemetryRef.current;
      if (el.scrollHeight - el.scrollTop < el.clientHeight + 300) {
        el.scrollTo({ top: el.scrollHeight });
      }
    }
  }, [telemetry, activeTab, paused]);

  useEffect(() => {
    if (activeTab === 'logs') {
      setLogsLoading(true);
      fetch(`${API_BASE}/api/logs`)
        .then((res) => res.json())
        .then((data) => {
          setLogs(data);
          setLogsLoading(false);
        })
        .catch(() => setLogsLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'memories') {
      setMemoriesLoading(true);
      fetch(`${API_BASE}/api/memories`)
        .then((res) => res.json())
        .then((data) => {
          setMemories(data.memories || []);
          setMemoriesLoading(false);
        })
        .catch(() => setMemoriesLoading(false));
    }
  }, [activeTab]);

  return (
    <div className="aos-shell min-h-screen pb-20 font-sans">
      {/* Header */}
      <header className="aos-topbar sticky top-0 z-40 flex-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></div>
                <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">
                  AOS Control Plane
                </p>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                System Oversight
              </h1>
              <p className="max-w-xl text-sm text-slate-600 mt-2 font-medium">
                Real-time request processing, historic states, and continual learning insights.
              </p>
            </div>

            <div className="flex flex-col gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                className="aos-theme-toggle"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                <span className="aos-theme-dot" />
                {theme === 'dark' ? 'Dark mode' : 'Light mode'}
              </button>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  label="Telemetry"
                  value={socketStatus === 'connected' ? 'ONLINE' : 'OFFLINE'}
                  accent={socketStatus === 'connected' ? 'text-emerald-600' : 'text-rose-600'}
                  isAlert={socketStatus !== 'connected'}
                />
                <StatCard label="Ollama Node" value="ONLINE" accent="text-emerald-600" />
                <StatCard label="RAM Ceiling" value="16GB" accent="text-slate-900" />
                <StatCard label="Auto-Launch" value="ARMED" accent="text-indigo-600" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8 flex-auto">
        {/* Navigation */}
        <nav className="aos-nav flex flex-wrap gap-2 p-1.5 rounded-2xl w-fit">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                  active
                    ? 'aos-tab-active shadow-sm border'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 flex-1'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {activeTab === 'telemetry' && (
          <div className="grid gap-8 xl:grid-cols-[380px_1fr] items-start">
            <div className="space-y-8 sticky top-36">
              <PanelShell title="System Health" subtitle="Current hardware allocation">
                <div className="space-y-6">
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                    <div className="flex justify-between text-sm font-medium mb-1">
                      <span className="text-slate-500">Node Status</span>
                    </div>
                    <div className="text-base font-semibold text-slate-900 flex items-center gap-2">
                      Ollama Process{' '}
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-sm border border-emerald-100">
                        ONLINE
                      </span>
                    </div>
                  </div>
                  <StatBar
                    label="Working Budget"
                    value={3000}
                    max={8192}
                    accentClass="bg-indigo-500"
                  />
                  <StatBar
                    label="Session Budget"
                    value={5000}
                    max={8192}
                    accentClass="bg-emerald-500"
                  />
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                        Max Context
                      </div>
                      <div className="text-lg font-bold text-slate-900">
                        8192<span className="text-sm font-normal text-slate-500 ml-1">tokens</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                        Browser Mode
                      </div>
                      <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        AUTO
                      </div>
                    </div>
                  </div>
                </div>
              </PanelShell>

              <PanelShell title="Agent Workflow" subtitle="Task orchestration state">
                <PipelineStepper activeAgent={activeAgent} socketStatus={socketStatus} />
              </PanelShell>
            </div>

            <PanelShell
              title="Log Stream"
              subtitle="Live requests & responses"
              className="flex flex-col h-[calc(100vh-14rem)] min-h-[600px]"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <span
                    className={`w-2 h-2 rounded-full ${paused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`}
                  ></span>
                  {paused ? 'Stream paused' : 'Stream live'}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTelemetry([])}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
                  >
                    Clear Stream
                  </button>
                  <button
                    onClick={() => setPaused(!paused)}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition shadow-sm ${
                      paused
                        ? 'bg-amber-100 text-amber-800 border focus:ring-2 border-amber-200'
                        : 'bg-white border text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {paused ? 'Resume Stream' : 'Pause Stream'}
                  </button>
                </div>
              </div>

              <div
                ref={telemetryRef}
                className="flex-1 overflow-y-auto bg-slate-50 p-5 rounded-2xl border border-slate-200/80 shadow-inner scroll-smooth"
              >
                {telemetry.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center h-full text-slate-400 space-y-4 min-h-[400px]">
                    <svg
                      className="w-12 h-12 text-slate-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    <p className="text-sm font-medium">Waiting for node events...</p>
                  </div>
                ) : (
                  telemetry.map((item, index) => (
                    <TelemetryEntry key={`${item.timestamp ?? index}-${index}`} item={item} />
                  ))
                )}
              </div>
            </PanelShell>
          </div>
        )}

        {/* Other Tabs Content */}
        {activeTab === 'errors' && (
          <PanelShell
            title="Alert Console"
            subtitle="System halt states & feedback"
            className="max-w-4xl"
          >
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
              <span className="text-sm font-semibold text-slate-700">
                {alerts.length} logged alerts
              </span>
              <span
                className={`px-3 py-1 text-xs font-bold rounded-lg ${criticalHalt ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}
              >
                {criticalHalt ? 'System Halted' : 'Operational'}
              </span>
            </div>
            {alerts.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-medium">
                No active threats or review faults detected.
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert, index) => (
                  <AlertCard
                    key={`${alert.timestamp ?? index}-${index}`}
                    item={alert}
                    index={index}
                  />
                ))}
              </div>
            )}
          </PanelShell>
        )}

        {activeTab === 'logs' && (
          <PanelShell title="System Logs" subtitle="Historical audit logs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {logs.file || 'No log source'}
                </p>
                <p className="text-sm text-slate-500">
                  {logsLoading ? 'Fetching log slice...' : `${logs.count} lines loaded`}
                </p>
              </div>
              <div className="relative">
                <svg
                  className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={logsQuery}
                  onChange={(e) => setLogsQuery(e.target.value)}
                  placeholder="Search logs..."
                  className="pl-9 pr-4 py-2 w-full sm:w-64 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
                />
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-soft">
              <div className="overflow-x-auto max-h-[800px] overflow-y-auto">
                <table className="min-w-full text-left border-collapse">
                  <thead className="bg-[#0b111e] sticky top-0 border-b border-slate-800/60 z-10">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-16">
                        No
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Message
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-[13px] font-mono text-slate-300">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td
                          colSpan="2"
                          className="px-4 py-8 text-center text-slate-500 font-sans text-sm"
                        >
                          No matches found.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((line, idx) => (
                        <tr
                          key={`${idx}-${String(line).slice(0, 10)}`}
                          className="hover:bg-slate-800/50 transition"
                        >
                          <td className="px-4 py-2.5 text-slate-500 opacity-80">{idx + 1}</td>
                          <td className="px-4 py-2.5 whitespace-pre-wrap break-all">
                            {String(line)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </PanelShell>
        )}

        {activeTab === 'memories' && (
          <PanelShell title="Machine Memory" subtitle="Insights & learned patterns">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 relative">
              <span className="text-sm font-semibold text-slate-700 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                {memoriesLoading
                  ? 'Indexing memories...'
                  : `${filteredMemories.length} rules loaded`}
              </span>
              <div className="relative">
                <input
                  type="text"
                  value={memoryQuery}
                  onChange={(e) => setMemoryQuery(e.target.value)}
                  placeholder="Filter lessons..."
                  className="pl-4 pr-4 py-2 w-full sm:w-64 bg-white border border-slate-300 shadow-sm rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredMemories.length === 0 ? (
                <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-medium">
                  Memory cluster empty. The agent uses{' '}
                  <span className="text-indigo-600 font-mono text-xs bg-indigo-50 px-1 py-0.5 rounded">
                    memories/repo/lessons
                  </span>
                  .
                </div>
              ) : (
                filteredMemories.map((lesson) => (
                  <article
                    key={lesson.filename}
                    className="bg-white rounded-2xl p-6 border border-slate-200 shadow-soft hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1.5">
                          Rule
                        </div>
                        <h3 className="font-semibold text-slate-900 break-words leading-snug">
                          {lesson.filename}
                        </h3>
                      </div>
                      <span className="shrink-0 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border border-emerald-100">
                        Active
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                      {lesson.snippet}
                    </p>
                  </article>
                ))
              )}
            </div>
          </PanelShell>
        )}
      </main>

      {/* Critical Error Modal */}
      {criticalHalt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto w-12 h-12 bg-rose-100 text-rose-600 flex items-center justify-center rounded-full mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-center text-slate-900">
              Critical Fault Detected
            </h2>
            <p className="text-center text-slate-600 mt-2 font-medium">{criticalHalt.message}</p>

            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                Diagnostic Feedback
              </div>
              <pre className="text-sm font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {criticalHalt.feedback}
              </pre>
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setCriticalHalt(null)}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-sm transition"
              >
                Acknowledge & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
