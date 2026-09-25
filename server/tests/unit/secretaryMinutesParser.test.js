import { describe, it, expect } from 'vitest';
import { parseSecretaryMinutesDocument } from '../../modules/submissions/secretaryMinutesParser.js';

describe('secretaryMinutesParser (OVPAA-F-INS-032)', () => {
  const sampleOcrText = `BUKIDNON STATE UNIVERSITY
Malaybalay City, Bukidnon 8700
Tel(088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph
Document Code: OVPAA-F-INS-032 Revision No: 01 Issue No: 01 Issue Date: June 1, 2018 Page 1 of 3
SECRETARY’S MINUTES
Title of Paper: ProjectWorkspace:CapstoneManagementSYstem withPlagiarismChecker
Name of Proponents:
Antipuesto, Throylan
Canoy, Chijay
Anedez, Patrick Josh
Bautista, Steven Joe
Type of Defense: ( ) Proposal Defense (✓) Prototype Defense ( ) Final Defense
Number of Rounds: ( ) 1
st (✓) 2
nd
( ) 3
rd
Date/Time & Venue: April 20, 2026 || 9:00am || COT Conference Room
Adviser: GlaizaMae Libe
Panel Chair/REC: Louie Jay S. Labastida
Panel Members:
Lecaros, Raul
Abella, Joseph
Secretary: Joan Marie M. Panes
Name of Panel COMMENTS/SUGGESTIONS
Louie Jay Labastida  Approved capstones should be transferred to archive
automatically
 do not require minimum of 3 submissions (“add more” and
“done” button instead)  adviser and panel will be same account as faculty (and
secretary)  identification of panel roles (chair, members, secretary(for the
record,with notification))  do not delete data (archive only)  setting of plagiarism rate should be cascaded to faculty and
students  action done matrix should be incorporated (with complete
signatories)  students should also be able to see comments and suggestions
embedded in documents (name of suggester, highlight of
concerned areas, google doc style)  Capstone 2: no documents involved so directly to action done
matrix
 secretary account upload minutes, action done created directly
from that  -editable/notification of justification will trigger only if late
 -put algorithm and its justification in paper  Name of Panel COMMENTS/SUGGESTIONS
Raul Lecaros  majority of the core functionalities (FR1–FR3, FR6, FR8– FR10, FR12–FR17) have been successfully implemented and
are operating as intended.  For FR4, it was agreed that the documentation must be
updated to reflect a maximum of four members per
capstone group instead of three, with an accompanying
justification. Additionally, interface improvements were
suggested, including repositioning the lock notification to
the top and introducing color-coded indicators (red for
locked and green for opened) to enhance user clarity.  For FR5, the header “capstone type” will be revised to “IT
Field of Discipline” to ensure proper terminology
alignment.  FR7 requires enhancement by removing the hard-coded
Google Doc link and enabling instructors to configure this
dynamically within the system.  FR11 was noted as partially met; while the functionality is
available on the student side, the GitHub repository link
must also be made visible on the adviser’s interface to
ensure transparency and monitoring.  FRAD1, FRAD5, FRAD6, and FRAD7 were confirmed as
fully implemented.  FRAD2, however, remains partially complete, as it requires
the display of team member names on the adviser’s view, specifically positioned on the right side of the interface.  It was also agreed that FRAD3 and FRAD4 should be
removed from the adviser functional requirements, as
attaching minutes of the system proposal does not align
with the intended scope.  For the panel requirements (FRPA01–FRPA07), all
functionalities were confirmed as fully met  FRINS1, FRINS3–FRINS5, FRINS7 meets expectations.  Minor adjustments were identified, including replacing the
trash icon with an archive function (FRINS2) to better reflect
intended usage and data retention practices.  Additionally, FRINS6 remains incomplete, as it requires the
inclusion of an Evaluation Report and a Plagiarism Report
for each study, which are essential for academic assessment
and integrity.
Joseph Abella  results should be seen only once details are filled in
 User should be able to read the full paper  if project is archived, details should not be visible (direct to
whole paper)  tabs: plagiarism vs similarity should be definite  proposal should be able to be submitted, but should be flagged
 per session submission list
Name of Panel COMMENTS/SUGGESTIONS
Client
Dr. Sales Aribe Jr.  Request: template redesignable/restructurable (instructor side)  light mode theme, bigger font size  date of submission of deliverables should be settable  scheduling upload (calendar implementation)  consultation module (optional)
Overall Recommendations:
Unfinished prototype with missing functions and modules. Recommended to redefend. Panel Verdict:
(√ ) Approved with Minor Revision
( ) Approved with Major Revision
( ) Rejected
JOAN MARIE M. PANES
Signature over Printed Name of Secretary`;

  it('correctly extracts all institutional metadata fields from Form OVPAA-F-INS-032', () => {
    const parsed = parseSecretaryMinutesDocument(sampleOcrText);

    expect(parsed.title).toContain(
      'ProjectWorkspace: CapstoneManagementSYstem withPlagiarismChecker',
    );
    expect(parsed.proponents).toEqual([
      'Antipuesto, Throylan',
      'Canoy, Chijay',
      'Anedez, Patrick Josh',
      'Bautista, Steven Joe',
    ]);
    expect(parsed.defenseType).toBe('prototype');
    expect(parsed.defenseTypeLabel).toBe('Prototype Defense');
    expect(parsed.round).toBe('2nd');
    expect(parsed.dateTimeVenue).toBe('April 20, 2026 || 9:00am || COT Conference Room');
    expect(parsed.venue).toBe('COT Conference Room');
    expect(parsed.adviser).toBe('GlaizaMae Libe');
    expect(parsed.panelChair).toBe('Louie Jay S. Labastida');
    expect(parsed.panelMembers).toEqual(['Lecaros, Raul', 'Abella, Joseph']);
    expect(parsed.secretary).toBe('Joan Marie M. Panes');
  });

  it('extracts panel remarks and recommendations accurately for each committee member', () => {
    const parsed = parseSecretaryMinutesDocument(sampleOcrText);

    expect(parsed.panelRemarks.length).toBeGreaterThanOrEqual(4);

    const chair = parsed.panelRemarks.find((p) => p.panelName.includes('Louie Jay'));
    expect(chair).toBeDefined();
    expect(chair.comments.length).toBeGreaterThan(5);
    expect(chair.comments.some((c) => c.includes('Approved capstones should be transferred'))).toBe(
      true,
    );

    const lecaros = parsed.panelRemarks.find((p) => p.panelName.includes('Raul Lecaros'));
    expect(lecaros).toBeDefined();
    expect(lecaros.comments.some((c) => c.includes('majority of the core functionalities'))).toBe(
      true,
    );
    expect(lecaros.comments.some((c) => c.includes('maximum of four members'))).toBe(true);

    const abella = parsed.panelRemarks.find((p) => p.panelName.includes('Joseph Abella'));
    expect(abella).toBeDefined();
    expect(abella.comments.some((c) => c.includes('results should be seen only once'))).toBe(true);

    const client = parsed.panelRemarks.find((p) => p.panelName.includes('Sales Aribe'));
    expect(client).toBeDefined();
    expect(client.comments.some((c) => c.includes('template redesignable'))).toBe(true);
  });

  it('extracts overall recommendations, verdict, and secretary signature block', () => {
    const parsed = parseSecretaryMinutesDocument(sampleOcrText);

    expect(parsed.overallRecommendations).toContain('Unfinished prototype with missing functions');
    expect(parsed.overallRecommendations).toContain('Recommended to redefend');
    expect(parsed.panelVerdict).toBe('approved_with_minor_revisions');
    expect(parsed.verdictLabel).toBe('Approved with Minor Revision');
    expect(parsed.secretarySignatoryName).toBe('JOAN MARIE M. PANES');
  });

  it('generates ADM row candidates from parsed suggestions', () => {
    const parsed = parseSecretaryMinutesDocument(sampleOcrText);

    expect(parsed.admRows.length).toBeGreaterThan(10);
    const firstRow = parsed.admRows[0];
    expect(firstRow.panelName).toBeDefined();
    expect(firstRow.suggestion).toBeDefined();
    expect(firstRow.expectedAction).toContain('Address and resolve:');
    expect(firstRow.status).toBe('pending');
    expect(firstRow.milestone).toBe('CAPSTONE_2');
  });

  it('handles empty or invalid text safely without crashing', () => {
    const emptyParsed = parseSecretaryMinutesDocument('');
    expect(emptyParsed.title).toBe('');
    expect(emptyParsed.proponents).toEqual([]);
    expect(emptyParsed.defenseType).toBe('');
    expect(emptyParsed.round).toBe('');
    expect(emptyParsed.panelRemarks).toEqual([]);
    expect(emptyParsed.overallRecommendations).toBe('');
    expect(emptyParsed.admRows).toEqual([]);
  });
});
