import { useState } from 'react';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  BarChart3,
  LineChart as LineIcon,
  PieChart as PieIcon,
  Table as TableIcon,
  Download,
  Maximize2,
  Minimize2,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export const CHART_PALETTE = [
  'hsl(var(--primary))',
  '#0284c7', // Sky 600
  '#10b981', // Emerald 500
  '#f59e0b', // Amber 500
  '#8b5cf6', // Violet 500
  '#ec4899', // Pink 500
  '#06b6d4', // Cyan 500
  '#f97316', // Orange 500
  '#64748b', // Slate 500
];

/**
 * DynamicChartWidget — Modular Visualization Studio with Interactive View Switching.
 *
 * Supports fluid runtime switching between Bar, Line, Pie, Radar, and Tabular representations
 * for any capstone analytical dataset.
 */
export default function DynamicChartWidget({
  title,
  subtitle,
  data = [],
  xKey = 'name',
  dataKeys = [{ key: 'value', label: 'Value', color: 'hsl(var(--primary))' }],
  availableViews = ['bar', 'line', 'pie', 'table'],
  defaultView = 'bar',
  height = 300,
  radarCategories = [],
  onExportCsv,
}) {
  const [currentView, setCurrentView] = useState(defaultView);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const safeData = Array.isArray(data) ? data : [];
  const hasData = safeData.length > 0;

  const viewIcons = {
    bar: BarChart3,
    line: LineIcon,
    pie: PieIcon,
    radar: BarChart3,
    table: TableIcon,
  };

  const handleDownloadCSV = () => {
    if (onExportCsv) {
      onExportCsv();
      return;
    }
    if (!hasData) return;
    const keys = Object.keys(safeData[0]);
    const lines = [
      keys.join(','),
      ...safeData.map((row) =>
        keys.map((k) => `"${String(row[k] ?? '').replace(/"/g, '""')}"`).join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-data.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card
      data-testid={`chart-widget-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className={`chart-card dynamic-chart-widget-card break-inside-avoid border border-border/80 bg-card shadow-xs transition-all flex flex-col print:bg-white print:border-slate-300 print:shadow-none ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl bg-card' : ''
      }`}
    >
      <CardHeader className="p-4 pb-3 border-b border-border/60 bg-muted/15 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:bg-white print:border-slate-200 print:p-2.5">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-bold text-foreground tracking-tight print:text-[#111827]">
              {title}
            </CardTitle>
            {safeData.length > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] font-mono py-0 px-1.5 bg-background print:bg-slate-100 print:text-[#111827] print:border-slate-300"
              >
                {safeData.length} {safeData.length === 1 ? 'record' : 'records'}
              </Badge>
            )}
          </div>
          {subtitle && (
            <CardDescription className="text-xs text-muted-foreground mt-0.5 print:text-slate-600">
              {subtitle}
            </CardDescription>
          )}
        </div>

        {/* View Mode Switcher Toolbar (Hidden on physical print) */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto print:hidden">
          <div
            role="group"
            aria-label={`${title} view modes`}
            className="flex items-center p-0.5 bg-background border border-border/70 rounded-lg shadow-2xs"
          >
            {availableViews.map((view) => {
              const Icon = viewIcons[view] || BarChart3;
              const isActive = currentView === view;
              return (
                <button
                  key={view}
                  type="button"
                  onClick={() => setCurrentView(view)}
                  aria-pressed={isActive}
                  aria-label={`Switch to ${view} view`}
                  title={`Switch to ${view} view`}
                  className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-2.5 sm:p-1.5 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center justify-center ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>

          {/* Export & Maximize Action Buttons */}
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 sm:h-7 sm:w-7 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-lg text-muted-foreground hover:text-foreground shadow-2xs cursor-pointer"
            onClick={handleDownloadCSV}
            aria-label="Export Widget Data as CSV"
            title="Export Widget Data as CSV"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 sm:h-7 sm:w-7 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-lg text-muted-foreground hover:text-foreground shadow-2xs cursor-pointer"
            onClick={() => setIsFullscreen(!isFullscreen)}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Maximize Chart'}
            title={isFullscreen ? 'Exit Fullscreen' : 'Maximize Chart'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex-1 min-h-[280px]">
        {!hasData ? (
          <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center text-muted-foreground space-y-2">
            <Info className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs font-semibold text-foreground">No data points available</p>
            <p className="text-[11px] text-muted-foreground max-w-xs">
              No aggregate records found for the current filter parameters.
            </p>
          </div>
        ) : (
          <div
            className="chart-container print:h-[7.5cm] print:min-h-[7.5cm] print:max-h-[7.5cm] print:w-full"
            style={{ height: isFullscreen ? 'calc(100vh - 160px)' : `${height}px` }}
          >
            {/* 1. Bar Chart View */}
            {currentView === 'bar' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={safeData} margin={{ top: 12, right: 16, left: 0, bottom: 36 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey={xKey}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                    height={65}
                  />
                  <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  {dataKeys.length > 1 && (
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                    />
                  )}
                  {dataKeys.map((dk, idx) => (
                    <Bar
                      key={dk.key}
                      dataKey={dk.key}
                      name={dk.label || dk.key}
                      fill={dk.color || CHART_PALETTE[idx % CHART_PALETTE.length]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* 2. Line / Area Chart View */}
            {currentView === 'line' && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={safeData} margin={{ top: 12, right: 16, left: 0, bottom: 36 }}>
                  <defs>
                    {dataKeys.map((dk, idx) => {
                      const color = dk.color || CHART_PALETTE[idx % CHART_PALETTE.length];
                      return (
                        <linearGradient
                          key={dk.key}
                          id={`grad-${dk.key}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey={xKey}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                    height={65}
                  />
                  <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  {dataKeys.length > 1 && (
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                    />
                  )}
                  {dataKeys.map((dk, idx) => {
                    const color = dk.color || CHART_PALETTE[idx % CHART_PALETTE.length];
                    return (
                      <Area
                        key={dk.key}
                        type="monotone"
                        dataKey={dk.key}
                        name={dk.label || dk.key}
                        stroke={color}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill={`url(#grad-${dk.key})`}
                      />
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>
            )}

            {/* 3. Pie / Donut Chart View */}
            {currentView === 'pie' && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 8, right: 32, left: 32, bottom: 8 }}>
                  <Pie
                    data={safeData}
                    dataKey={dataKeys[0]?.key || 'value'}
                    nameKey={xKey}
                    cx="50%"
                    cy="46%"
                    innerRadius={isFullscreen ? 75 : 46}
                    outerRadius={isFullscreen ? 120 : 70}
                    paddingAngle={3}
                    label={(props) => {
                      const { cx, cy, midAngle, outerRadius: oRadius, percent, name } = props;
                      if (!percent || percent < 0.03) return null;
                      const displayName = name ?? props[xKey] ?? 'Item';
                      const RADIAN = Math.PI / 180;
                      const radius = (oRadius || 70) + 12;
                      const rawX = cx + radius * Math.cos(-midAngle * RADIAN);
                      const rawY = cy + radius * Math.sin(-midAngle * RADIAN);
                      const isLeft = rawX < cx;
                      const pctStr = `${(percent * 100).toFixed(0)}%`;
                      const truncatedName =
                        displayName.length > 20 ? `${displayName.slice(0, 18)}…` : displayName;
                      const text = `${truncatedName} (${pctStr})`;
                      const approxWidth = text.length * 5.6;

                      let finalX = rawX;
                      let textAnchor = isLeft ? 'end' : 'start';

                      if (isLeft) {
                        if (rawX - approxWidth < 8) {
                          if (rawX < approxWidth + 8) {
                            finalX = 8;
                            textAnchor = 'start';
                          } else {
                            finalX = approxWidth + 8;
                          }
                        }
                      } else {
                        const rightBound = cx * 2 - 8;
                        if (rawX + approxWidth > rightBound) {
                          if (rawX > rightBound - approxWidth) {
                            finalX = rightBound;
                            textAnchor = 'end';
                          }
                        }
                      }

                      return (
                        <text
                          x={finalX}
                          y={rawY}
                          textAnchor={textAnchor}
                          dominantBaseline="central"
                          className="fill-foreground text-[10px] font-medium select-none pointer-events-none"
                        >
                          <title>{displayName}</title>
                          {text}
                        </text>
                      );
                    }}
                    labelLine={false}
                  >
                    {safeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* 4. Radar Chart View */}
            {currentView === 'radar' && (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={safeData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey={xKey} tick={{ fontSize: 10, fill: 'currentColor' }} />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, (dataMax) => Math.max(dataMax || 0, 5)]}
                  />
                  {dataKeys.map((dk, idx) => (
                    <Radar
                      key={dk.key}
                      name={dk.label || dk.key}
                      dataKey={dk.key}
                      stroke={dk.color || CHART_PALETTE[idx % CHART_PALETTE.length]}
                      fill={dk.color || CHART_PALETTE[idx % CHART_PALETTE.length]}
                      fillOpacity={0.4}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}

            {/* 5. Tabular Matrix View */}
            {currentView === 'table' && (
              <div className="h-full overflow-auto rounded-lg border border-border/70 bg-background/50">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground sticky top-0">
                      <th className="py-2.5 px-3 uppercase tracking-wider">{xKey}</th>
                      {dataKeys.map((dk) => (
                        <th
                          key={dk.key}
                          className="py-2.5 px-3 text-right uppercase tracking-wider"
                        >
                          {dk.label || dk.key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono">
                    {safeData.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 font-sans font-medium text-foreground">
                          {row[xKey]}
                        </td>
                        {dataKeys.map((dk) => (
                          <td key={dk.key} className="py-2 px-3 text-right text-foreground/90">
                            {row[dk.key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

DynamicChartWidget.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  data: PropTypes.array,
  xKey: PropTypes.string,
  dataKeys: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string,
      color: PropTypes.string,
    }),
  ),
  availableViews: PropTypes.arrayOf(PropTypes.string),
  defaultView: PropTypes.string,
  height: PropTypes.number,
  radarCategories: PropTypes.array,
  onExportCsv: PropTypes.func,
};
