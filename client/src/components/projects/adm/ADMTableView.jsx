import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import ADMRemarkRow from './ADMRemarkRow';

/**
 * Modular tabular view component for Action Done Matrix.
 * Displays institutional BukSU table headers, empty states, rows, and page allocation helpers.
 */
export function ADMTableView({
  pageRows = [],
  pageIdx = 0,
  totalPages = 1,
  displayedRows = [],
  isFirstPage = pageIdx === 0,
  isLastPage = pageIdx === totalPages - 1,
  isReadOnly = false,
  isCurrentUserStudent = false,
  isFaculty = false,
  isStudent = false,
  isUserPanelist = false,
  isUserInstructor = false,
  isUserSecretary = false,
  isUserAdviser = false,
  canAddRow = false,
  handleCellChange,
  handleCellBlur,
  handleToggleFulfillment,
  handleMoveRowUp,
  handleMoveRowDown,
  handleDeleteRow,
  handleAddRowToPage,
}) {
  const effectiveRows = Array.isArray(pageRows) && pageRows.length > 0 ? pageRows : pageRows || [];
  const allRows = Array.isArray(displayedRows) ? displayedRows : [];

  return (
    <>
      {/* Authentic Table matching Secretary Minutes */}
      <div
        className="w-full min-w-0 max-w-full overflow-x-auto print:overflow-visible"
        role="region"
        aria-label="Action Done Matrix recommendations table"
        tabIndex={0}
      >
        <table className="w-full table-fixed border-collapse border border-black text-xs sm:text-sm font-serif">
          <TableHeader className="[&_tr]:border-b-black">
            <TableRow className="border-b-black transition-none hover:bg-transparent">
              <TableHead className="w-[26%] h-auto border-r border-black px-3 py-2 text-center font-serif text-xs font-bold uppercase text-black sm:text-sm">
                Name of Panel
              </TableHead>
              <TableHead className="w-[35%] h-auto border-r border-black px-3 py-2 text-center font-serif text-xs font-bold uppercase text-black sm:text-sm">
                Suggestion of the Panel(s)
              </TableHead>
              <TableHead className="w-[30%] h-auto border-r border-black px-3 py-2 text-center font-serif text-xs font-bold uppercase text-black sm:text-sm">
                Action Taken
              </TableHead>
              <TableHead className="w-[9%] h-auto px-2 py-2 text-center font-serif text-[11px] font-bold uppercase text-black sm:text-xs">
                Page Number/s
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr:last-child]:border-b [&_tr:last-child]:border-b-black">
            {effectiveRows.length === 0 ? (
              <TableRow className="border-b-black transition-none hover:bg-transparent">
                <TableCell
                  colSpan={4}
                  className="p-6 text-center font-serif text-xs italic text-muted-foreground print:hidden"
                >
                  {isFirstPage && allRows.length === 0
                    ? isCurrentUserStudent
                      ? 'No recommendations recorded yet by the defense committee or panel.'
                      : 'No recommendations recorded yet. Click "Add Row" to begin.'
                    : isLastPage
                      ? 'Sign-off sheet reserved for committee digital endorsements.'
                      : 'No rows allocated to this sheet. Use the row movement buttons (↑ / ↓) or click "Add Row to ADM".'}
                </TableCell>
              </TableRow>
            ) : (
              effectiveRows.map((row, rIdx) => {
                const rowId = row._id || row.id || `${pageIdx}-${rIdx}`;
                const isLocked = Boolean(row.isLocked);
                const canEditPanel = (isFaculty || isUserPanelist || isUserInstructor) && !isLocked;
                const canEditSuggestion =
                  (isFaculty || isUserPanelist || isUserInstructor) && !isLocked;
                const canEditAction = isStudent && !isLocked;
                const canVerifyRow =
                  (isFaculty ||
                    isUserPanelist ||
                    isUserSecretary ||
                    isUserInstructor ||
                    isUserAdviser) &&
                  !isLocked;

                return (
                  <ADMRemarkRow
                    key={rowId}
                    row={row}
                    rowId={rowId}
                    pageIdx={pageIdx}
                    totalPages={totalPages}
                    canEditPanel={canEditPanel}
                    canEditSuggestion={canEditSuggestion}
                    canEditAction={canEditAction}
                    canVerifyRow={canVerifyRow}
                    canAddRow={canAddRow}
                    isReadOnly={isReadOnly}
                    handleCellChange={handleCellChange}
                    handleCellBlur={handleCellBlur}
                    handleToggleFulfillment={handleToggleFulfillment}
                    handleMoveRowUp={handleMoveRowUp}
                    handleMoveRowDown={handleMoveRowDown}
                    handleDeleteRow={handleDeleteRow}
                  />
                );
              })
            )}
          </TableBody>
        </table>
      </div>

      {/* Bottom Space Allocation Helper & Add Panelist Row Button (Matching Secretary Minutes Image 4) */}
      <div className="flex items-center justify-between pt-1.5 no-print print:hidden font-serif">
        <span className="text-[11px] text-paper-muted italic no-print print:hidden">
          Tables dynamically allocate space as you type.
        </span>
        {canAddRow && (
          <Button
            variant="link"
            size="sm"
            onClick={() => handleAddRowToPage?.(pageIdx)}
            className="h-9 gap-1 px-1 font-sans text-xs font-medium no-print print:hidden"
            title="Add another panelist row to this table"
            data-testid="adm-add-row-btn"
          >
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            <span>Add Panelist Row</span>
            <span aria-hidden="true" className="hidden">
              Add Row to ADM
            </span>
          </Button>
        )}
      </div>
    </>
  );
}

export default ADMTableView;
