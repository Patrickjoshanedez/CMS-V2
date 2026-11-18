# Layout Primitives & Semantic Tokens Reference

Use `@/components/common` in every page under `client/src/pages/` so **Student**, **Instructor**, and **Faculty** workspaces share identical hierarchy and spacing inside `DashboardLayout` (`max-w-7xl`).

## 1. Standard Page Skeleton

```jsx
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { PageHeader, MetricGrid, StatCard, SectionHeader, FilterToolbar } from '@/components/common';

export default function ExamplePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Role or Module Scope"
          icon={SomeLucideIcon}
          title="Page Title"
          description="Concise 1-line workflow explanation."
          meta={<Badge variant="outline">Optional Context</Badge>}
          actions={<Button size="sm">Primary Action</Button>}
        />

        <MetricGrid cols={4}>
          <StatCard label="Active" value={12} tone="primary" icon={Inbox} />
          <StatCard label="Approved" value={8} tone="success" icon={CheckCircle2} />
          <StatCard label="Pending" value={4} tone="warning" icon={Clock} />
          <StatCard label="Flagged" value={0} tone="destructive" icon={AlertTriangle} />
        </MetricGrid>

        <FilterToolbar top={/* Search + Select filters */} bottom={/* Optional tabs */} />

        <section className="space-y-4">
          <SectionHeader title="Queue Items" description="Updated from live workspace state." />
          {/* Cards or responsive table */}
        </section>
      </div>
    </DashboardLayout>
  );
}
```

## 2. Hard Layout & Token Rules

- **Width Consistency**: Inherit `DashboardLayout`'s `max-w-7xl` frame. Do not wrap pages in `max-w-5xl`, `max-w-6xl`, `max-w-screen-2xl`, or `max-w-[1600px]`. Narrow cards (`max-w-3xl`) inside the page body (e.g., `CertificatePage`) must still place `<PageHeader />` flush across the full `max-w-7xl` width.
- **Single Heading Hierarchy**:
  - One `<h1>` per page rendered by `<PageHeader />`.
  - Section headers, summary bars (`StudentTeamDetail.jsx`), print headers (`ReportsPage.jsx`), and preview sheet titles (`PlagiarismReportPage.jsx`) use `<h2>` or `<h3>`.
  - Never truncate `<h1>` or breadcrumb current-page titles with `text-overflow: ellipsis`.
- **Theme-Safe Surfaces**: Use semantic CSS variable utilities (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border-border`). White institutional manuscript sheets (`.paper-ui`, `.secretary-minutes-page`, `.adm-document-page`) remain isolated from dark-mode inversion.
