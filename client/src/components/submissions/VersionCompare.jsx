/**
 * VersionCompare.jsx
 * Side-by-side comparison of two submission versions.
 * Shows metadata changes and directs document review to the canonical viewer.
 */

import PropTypes from 'prop-types';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';

const formatSubmittedAt = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : format(date, 'MMM dd, yyyy h:mm aa');
};

const getOriginalityScore = (version) =>
  Number.isFinite(version.plagiarismScore) ? `${version.plagiarismScore}%` : 'Not available';
const formatStatus = (status) => status?.replaceAll('_', ' ') || 'Not available';

const VersionCompare = ({ version1, version2 }) => {
  const comparisonRows = [
    {
      label: 'Submission date',
      version1: formatSubmittedAt(version1.submittedAt),
      version2: formatSubmittedAt(version2.submittedAt),
    },
    {
      label: 'Originality score',
      version1: getOriginalityScore(version1),
      version2: getOriginalityScore(version2),
    },
    {
      label: 'Review status',
      version1: formatStatus(version1.status),
      version2: formatStatus(version2.status),
    },
    {
      label: 'Adviser note',
      version1: version1.reviewNote || 'No review note',
      version2: version2.reviewNote || 'No review note',
    },
  ].map((row) => ({ ...row, changed: row.version1 !== row.version2 }));

  const changedCount = comparisonRows.filter((row) => row.changed).length;

  return (
    <div className="min-w-0 space-y-4">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="text-base">Version metadata</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%] break-words whitespace-normal">Property</TableHead>
                <TableHead className="w-[35%] break-words whitespace-normal">
                  <Badge variant="outline">Version {version1.version}</Badge>
                </TableHead>
                <TableHead className="w-[35%] break-words whitespace-normal">
                  <Badge variant="outline">Version {version2.version}</Badge>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonRows.map((row) => (
                <TableRow key={row.label} data-changed={row.changed || undefined}>
                  <TableHead
                    scope="row"
                    className="break-words whitespace-normal font-medium text-foreground"
                  >
                    {row.label}
                  </TableHead>
                  <TableCell
                    className={`break-words whitespace-normal ${row.changed ? 'bg-muted/30' : ''}`}
                  >
                    {row.version1}
                  </TableCell>
                  <TableCell
                    className={`break-words whitespace-normal ${row.changed ? 'bg-primary/5 font-medium' : ''}`}
                  >
                    {row.version2}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Alert variant="info" className="min-w-0">
        <AlertTitle>Document content</AlertTitle>
        <AlertDescription>
          This comparison uses the saved submission metadata. Open the submission&apos;s canonical
          manuscript viewer to read or compare document content.
        </AlertDescription>
      </Alert>

      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        {changedCount} {changedCount === 1 ? 'property differs' : 'properties differ'} between the
        selected versions.
      </p>
    </div>
  );
};

VersionCompare.propTypes = {
  version1: PropTypes.shape({
    version: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    submittedAt: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
    ]),
    plagiarismScore: PropTypes.number,
    status: PropTypes.string,
    reviewNote: PropTypes.string,
  }).isRequired,
  version2: PropTypes.shape({
    version: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    submittedAt: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
    ]),
    plagiarismScore: PropTypes.number,
    status: PropTypes.string,
    reviewNote: PropTypes.string,
  }).isRequired,
};

export default VersionCompare;
