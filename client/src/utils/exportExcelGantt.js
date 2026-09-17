/**
 * exportExcelGantt.js
 *
 * Generates and downloads an authentic Microsoft Excel Spreadsheet (.xls)
 * replicating the strict BukSU academic capstone Gantt Chart specification:
 * - 5-Row Bordered Metadata Header Table
 * - 7-Column Task Data Grid with Section Headers
 * - 4-Tier Nested Timeline Matrix (Phases -> Weeks -> Days M-F -> Sub-labels)
 * - Category-based cell fills (Yellow, Green, Orange, Blue)
 * - 4-Column Academic Signatory Block
 */

export function normalizeProgress(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') {
    if (isNaN(val)) return 0;
    return val > 1 ? val / 100 : Math.max(0, val);
  }
  const str = String(val).replace('%', '').trim();
  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  return num > 1 ? num / 100 : Math.max(0, num);
}

function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build spreadsheet XML string conforming to authentic BukSU academic specification.
 */
export function buildExcelXml({
  projectTitle = 'Pending',
  students = 'Pending',
  adviser = 'Pending',
  instructor = 'Pending',
  sectionCode = 'Pending',
  accomplishment = null,
  asOfDate = null,
  tasks = [],
  sections = [],
  proponentList = [],
}) {
  const TOTAL_DAY_COLS = 60; // 12 weeks * 5 days

  // Compute overall accomplishment from tasks if not provided
  const validTasks = tasks.filter((t) => t && (t.id || t.title));
  const calcAccomplishment = () => {
    if (validTasks.length === 0) return 'Pending';
    const total = validTasks.reduce((sum, t) => sum + normalizeProgress(t.progress), 0);
    return `${((total / validTasks.length) * 100).toFixed(2)}%`;
  };
  const finalAccomplishment = accomplishment || calcAccomplishment();
  const finalAsOfDate =
    asOfDate || (validTasks.length > 0 ? new Date().toLocaleDateString('en-GB') : 'Pending');

  // Resolve proponent members array for dynamic signatures
  const resolvedProponents =
    Array.isArray(proponentList) && proponentList.length > 0
      ? proponentList
      : typeof students === 'string'
        ? students
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : ['Researcher'];

  const studentHeaderKey = resolvedProponents.length <= 1 ? 'NAME OF STUDENT' : 'NAME OF STUDENTS';

  // Ensure all sections from tasks are represented
  const resolvedSections =
    Array.isArray(sections) && sections.length > 0
      ? sections
      : Array.from(new Set(tasks.map((t) => t.section).filter(Boolean)));

  // Generate XML Styles
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>CAPSTONE PROJECT AND RESEARCH 2 GANTT CHART</Title>
  <Author>BukSU IT Department</Author>
 </DocumentProperties>
 <Styles>
  <!-- Default -->
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>

  <!-- Title Style -->
  <Style ss:ID="MainTitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#1F2937"/>
  </Style>

  <!-- Header Table Key -->
  <Style ss:ID="HeaderKey">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#111827"/>
   <Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/>
  </Style>

  <!-- Header Table Value -->
  <Style ss:ID="HeaderVal">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#111827"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>

  <!-- Task Data Grid Column Headers -->
  <Style ss:ID="ColHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9CA3AF"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9CA3AF"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9CA3AF"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9CA3AF"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#374151"/>
   <Interior ss:Color="#E5E7EB" ss:Pattern="Solid"/>
  </Style>

  <!-- Section Row Header -->
  <Style ss:ID="SectionHeader">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#4B5563"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#4B5563"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#111827"/>
   <Interior ss:Color="#D1D5DB" ss:Pattern="Solid"/>
  </Style>

  <!-- Default Task Data Cells -->
  <Style ss:ID="CellLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#111827"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>

  <Style ss:ID="CellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#111827"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>

  <!-- Category-based Row Cell Styles (Left & Center) -->
  <!-- Yellow -->
  <Style ss:ID="CellLeft_yellow">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#000000"/>
   <Interior ss:Color="#FFFF00" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CellCenter_yellow">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#000000"/>
   <Interior ss:Color="#FFFF00" ss:Pattern="Solid"/>
  </Style>

  <!-- Green -->
  <Style ss:ID="CellLeft_green">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#000000"/>
   <Interior ss:Color="#00FF00" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CellCenter_green">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#000000"/>
   <Interior ss:Color="#00FF00" ss:Pattern="Solid"/>
  </Style>

  <!-- Orange -->
  <Style ss:ID="CellLeft_orange">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#000000"/>
   <Interior ss:Color="#FF9900" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CellCenter_orange">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#000000"/>
   <Interior ss:Color="#FF9900" ss:Pattern="Solid"/>
  </Style>

  <!-- Blue -->
  <Style ss:ID="CellLeft_blue">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#000000"/>
   <Interior ss:Color="#99CCFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CellCenter_blue">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#000000"/>
   <Interior ss:Color="#99CCFF" ss:Pattern="Solid"/>
  </Style>

  <!-- Purple -->
  <Style ss:ID="CellLeft_purple">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#000000"/>
   <Interior ss:Color="#D8B4FE" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CellCenter_purple">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#000000"/>
   <Interior ss:Color="#D8B4FE" ss:Pattern="Solid"/>
  </Style>

  <!-- Rose -->
  <Style ss:ID="CellLeft_rose">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#000000"/>
   <Interior ss:Color="#FDA4AF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CellCenter_rose">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#000000"/>
   <Interior ss:Color="#FDA4AF" ss:Pattern="Solid"/>
  </Style>

  <!-- Teal -->
  <Style ss:ID="CellLeft_teal">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#000000"/>
   <Interior ss:Color="#5EEAD4" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CellCenter_teal">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#000000"/>
   <Interior ss:Color="#5EEAD4" ss:Pattern="Solid"/>
  </Style>

  <!-- Indigo -->
  <Style ss:ID="CellLeft_indigo">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#000000"/>
   <Interior ss:Color="#A5B4FC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CellCenter_indigo">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#000000"/>
   <Interior ss:Color="#A5B4FC" ss:Pattern="Solid"/>
  </Style>

  <!-- Timeline Phase Tier Styles -->
  <Style ss:ID="Phase1">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/></Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Phase2">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/></Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#064E3B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Phase3">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/></Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E3A8A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Phase4">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/></Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#701A75" ss:Pattern="Solid"/>
  </Style>

  <!-- Week Tier Styles -->
  <Style ss:ID="WeekHeader1">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#475569"/></Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#334155" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="WeekHeader2">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#047857"/></Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#065F46" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="WeekHeader3">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1D4ED8"/></Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E40AF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="WeekHeader4">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#86198F"/></Borders>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#86198F" ss:Pattern="Solid"/>
  </Style>

  <!-- Day Header (M T W R F) -->
  <Style ss:ID="DayHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="8" ss:Bold="1" ss:Color="#334155"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
  </Style>

  <!-- Sub-label Header -->
  <Style ss:ID="SubLabelHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="7" ss:Italic="1" ss:Color="#047857"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>

  <!-- Empty Timeline Grid Cell -->
  <Style ss:ID="DayEmpty">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F3F4F6"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F3F4F6"/>
   </Borders>
  </Style>

  <!-- Colored Gantt Bars -->
  <!-- Yellow: Planning / Architecture -->
  <Style ss:ID="BarYellowDone"><Interior ss:Color="#FACC15" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CA8A04"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CA8A04"/></Borders></Style>
  <Style ss:ID="BarYellowPlan"><Interior ss:Color="#FEF9C3" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EAB308"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EAB308"/></Borders></Style>

  <!-- Green: Infrastructure / Backend -->
  <Style ss:ID="BarGreenDone"><Interior ss:Color="#22C55E" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#16A34A"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#16A34A"/></Borders></Style>
  <Style ss:ID="BarGreenPlan"><Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#22C55E"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#22C55E"/></Borders></Style>

  <!-- Orange: UI / Testing / Deployment -->
  <Style ss:ID="BarOrangeDone"><Interior ss:Color="#F97316" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EA580C"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EA580C"/></Borders></Style>
  <Style ss:ID="BarOrangePlan"><Interior ss:Color="#FFEDD5" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F97316"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F97316"/></Borders></Style>

  <!-- Blue: UI/Security -->
  <Style ss:ID="BarBlueDone"><Interior ss:Color="#3B82F6" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#2563EB"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#2563EB"/></Borders></Style>
  <Style ss:ID="BarBluePlan"><Interior ss:Color="#DBEAFE" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3B82F6"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3B82F6"/></Borders></Style>

  <!-- Purple: Documentation -->
  <Style ss:ID="BarPurpleDone"><Interior ss:Color="#A855F7" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9333EA"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9333EA"/></Borders></Style>
  <Style ss:ID="BarPurplePlan"><Interior ss:Color="#F3E8FF" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A855F7"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A855F7"/></Borders></Style>

  <!-- Rose: Critical Milestones -->
  <Style ss:ID="BarRoseDone"><Interior ss:Color="#F43F5E" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E11D48"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E11D48"/></Borders></Style>
  <Style ss:ID="BarRosePlan"><Interior ss:Color="#FFE4E6" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F43F5E"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F43F5E"/></Borders></Style>

  <!-- Teal: Cloud & DevOps -->
  <Style ss:ID="BarTealDone"><Interior ss:Color="#14B8A6" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0D9488"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0D9488"/></Borders></Style>
  <Style ss:ID="BarTealPlan"><Interior ss:Color="#CCFBF1" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#14B8A6"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#14B8A6"/></Borders></Style>

  <!-- Indigo: Architecture -->
  <Style ss:ID="BarIndigoDone"><Interior ss:Color="#6366F1" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#4F46E5"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#4F46E5"/></Borders></Style>
  <Style ss:ID="BarIndigoPlan"><Interior ss:Color="#E0E7FF" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#6366F1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#6366F1"/></Borders></Style>

  <!-- Signatures Block -->
  <Style ss:ID="SigName">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#111827"/>
  </Style>
  <Style ss:ID="SigRole">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8" ss:Italic="1" ss:Color="#4B5563"/>
  </Style>
 </Styles>

 <Worksheet ss:Name="Gantt Chart">
  <Table ss:DefaultRowHeight="18">
   <!-- Left Task Data Columns: EXACTLY 7 Columns matching Institutional Template -->
   <Column ss:Index="1" ss:Width="75"/>  <!-- TASK ID -->
   <Column ss:Index="2" ss:Width="260"/> <!-- TASK TITLE -->
   <Column ss:Index="3" ss:Width="140"/> <!-- TASK OWNER -->
   <Column ss:Index="4" ss:Width="75"/>  <!-- START DATE -->
   <Column ss:Index="5" ss:Width="75"/>  <!-- DUE DATE -->
   <Column ss:Index="6" ss:Width="65"/>  <!-- DURATION IN DAYS -->
   <Column ss:Index="7" ss:Width="80"/>  <!-- % OF TASK COMPLETE -->

   <!-- 60 Timeline Matrix Columns (18pt each) -->
   ${Array.from({ length: 60 }, (_, i) => `<Column ss:Index="${8 + i}" ss:Width="18"/>`).join('\n   ')}

   <!-- MAIN TITLE ROW -->
   <Row ss:Height="26">
    <Cell ss:Index="1" ss:MergeAcross="66" ss:StyleID="MainTitle">
     <Data ss:Type="String">CAPSTONE PROJECT AND RESEARCH 2 GANTT CHART</Data>
    </Cell>
   </Row>

   <!-- HEADER ROW 1: CAPSTONE PROJECT TITLE -->
   <Row ss:Height="20">
    <Cell ss:Index="1" ss:StyleID="HeaderKey"><Data ss:Type="String">CAPSTONE PROJECT TITLE</Data></Cell>
    <Cell ss:Index="2" ss:MergeAcross="5" ss:StyleID="HeaderVal"><Data ss:Type="String">${escapeXml(projectTitle)}</Data></Cell>
   </Row>

   <!-- HEADER ROW 2: NAME OF STUDENT(S) -->
   <Row ss:Height="20">
    <Cell ss:Index="1" ss:StyleID="HeaderKey"><Data ss:Type="String">${escapeXml(studentHeaderKey)}</Data></Cell>
    <Cell ss:Index="2" ss:MergeAcross="5" ss:StyleID="HeaderVal"><Data ss:Type="String">${escapeXml(students)}</Data></Cell>
   </Row>

   <!-- HEADER ROW 3: NAME OF ADVISER -->
   <Row ss:Height="20">
    <Cell ss:Index="1" ss:StyleID="HeaderKey"><Data ss:Type="String">NAME OF ADVISER</Data></Cell>
    <Cell ss:Index="2" ss:MergeAcross="5" ss:StyleID="HeaderVal"><Data ss:Type="String">${escapeXml(adviser)}</Data></Cell>
   </Row>

   <!-- HEADER ROW 4: SECTION CODE / SCHEDULE -->
   <Row ss:Height="20">
    <Cell ss:Index="1" ss:StyleID="HeaderKey"><Data ss:Type="String">SECTION CODE / SCHEDULE</Data></Cell>
    <Cell ss:Index="2" ss:MergeAcross="5" ss:StyleID="HeaderVal"><Data ss:Type="String">${escapeXml(sectionCode)}</Data></Cell>
   </Row>

   <!-- HEADER ROW 5: OVERALL ACCOMPLISHMENT -->
   <Row ss:Height="20">
    <Cell ss:Index="1" ss:StyleID="HeaderKey"><Data ss:Type="String">OVERALL ACCOMPLISHMENT</Data></Cell>
    <Cell ss:Index="2" ss:StyleID="HeaderVal"><Data ss:Type="String">${escapeXml(finalAccomplishment)}</Data></Cell>
    <Cell ss:Index="3" ss:StyleID="HeaderKey"><Data ss:Type="String">as of</Data></Cell>
    <Cell ss:Index="4" ss:MergeAcross="3" ss:StyleID="HeaderVal"><Data ss:Type="String">${escapeXml(finalAsOfDate)}</Data></Cell>
   </Row>

   <!-- EMPTY SPACER ROW -->
   <Row ss:Height="10"></Row>

   <!-- TIMELINE TIER 1: PHASES -->
   <Row ss:Height="22">
    <Cell ss:Index="1" ss:MergeDown="3" ss:StyleID="ColHeader"><Data ss:Type="String">TASK ID</Data></Cell>
    <Cell ss:Index="2" ss:MergeDown="3" ss:StyleID="ColHeader"><Data ss:Type="String">TASK TITLE</Data></Cell>
    <Cell ss:Index="3" ss:MergeDown="3" ss:StyleID="ColHeader"><Data ss:Type="String">TASK OWNER</Data></Cell>
    <Cell ss:Index="4" ss:MergeDown="3" ss:StyleID="ColHeader"><Data ss:Type="String">START DATE</Data></Cell>
    <Cell ss:Index="5" ss:MergeDown="3" ss:StyleID="ColHeader"><Data ss:Type="String">DUE DATE</Data></Cell>
    <Cell ss:Index="6" ss:MergeDown="3" ss:StyleID="ColHeader"><Data ss:Type="String">DURATION IN DAYS</Data></Cell>
    <Cell ss:Index="7" ss:MergeDown="3" ss:StyleID="ColHeader"><Data ss:Type="String">% OF TASK COMPLETE</Data></Cell>

    <!-- 4 Phases spanning 15 day columns each -->
    <Cell ss:Index="8" ss:MergeAcross="14" ss:StyleID="Phase1"><Data ss:Type="String">PHASE ONE</Data></Cell>
    <Cell ss:Index="23" ss:MergeAcross="14" ss:StyleID="Phase2"><Data ss:Type="String">PHASE TWO</Data></Cell>
    <Cell ss:Index="38" ss:MergeAcross="14" ss:StyleID="Phase3"><Data ss:Type="String">PHASE THREE</Data></Cell>
    <Cell ss:Index="53" ss:MergeAcross="14" ss:StyleID="Phase4"><Data ss:Type="String">PHASE FOUR</Data></Cell>
   </Row>

   <!-- TIMELINE TIER 2: WEEKS 1 TO 12 -->
   <Row ss:Height="18">
    <!-- Weeks 1-3 under Phase 1 -->
    <Cell ss:Index="8" ss:MergeAcross="4" ss:StyleID="WeekHeader1"><Data ss:Type="String">WEEK 1</Data></Cell>
    <Cell ss:Index="13" ss:MergeAcross="4" ss:StyleID="WeekHeader1"><Data ss:Type="String">WEEK 2</Data></Cell>
    <Cell ss:Index="18" ss:MergeAcross="4" ss:StyleID="WeekHeader1"><Data ss:Type="String">WEEK 3</Data></Cell>

    <!-- Weeks 4-6 under Phase 2 -->
    <Cell ss:Index="23" ss:MergeAcross="4" ss:StyleID="WeekHeader2"><Data ss:Type="String">WEEK 4</Data></Cell>
    <Cell ss:Index="28" ss:MergeAcross="4" ss:StyleID="WeekHeader2"><Data ss:Type="String">WEEK 5</Data></Cell>
    <Cell ss:Index="33" ss:MergeAcross="4" ss:StyleID="WeekHeader2"><Data ss:Type="String">WEEK 6</Data></Cell>

    <!-- Weeks 7-9 under Phase 3 -->
    <Cell ss:Index="38" ss:MergeAcross="4" ss:StyleID="WeekHeader3"><Data ss:Type="String">WEEK 7</Data></Cell>
    <Cell ss:Index="43" ss:MergeAcross="4" ss:StyleID="WeekHeader3"><Data ss:Type="String">WEEK 8</Data></Cell>
    <Cell ss:Index="48" ss:MergeAcross="4" ss:StyleID="WeekHeader3"><Data ss:Type="String">WEEK 9</Data></Cell>

    <!-- Weeks 10-12 under Phase 4 -->
    <Cell ss:Index="53" ss:MergeAcross="4" ss:StyleID="WeekHeader4"><Data ss:Type="String">WEEK 10</Data></Cell>
    <Cell ss:Index="58" ss:MergeAcross="4" ss:StyleID="WeekHeader4"><Data ss:Type="String">WEEK 11</Data></Cell>
    <Cell ss:Index="63" ss:MergeAcross="4" ss:StyleID="WeekHeader4"><Data ss:Type="String">WEEK 12</Data></Cell>
   </Row>

   <!-- TIMELINE TIER 3: DAYS M T W R F -->
   <Row ss:Height="16">
    ${Array.from({ length: 12 }, (_, w) =>
      ['M', 'T', 'W', 'R', 'F']
        .map((d, di) => {
          const colIdx = 8 + w * 5 + di;
          return `<Cell ss:Index="${colIdx}" ss:StyleID="DayHeader"><Data ss:Type="String">${d}</Data></Cell>`;
        })
        .join('\n    '),
    ).join('\n    ')}
   </Row>

   <!-- TIMELINE TIER 4: SUB-LABELS -->
   <Row ss:Height="16">
    <Cell ss:Index="8" ss:MergeAcross="4" ss:StyleID="SubLabelHeader"><Data ss:Type="String">Planning</Data></Cell>
    <Cell ss:Index="13" ss:MergeAcross="4" ss:StyleID="SubLabelHeader"><Data ss:Type="String">Data collection</Data></Cell>
    <Cell ss:Index="18" ss:MergeAcross="4" ss:StyleID="SubLabelHeader"><Data ss:Type="String">Annotation &amp; validation</Data></Cell>
    <Cell ss:Index="23" ss:MergeAcross="4" ss:StyleID="SubLabelHeader"><Data ss:Type="String">Initial training</Data></Cell>
    <Cell ss:Index="28" ss:MergeAcross="4" ss:StyleID="SubLabelHeader"><Data ss:Type="String">Testing &amp; refinement</Data></Cell>
    <Cell ss:Index="33" ss:MergeAcross="4" ss:StyleID="SubLabelHeader"><Data ss:Type="String">Integration &amp; real-time detection</Data></Cell>
    <Cell ss:Index="38" ss:MergeAcross="4" ss:StyleID="SubLabelHeader"><Data ss:Type="String">Crushing risk logic</Data></Cell>
    <Cell ss:Index="43" ss:MergeAcross="4" ss:StyleID="SubLabelHeader"><Data ss:Type="String">Health &amp; analytics</Data></Cell>
    <Cell ss:Index="48" ss:MergeAcross="4" ss:StyleID="SubLabelHeader"><Data ss:Type="String">Prediction validation</Data></Cell>
    <Cell ss:Index="53" ss:MergeAcross="4" ss:StyleID="SubLabelHeader"><Data ss:Type="String">Integration</Data></Cell>
    <Cell ss:Index="58" ss:MergeAcross="4" ss:StyleID="SubLabelHeader"><Data ss:Type="String">Testing &amp; optimization</Data></Cell>
    <Cell ss:Index="63" ss:MergeAcross="4" ss:StyleID="SubLabelHeader"><Data ss:Type="String">Documentation &amp; defense prep</Data></Cell>
   </Row>

   <!-- TASK ROWS GROUPED BY SECTION -->
   ${resolvedSections
     .map((sec) => {
       const secTasks = tasks.filter((t) => t.section === sec);
       if (secTasks.length === 0) return '';
       const sectionXml = `
   <!-- SECTION: ${escapeXml(sec)} -->
   <Row ss:Height="20">
    <Cell ss:Index="1" ss:MergeAcross="66" ss:StyleID="SectionHeader">
     <Data ss:Type="String">${escapeXml(sec)}</Data>
    </Cell>
   </Row>
   ${secTasks
     .map((task) => {
       const fraction = normalizeProgress(task.progress);
       const pctDisplay =
         (fraction * 100) % 1 === 0
           ? `${Math.round(fraction * 100)}%`
           : `${(fraction * 100).toFixed(2)}%`;
       const pct = Math.round(fraction * 100);
       const startCol = Number(task.startDayCol ?? 0);
       const spanDays =
         task.durationDays !== undefined && task.durationDays !== null
           ? Number(task.durationDays)
           : 1;
       const rawCategory =
         task.category ||
         (task.id.startsWith('PLAN') || task.id.startsWith('ARCH')
           ? 'yellow'
           : task.id.startsWith('INFRA') || task.id.startsWith('BE')
             ? 'green'
             : task.id.startsWith('SEC')
               ? 'blue'
               : 'orange');
       const category = String(rawCategory).toLowerCase();
       const validCategories = [
         'yellow',
         'green',
         'orange',
         'blue',
         'purple',
         'rose',
         'teal',
         'indigo',
       ];
       const catKey = validCategories.includes(category) ? category : 'yellow';
       const leftStyle = `CellLeft_${catKey}`;
       const centerStyle = `CellCenter_${catKey}`;

       // Map day columns
       let dayCellsXml = '';
       for (let d = 0; d < TOTAL_DAY_COLS; d++) {
         const colNum = 8 + d;
         const isFilled =
           Array.isArray(task.filledDays) && task.filledDays.length > 0
             ? task.filledDays.includes(d)
             : spanDays > 0
               ? d >= startCol && d < startCol + spanDays
               : false;

         if (isFilled) {
           const filledIdx =
             Array.isArray(task.filledDays) && task.filledDays.length > 0
               ? task.filledDays.indexOf(d)
               : d - startCol;
           const totalCount =
             Array.isArray(task.filledDays) && task.filledDays.length > 0
               ? task.filledDays.length
               : spanDays || 1;
           const isDonePart =
             pct > 0 && (pct === 100 || filledIdx < Math.ceil((totalCount * pct) / 100));

           let barStyle = 'BarYellowDone';
           if (catKey === 'green') barStyle = isDonePart ? 'BarGreenDone' : 'BarGreenPlan';
           else if (catKey === 'orange') barStyle = isDonePart ? 'BarOrangeDone' : 'BarOrangePlan';
           else if (catKey === 'blue') barStyle = isDonePart ? 'BarBlueDone' : 'BarBluePlan';
           else if (catKey === 'purple') barStyle = isDonePart ? 'BarPurpleDone' : 'BarPurplePlan';
           else if (catKey === 'rose') barStyle = isDonePart ? 'BarRoseDone' : 'BarRosePlan';
           else if (catKey === 'teal') barStyle = isDonePart ? 'BarTealDone' : 'BarTealPlan';
           else if (catKey === 'indigo') barStyle = isDonePart ? 'BarIndigoDone' : 'BarIndigoPlan';
           else barStyle = isDonePart ? 'BarYellowDone' : 'BarYellowPlan';

           dayCellsXml += `<Cell ss:Index="${colNum}" ss:StyleID="${barStyle}"/>`;
         } else {
           dayCellsXml += `<Cell ss:Index="${colNum}" ss:StyleID="DayEmpty"/>`;
         }
       }

       return `<Row ss:Height="18">
    <Cell ss:Index="1" ss:StyleID="${leftStyle}"><Data ss:Type="String">${escapeXml(task.id)}</Data></Cell>
    <Cell ss:Index="2" ss:StyleID="${leftStyle}"><Data ss:Type="String">${escapeXml(task.title)}</Data></Cell>
    <Cell ss:Index="3" ss:StyleID="${leftStyle}"><Data ss:Type="String">${escapeXml(task.owner)}</Data></Cell>
    <Cell ss:Index="4" ss:StyleID="${centerStyle}"><Data ss:Type="String">${escapeXml(task.startDate)}</Data></Cell>
    <Cell ss:Index="5" ss:StyleID="${centerStyle}"><Data ss:Type="String">${escapeXml(task.dueDate)}</Data></Cell>
    <Cell ss:Index="6" ss:StyleID="${centerStyle}"><Data ss:Type="Number">${spanDays}</Data></Cell>
    <Cell ss:Index="7" ss:StyleID="${centerStyle}"><Data ss:Type="String">${pctDisplay}</Data></Cell>
    ${dayCellsXml}
   </Row>`;
     })
     .join('\n   ')}`;
       return sectionXml;
     })
     .join('\n')}

   <!-- SPACER ROW BEFORE SIGNATURES -->
   <Row ss:Height="24"></Row>

   <!-- DYNAMIC SIGNATURES BLOCK (4 COLUMNS) -->
   <Row ss:Height="20">
    <Cell ss:Index="1" ss:MergeAcross="1" ss:StyleID="SigName"><Data ss:Type="String">${escapeXml(resolvedProponents[0] || 'Researcher')}</Data></Cell>
    <Cell ss:Index="3" ss:StyleID="SigName"><Data ss:Type="String">${escapeXml(resolvedProponents[1] || '')}</Data></Cell>
    <Cell ss:Index="4" ss:MergeAcross="1" ss:StyleID="SigName"><Data ss:Type="String">${escapeXml(adviser ? adviser.toUpperCase() : 'ADVISER')}</Data></Cell>
    <Cell ss:Index="6" ss:MergeAcross="1" ss:StyleID="SigName"><Data ss:Type="String">${escapeXml(instructor || 'Dr. Teles O. Aribe Jr.')}</Data></Cell>
   </Row>
   <Row ss:Height="16">
    <Cell ss:Index="1" ss:MergeAcross="1" ss:StyleID="SigRole"><Data ss:Type="String">Researcher</Data></Cell>
    <Cell ss:Index="3" ss:StyleID="SigRole"><Data ss:Type="String">${resolvedProponents[1] ? 'Researcher' : ''}</Data></Cell>
    <Cell ss:Index="4" ss:MergeAcross="1" ss:StyleID="SigRole"><Data ss:Type="String">Adviser</Data></Cell>
    <Cell ss:Index="6" ss:MergeAcross="1" ss:StyleID="SigRole"><Data ss:Type="String">Instructor</Data></Cell>
   </Row>
   ${
     resolvedProponents[2] || resolvedProponents[3]
       ? `
   <Row ss:Height="12"></Row>
   <Row ss:Height="20">
    <Cell ss:Index="1" ss:MergeAcross="1" ss:StyleID="SigName"><Data ss:Type="String">${escapeXml(resolvedProponents[2] || '')}</Data></Cell>
    <Cell ss:Index="3" ss:StyleID="SigName"><Data ss:Type="String">${escapeXml(resolvedProponents[3] || '')}</Data></Cell>
   </Row>
   <Row ss:Height="16">
    <Cell ss:Index="1" ss:MergeAcross="1" ss:StyleID="SigRole"><Data ss:Type="String">${resolvedProponents[2] ? 'Researcher' : ''}</Data></Cell>
    <Cell ss:Index="3" ss:StyleID="SigRole"><Data ss:Type="String">${resolvedProponents[3] ? 'Researcher' : ''}</Data></Cell>
   </Row>`
       : ''
   }
  </Table>
 </Worksheet>
</Workbook>`;
}

/**
 * Download generated Excel XML file as .xls in the browser
 */
export function downloadExcelGantt(options) {
  const { filename = 'Capstone_Project_Gantt_Chart.xls' } = options || {};
  const xml = buildExcelXml(options || {});
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
