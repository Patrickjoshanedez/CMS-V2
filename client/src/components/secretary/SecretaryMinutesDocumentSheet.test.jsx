import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach } from 'vitest';
import SecretaryMinutesDocumentSheet, {
  buildDefault3Sheets,
  autoAllocateContinuationSheets,
  extractCommitteeFromProject,
  REFERENCE_PROTOTYPE_MINUTES,
} from '@/components/secretary/SecretaryMinutesDocumentSheet';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockProject = {
  _id: 'proj-sec-test-01',
  title: 'BukSU Capstone Management System with Plagiarism Checker',
  teamId: {
    _id: 'team-1',
    name: 'Team Beta',
    members: [
      { userId: { fullName: 'Throylan Antipuesto' }, role: 'Project Lead' },
      { userId: { fullName: 'Chijay Canoy' }, role: 'Frontend Developer' },
      { userId: { fullName: 'Patrick Josh Anedez' }, role: 'Backend Developer' },
    ],
  },
  adviserId: { fullName: 'Glaiza Mae Libe' },
  defenseCommittees: {
    capstone2: {
      panelChair: { fullName: 'Louie Jay S. Labastida' },
      panelists: [{ fullName: 'Raul Lecaros' }, { fullName: 'Joseph Abella' }],
      secretary: { fullName: 'Joan Marie M. Panes' },
    },
  },
};

describe('SecretaryMinutesDocumentSheet Component', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it('renders exactly 3 baseline sheets by default (Opening Sheet, Continuation Sheet, and Final Sign-off Sheet)', async () => {
    await act(async () => {
      root.render(<SecretaryMinutesDocumentSheet project={mockProject} />);
    });

    const page1 = container.querySelector('[data-testid="secretary-minutes-page-1"]');
    const page2 = container.querySelector('[data-testid="secretary-minutes-page-2"]');
    const page3 = container.querySelector('[data-testid="secretary-minutes-page-3"]');
    const page4 = container.querySelector('[data-testid="secretary-minutes-page-4"]');

    expect(page1).not.toBeNull();
    expect(page2).not.toBeNull();
    expect(page3).not.toBeNull();
    expect(page4).toBeNull(); // Exactly 3 baseline sheets

    // Page 1 (Opening Sheet) has document title, BukSU header, and Panel Chair
    expect(page1.textContent).toContain('SECRETARY’S MINUTES');
    expect(page1.textContent).toContain('Louie Jay S. Labastida');
    expect(page1.getAttribute('data-page')).toBe('1');

    // Page 2 (Continuation Sheet) has Continuation Title and Panel Member 1 (Raul Lecaros)
    expect(page2.textContent).toContain('SECRETARY’S MINUTES (CONTINUATION)');
    expect(page2.textContent).toContain('Raul Lecaros');
    expect(page2.getAttribute('data-page')).toBe('continuation');

    // Page 3 (Final Sign-off Sheet) has Panel Member 2 (Joseph Abella), Recommendations, Verdict, Signature
    expect(page3.textContent).toContain('SECRETARY’S MINUTES (CONTINUATION)');
    expect(page3.textContent).toContain('Joseph Abella');
    expect(page3.textContent).toContain('Overall Recommendations:');
    expect(page3.textContent).toContain('Panel Verdict:');
    expect(page3.textContent).toContain('Signature over Printed Name of Secretary');
    expect(page3.getAttribute('data-page')).toBe('final');
  });

  it('renders "+ Add Continuation Page" button outside Page 1 and Page 2, but NOT after the Final Sheet (Page 3)', async () => {
    await act(async () => {
      root.render(<SecretaryMinutesDocumentSheet project={mockProject} />);
    });

    const addBtnPage1 = container.querySelector('[data-testid="add-continuation-page-btn-1"]');
    const addBtnPage2 = container.querySelector('[data-testid="add-continuation-page-btn-2"]');
    const addBtnPage3 = container.querySelector('[data-testid="add-continuation-page-btn-3"]');

    // The add continuation page button must exist after Page 1 and Page 2
    expect(addBtnPage1).not.toBeNull();
    expect(addBtnPage1.textContent).toContain('Add Continuation Page');
    expect(addBtnPage2).not.toBeNull();
    expect(addBtnPage2.textContent).toContain('Add Continuation Page');

    // The final sheet (Page 3) must NOT have an add button after it
    expect(addBtnPage3).toBeNull();
  });

  it('inserts continuation page before final sheet, resulting in 4 sheets and preserving Final Sheet as Page 4', async () => {
    await act(async () => {
      root.render(<SecretaryMinutesDocumentSheet project={mockProject} />);
    });

    const addBtnPage1 = container.querySelector('[data-testid="add-continuation-page-btn-1"]');
    expect(addBtnPage1).not.toBeNull();

    // Click to insert continuation page after Page 1
    await act(async () => {
      addBtnPage1.click();
    });

    // Now there should be 4 pages
    const page1 = container.querySelector('[data-testid="secretary-minutes-page-1"]');
    const page2 = container.querySelector('[data-testid="secretary-minutes-page-2"]');
    const page3 = container.querySelector('[data-testid="secretary-minutes-page-3"]');
    const page4 = container.querySelector('[data-testid="secretary-minutes-page-4"]');

    expect(page1).not.toBeNull();
    expect(page2).not.toBeNull();
    expect(page3).not.toBeNull();
    expect(page4).not.toBeNull();

    // Page 2 & 3 are continuation sheets
    expect(page2.textContent).toContain('SECRETARY’S MINUTES (CONTINUATION)');
    expect(page3.textContent).toContain('SECRETARY’S MINUTES (CONTINUATION)');

    // Page 4 is the Final Sign-off Sheet
    expect(page4.textContent).toContain('Overall Recommendations:');
    expect(page4.textContent).toContain('Panel Verdict:');
    expect(page4.textContent).toContain('Signature over Printed Name of Secretary');

    // After Page 4 (final sheet), there is still NO add button
    const addBtnPage4 = container.querySelector('[data-testid="add-continuation-page-btn-4"]');
    expect(addBtnPage4).toBeNull();
  });

  it('protects against deleting baseline sheets when 3 or fewer pages exist', async () => {
    await act(async () => {
      root.render(<SecretaryMinutesDocumentSheet project={mockProject} />);
    });

    // On Page 2, click Remove Page 2
    const removeBtnPage2 = container.querySelector(
      '[data-testid="secretary-minutes-page-2"] button[title="Remove this continuation page"]',
    );
    expect(removeBtnPage2).not.toBeNull();

    await act(async () => {
      removeBtnPage2.click();
    });

    // Still exactly 3 pages because baseline of 3 is protected
    expect(container.querySelector('[data-testid="secretary-minutes-page-1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="secretary-minutes-page-2"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="secretary-minutes-page-3"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="secretary-minutes-page-4"]')).toBeNull();
  });

  it('renders twin static text elements with print classes for crisp PDF export and zero textarea scrollbars', async () => {
    await act(async () => {
      root.render(<SecretaryMinutesDocumentSheet project={mockProject} />);
    });

    // Textareas have AutoResizeTextarea with print:hidden and a static twin div with hidden print:block
    const textareas = container.querySelectorAll('textarea');
    expect(textareas.length).toBeGreaterThan(0);
    textareas.forEach((ta) => {
      expect(ta.className).toContain('print:hidden');
    });

    // Static print text twins exist
    const printTextDivs = container.querySelectorAll('.hidden.print\\:block');
    expect(printTextDivs.length).toBeGreaterThan(0);
  });

  it('renders the "Balance Pages" action button in the top toolbar', async () => {
    await act(async () => {
      root.render(<SecretaryMinutesDocumentSheet project={mockProject} />);
    });

    const balanceBtn = container.querySelector('[data-testid="auto-distribute-btn"]');
    expect(balanceBtn).not.toBeNull();
    expect(balanceBtn.textContent).toContain('Balance Pages');
  });

  it('buildDefault3Sheets helper correctly builds a 3-sheet default structure', () => {
    const sheets = buildDefault3Sheets('Dr. Chair', ['Member A', 'Member B']);
    expect(sheets).toHaveLength(3);
    expect(sheets[0].panelRemarks[0].panelName).toBe('Dr. Chair');
    expect(sheets[1].panelRemarks[0].panelName).toBe('Member A');
    expect(sheets[2].panelRemarks[0].panelName).toBe('Member B');
  });

  it('extractCommitteeFromProject extracts roster defensively across defenseCommittees', () => {
    const extracted = extractCommitteeFromProject(mockProject);
    expect(extracted.chairName).toBe('Louie Jay S. Labastida');
    expect(extracted.panelMemberNames).toEqual(['Raul Lecaros', 'Joseph Abella']);
    expect(extracted.secretaryName).toBe('Joan Marie M. Panes');
    expect(extracted.adviserName).toBe('Glaiza Mae Libe');
  });

  it('autoAllocateContinuationSheets splits remarks when chair comments exceed page capacity', () => {
    const longChairComments = Array.from({ length: 15 }, (_, i) => `Chair Comment ${i + 1}`);
    const inputPages = [
      {
        panelRemarks: [
          {
            panelName: 'Dr. Lead Chair',
            comments: longChairComments,
          },
        ],
      },
    ];

    const allocated = autoAllocateContinuationSheets(inputPages);
    expect(allocated.length).toBeGreaterThanOrEqual(3);

    // Sheet 1 has first 10 comments
    expect(allocated[0].panelRemarks[0].comments).toHaveLength(10);
    expect(allocated[0].panelRemarks[0].panelName).toBe('Dr. Lead Chair');

    // Sheet 2 has continued remarks
    expect(allocated[1].panelRemarks[0].panelName).toBe('Dr. Lead Chair (Continued)');
    expect(allocated[1].panelRemarks[0].comments).toHaveLength(5);
  });

  it('autoAllocateContinuationSheets correctly distributes REFERENCE_PROTOTYPE_MINUTES across exactly 3 authentic sheets', () => {
    const allocated = autoAllocateContinuationSheets(REFERENCE_PROTOTYPE_MINUTES.pages);
    expect(allocated).toHaveLength(3);

    // Sheet 1: Louie Jay Labastida (10 comments)
    expect(allocated[0].panelRemarks[0].panelName).toBe('Louie Jay Labastida');
    expect(allocated[0].panelRemarks[0].comments).toHaveLength(10);

    // Sheet 2: Louie Jay Labastida (Continued) (2 comments) and Raul Lecaros (12 comments)
    expect(allocated[1].panelRemarks).toHaveLength(2);
    expect(allocated[1].panelRemarks[0].panelName).toBe('Louie Jay Labastida (Continued)');
    expect(allocated[1].panelRemarks[0].comments).toHaveLength(2);
    expect(allocated[1].panelRemarks[1].panelName).toBe('Raul Lecaros');
    expect(allocated[1].panelRemarks[1].comments).toHaveLength(12);

    // Sheet 3: Joseph Abella (6 comments) and Dr. Sales Aribe Jr. (5 comments)
    expect(allocated[2].panelRemarks).toHaveLength(2);
    expect(allocated[2].panelRemarks[0].panelName).toBe('Joseph Abella');
    expect(allocated[2].panelRemarks[0].comments).toHaveLength(6);
    expect(allocated[2].panelRemarks[1].panelName).toBe('Dr. Sales Aribe Jr.');
    expect(allocated[2].panelRemarks[1].comments).toHaveLength(5);
  });

  it('autoAllocateContinuationSheets correctly distributes flat REFERENCE_PROTOTYPE_MINUTES.panelRemarks', () => {
    const allocated = autoAllocateContinuationSheets([
      { panelRemarks: REFERENCE_PROTOTYPE_MINUTES.panelRemarks },
    ]);
    expect(allocated).toHaveLength(3);
    expect(allocated[0].panelRemarks[0].panelName).toBe('Louie Jay Labastida');
    expect(allocated[0].panelRemarks[0].comments).toHaveLength(10);
    expect(allocated[1].panelRemarks[0].panelName).toBe('Louie Jay Labastida (Continued)');
    expect(allocated[1].panelRemarks[0].comments).toHaveLength(2);
    expect(allocated[1].panelRemarks[1].panelName).toBe('Raul Lecaros');
    expect(allocated[1].panelRemarks[1].comments).toHaveLength(12);
  });

  it('autoAllocateContinuationSheets is idempotent when re-balancing already-distributed sheets', () => {
    const firstPass = autoAllocateContinuationSheets(REFERENCE_PROTOTYPE_MINUTES.pages);
    const secondPass = autoAllocateContinuationSheets(firstPass);
    expect(secondPass).toHaveLength(firstPass.length);
    expect(secondPass[0].panelRemarks[0].comments).toHaveLength(
      firstPass[0].panelRemarks[0].comments.length,
    );
    expect(secondPass[1].panelRemarks).toHaveLength(firstPass[1].panelRemarks.length);
    expect(secondPass[2].panelRemarks).toHaveLength(firstPass[2].panelRemarks.length);
  });

  it('splits non-chair panelist comments across continuation sheets when exceeding capacity', () => {
    const inputPages = [
      {
        panelRemarks: [
          { panelName: 'Dr. Lead Chair', comments: ['Chair Comment 1'] },
          {
            panelName: 'Member Long',
            comments: Array.from({ length: 30 }, (_, i) => `Member Long Comment ${i + 1}`),
          },
          { panelName: 'Member Short', comments: ['Member Short Comment 1'] },
        ],
      },
    ];
    const allocated = autoAllocateContinuationSheets(inputPages);
    expect(allocated.length).toBeGreaterThanOrEqual(4);

    const memberLongRemarks = allocated
      .flatMap((p) => p.panelRemarks)
      .filter((r) => r.panelName.includes('Member Long'));
    expect(memberLongRemarks.length).toBeGreaterThanOrEqual(2);
    expect(memberLongRemarks[0].comments.length).toBeLessThanOrEqual(16);
    expect(memberLongRemarks[1].panelName).toBe('Member Long (Continued)');
  });

  it('does NOT render remove page button on the final sign-off sheet', async () => {
    await act(async () => {
      root.render(<SecretaryMinutesDocumentSheet project={mockProject} />);
    });

    // Page 3 is the final sheet in default 3-page layout
    const finalPageRemoveBtn = container.querySelector(
      '[data-testid="secretary-minutes-page-3"] button[title="Remove this continuation page"]',
    );
    expect(finalPageRemoveBtn).toBeNull();

    // But Page 2 (continuation) DOES have the remove button
    const page2RemoveBtn = container.querySelector(
      '[data-testid="secretary-minutes-page-2"] button[title="Remove this continuation page"]',
    );
    expect(page2RemoveBtn).not.toBeNull();
  });

  it('renders static print twins for Type of Defense, Number of Rounds, and Panel Verdict to guarantee print visibility without duplicates', async () => {
    await act(async () => {
      root.render(<SecretaryMinutesDocumentSheet project={mockProject} />);
    });

    const page1 = container.querySelector('[data-testid="secretary-minutes-page-1"]');
    const page3 = container.querySelector('[data-testid="secretary-minutes-page-3"]');

    // Type of Defense interactive buttons have print:hidden and print twins have hidden print:inline-flex
    const defenseTypeButtons = page1.querySelectorAll('button.print\\:hidden');
    expect(defenseTypeButtons.length).toBeGreaterThanOrEqual(3);
    const defenseTypePrintTwins = page1.querySelectorAll('.hidden.print\\:inline-flex');
    expect(defenseTypePrintTwins.length).toBeGreaterThanOrEqual(3);

    // Panel Verdict interactive buttons have print:hidden and print twins have hidden print:flex
    const verdictButtons = page3.querySelectorAll('.final-signoff-section button.print\\:hidden');
    expect(verdictButtons.length).toBe(3);
    const verdictPrintTwins = page3.querySelectorAll('.final-signoff-section .hidden.print\\:flex');
    expect(verdictPrintTwins.length).toBe(3);
    expect(verdictPrintTwins[0].textContent).toContain('(✓)');
    expect(verdictPrintTwins[0].textContent).toContain('Approved with Minor Revision');
  });
});
