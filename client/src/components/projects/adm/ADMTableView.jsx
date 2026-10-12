import React from 'react';
import { Plus } from 'lucide-react';
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
      <table className="w-full border-collapse border border-black text-xs sm:text-sm font-serif">
        <thead>
          <tr className="border-b border-black">
            <th className="w-[26%] py-2 px-3 text-center font-bold text-black border-r border-black uppercase text-xs sm:text-sm font-serif">
              Name of Panel
            </th>
            <th className="w-[35%] py-2 px-3 text-center font-bold text-black border-r border-black uppercase text-xs sm:text-sm font-serif">
              Suggestion of the Panel(s)
            </th>
            <th className="w-[30%] py-2 px-3 text-center font-bold text-black border-r border-black uppercase text-xs sm:text-sm font-serif">
              Action Taken
            </th>
            <th className="w-[9%] py-2 px-2 text-center font-bold text-black uppercase text-[11px] sm:text-xs font-serif">
              Page Number/s
            </th>
          </tr>
        </thead>
        <tbody>
          {effectiveRows.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="p-6 text-center text-xs text-neutral-500 italic font-serif print:hidden"
              >
                {isFirstPage && allRows.length === 0
                  ? isCurrentUserStudent
                    ? 'No recommendations recorded yet by the defense committee or panel.'
                    : 'No recommendations recorded yet. Click "Add Row" to begin.'
                  : isLastPage
                    ? 'Sign-off sheet reserved for committee digital endorsements.'
                    : 'No rows allocated to this sheet. Use the row movement buttons (↑ / ↓) or click "Add Row to ADM".'}
              </td>
            </tr>
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
        </tbody>
      </table>

      {/* Bottom Space Allocation Helper & Add Panelist Row Button (Matching Secretary Minutes Image 4) */}
      <div className="flex items-center justify-between pt-1.5 no-print print:hidden font-serif">
        <span className="text-[11px] text-neutral-500 italic no-print print:hidden">
          Tables dynamically allocate space as you type.
        </span>
        {canAddRow && (
          <button
            type="button"
            onClick={() => handleAddRowToPage?.(pageIdx)}
            className="text-xs text-blue-700 hover:underline flex items-center gap-1 font-sans font-medium no-print print:hidden"
            title="Add another panelist row to this table"
            data-testid="adm-add-row-btn"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Panelist Row</span>
            <span className="hidden">Add Row to ADM</span>
          </button>
        )}
      </div>
    </>
  );
}

export default ADMTableView;
