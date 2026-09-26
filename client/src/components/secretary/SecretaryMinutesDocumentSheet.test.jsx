import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SecretaryMinutesDocumentSheet from '@/components/secretary/SecretaryMinutesDocumentSheet';

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

  it('renders exactly 2 baseline sheets initially (Opening Sheet and Final Sign-off Sheet)', async () => {
    await act(async () => {
      root.render(<SecretaryMinutesDocumentSheet project={mockProject} />);
    });

    const page1 = container.querySelector('[data-testid="secretary-minutes-page-1"]');
    const page2 = container.querySelector('[data-testid="secretary-minutes-page-2"]');
    const page3 = container.querySelector('[data-testid="secretary-minutes-page-3"]');

    expect(page1).not.toBeNull();
    expect(page2).not.toBeNull();
    expect(page3).toBeNull(); // Page 2 is the final sheet initially

    // Page 1 has document title "SECRETARY’S MINUTES"
    expect(page1.textContent).toContain('SECRETARY’S MINUTES');

    // Page 2 (Final Sheet) has Recommendations, Verdict, and Signature designation
    expect(page2.textContent).toContain('Overall Recommendations:');
    expect(page2.textContent).toContain('Panel Verdict:');
    expect(page2.textContent).toContain('Signature over Printed Name of Secretary');
  });

  it('renders "+ Add Continuation Page" button outside Page 1, but NOT after the Final Sheet', async () => {
    await act(async () => {
      root.render(<SecretaryMinutesDocumentSheet project={mockProject} />);
    });

    const addBtnPage1 = container.querySelector('[data-testid="add-continuation-page-btn-1"]');
    const addBtnPage2 = container.querySelector('[data-testid="add-continuation-page-btn-2"]');

    // The add continuation page button must exist after Page 1
    expect(addBtnPage1).not.toBeNull();
    expect(addBtnPage1.textContent).toContain('Add Continuation Page');

    // The final sheet (Page 2) must NOT have an add button after it
    expect(addBtnPage2).toBeNull();
  });

  it('inserts continuation page before final sheet, making it Page 2 of 3 and preserving Final Sheet as Page 3', async () => {
    await act(async () => {
      root.render(<SecretaryMinutesDocumentSheet project={mockProject} />);
    });

    const addBtnPage1 = container.querySelector('[data-testid="add-continuation-page-btn-1"]');
    expect(addBtnPage1).not.toBeNull();

    // Click to insert continuation page
    await act(async () => {
      addBtnPage1.click();
    });

    // Now there should be 3 pages
    const page1 = container.querySelector('[data-testid="secretary-minutes-page-1"]');
    const page2 = container.querySelector('[data-testid="secretary-minutes-page-2"]');
    const page3 = container.querySelector('[data-testid="secretary-minutes-page-3"]');

    expect(page1).not.toBeNull();
    expect(page2).not.toBeNull();
    expect(page3).not.toBeNull();

    // Page 2 is now a continuation page
    expect(page2.textContent).toContain('SECRETARY’S MINUTES (CONTINUATION)');

    // Page 3 is the Final Sign-off Sheet
    expect(page3.textContent).toContain('Overall Recommendations:');
    expect(page3.textContent).toContain('Panel Verdict:');
    expect(page3.textContent).toContain('Signature over Printed Name of Secretary');

    // After Page 3 (final sheet), there is still NO add button
    const addBtnPage3 = container.querySelector('[data-testid="add-continuation-page-btn-3"]');
    expect(addBtnPage3).toBeNull();
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
});
