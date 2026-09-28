import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import DynamicChartWidget from './DynamicChartWidget';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div data-testid="responsive-container" style={{ width: 500, height: 300 }}>
        {children}
      </div>
    ),
  };
});

describe('DynamicChartWidget', () => {
  let container;
  let root;

  const mockData = [
    { name: 'Machine Learning', count: 12 },
    { name: 'Web Development', count: 8 },
  ];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
  });

  it('renders title and formats grammatical concordance for record counts', () => {
    // 2 records -> plural
    act(() => {
      root.render(
        <DynamicChartWidget
          title="Domain Distribution"
          subtitle="Cohort Breakdown"
          data={mockData}
          xKey="name"
          dataKeys={[{ key: 'count', label: 'Projects' }]}
        />,
      );
    });

    expect(container.textContent).toContain('Domain Distribution');
    expect(container.textContent).toContain('Cohort Breakdown');
    expect(container.textContent).toContain('2 records');

    // 1 record -> singular
    act(() => {
      root.render(
        <DynamicChartWidget
          title="Domain Distribution"
          data={[mockData[0]]}
          xKey="name"
          dataKeys={[{ key: 'count', label: 'Projects' }]}
        />,
      );
    });
    expect(container.textContent).toContain('1 record');
    expect(container.textContent).not.toContain('1 records');

    // 0 records -> no badge, empty state shown
    act(() => {
      root.render(
        <DynamicChartWidget
          title="Domain Distribution"
          data={[]}
          xKey="name"
          dataKeys={[{ key: 'count', label: 'Projects' }]}
        />,
      );
    });
    expect(container.textContent).toContain('No aggregate records found');
  });

  it('provides ARIA view switcher states with role="group" and aria-pressed attributes', () => {
    act(() => {
      root.render(
        <DynamicChartWidget
          title="Domain Distribution"
          data={mockData}
          xKey="name"
          dataKeys={[{ key: 'count', label: 'Projects' }]}
          availableViews={['bar', 'line', 'pie', 'table']}
          defaultView="bar"
        />,
      );
    });

    const switcherGroup = container.querySelector('[role="group"]');
    expect(switcherGroup).toBeTruthy();
    expect(switcherGroup.getAttribute('aria-label')).toBe('Domain Distribution view modes');

    const barBtn = container.querySelector('button[aria-label="Switch to bar view"]');
    const lineBtn = container.querySelector('button[aria-label="Switch to line view"]');
    const pieBtn = container.querySelector('button[aria-label="Switch to pie view"]');
    const tableBtn = container.querySelector('button[aria-label="Switch to table view"]');

    expect(barBtn).toBeTruthy();
    expect(lineBtn).toBeTruthy();
    expect(pieBtn).toBeTruthy();
    expect(tableBtn).toBeTruthy();

    // Default is bar -> bar has aria-pressed="true", others "false"
    expect(barBtn.getAttribute('aria-pressed')).toBe('true');
    expect(lineBtn.getAttribute('aria-pressed')).toBe('false');

    // Switch to table view
    act(() => {
      tableBtn.click();
    });

    expect(tableBtn.getAttribute('aria-pressed')).toBe('true');
    expect(barBtn.getAttribute('aria-pressed')).toBe('false');

    // Table view renders tabular matrix
    const table = container.querySelector('table');
    expect(table).toBeTruthy();
    expect(table.textContent).toContain('Machine Learning');
    expect(table.textContent).toContain('12');
    expect(table.textContent).toContain('Web Development');
    expect(table.textContent).toContain('8');
  });

  it('enforces touch target scaling on toolbar buttons', () => {
    act(() => {
      root.render(
        <DynamicChartWidget
          title="Domain Distribution"
          data={mockData}
          xKey="name"
          dataKeys={[{ key: 'count', label: 'Projects' }]}
        />,
      );
    });

    const barBtn = container.querySelector('button[aria-label="Switch to bar view"]');
    expect(barBtn.className).toContain('min-h-[44px]');
    expect(barBtn.className).toContain('min-w-[44px]');

    const csvBtn = container.querySelector('button[aria-label="Export Widget Data as CSV"]');
    expect(csvBtn.className).toContain('min-h-[44px]');
    expect(csvBtn.className).toContain('min-w-[44px]');
  });

  it('handles custom onExportCsv and fullscreen toggle', () => {
    const handleExport = vi.fn();
    act(() => {
      root.render(
        <DynamicChartWidget
          title="Domain Distribution"
          data={mockData}
          xKey="name"
          dataKeys={[{ key: 'count', label: 'Projects' }]}
          onExportCsv={handleExport}
        />,
      );
    });

    const csvBtn = container.querySelector('button[aria-label="Export Widget Data as CSV"]');
    act(() => {
      csvBtn.click();
    });
    expect(handleExport).toHaveBeenCalledTimes(1);

    const fsBtn = container.querySelector('button[aria-label="Maximize Chart"]');
    expect(fsBtn).toBeTruthy();
    act(() => {
      fsBtn.click();
    });
    expect(fsBtn.getAttribute('aria-label')).toBe('Exit Fullscreen');
  });

  it('renders radar chart and pie chart with safe label handling', () => {
    act(() => {
      root.render(
        <DynamicChartWidget
          title="Domain Distribution"
          data={[
            { name: 'Very Long Research Topic Name That Exceeds Bounds', count: 15 },
            { name: 'Short', count: 5 },
          ]}
          xKey="name"
          dataKeys={[{ key: 'count', label: 'Projects' }]}
          availableViews={['pie', 'radar']}
          defaultView="pie"
        />,
      );
    });

    // Pie chart is rendered
    expect(container.querySelector('.dynamic-chart-widget-card')).toBeTruthy();

    // Switch to radar view
    const radarBtn = container.querySelector('button[aria-label="Switch to radar view"]');
    expect(radarBtn).toBeTruthy();
    act(() => {
      radarBtn.click();
    });
    expect(radarBtn.getAttribute('aria-pressed')).toBe('true');
  });
});
