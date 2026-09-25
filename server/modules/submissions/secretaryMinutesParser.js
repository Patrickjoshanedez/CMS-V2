/**
 * Secretary Minutes Institutional Document Parser (OVPAA-F-INS-032)
 *
 * Parses BukSU Secretary's Minutes transcripts and OCR extracts into
 * structured, autofillable form models and Action Done Matrix (ADM) rows.
 *
 * @module modules/submissions/secretaryMinutesParser
 */

/**
 * Parses BukSU Form OVPAA-F-INS-032 plain text or OCR extract.
 *
 * @param {string} text - Raw extracted text from PDF/DOCX/OCR
 * @returns {object} Structured secretary minutes model
 */
export function parseSecretaryMinutesDocument(text) {
  const result = {
    title: '',
    proponents: [],
    defenseType: '',
    defenseTypeLabel: '',
    round: '',
    dateTimeVenue: '',
    venue: '',
    defenseDate: '',
    defenseTime: '',
    adviser: '',
    panelChair: '',
    panelMembers: [],
    secretary: '',
    panelRemarks: [],
    overallRecommendations: '',
    panelVerdict: '',
    verdictLabel: '',
    secretarySignatoryName: '',
    admRows: [],
    rawTextLength: text ? text.length : 0,
  };

  if (!text || typeof text !== 'string') return result;

  // 1. Title of Paper
  const titleMatch = text.match(/Title\s+of\s+Paper:\s*([^\n\r]+)/i);
  if (titleMatch) {
    let rawTitle = titleMatch[1].trim();
    // Clean up potential OCR merged words if separated by colon
    if (rawTitle.includes(':') && !rawTitle.includes(': ')) {
      rawTitle = rawTitle.replace(':', ': ');
    }
    result.title = rawTitle;
  }

  // 2. Name of Proponents
  const proponentsMatch = text.match(
    /Name\s+of\s+Proponents:\s*([\s\S]*?)(?=Type\s+of\s+Defense:|$)/i,
  );
  if (proponentsMatch) {
    result.proponents = proponentsMatch[1]
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !/^page\s+\d+/i.test(p) && !/Document\s+Code:/i.test(p));
  }

  // 3. Type of Defense
  const defenseTypeMatch = text.match(
    /Type\s+of\s+Defense:\s*([\s\S]*?)(?=Number\s+of\s+Rounds:|$)/i,
  );
  if (defenseTypeMatch) {
    const rawDT = defenseTypeMatch[1].replace(/\s+/g, ' ');
    if (/\(\s*[✓√xXv*✔]\s*\)\s*Prototype\s+Defense/i.test(rawDT)) {
      result.defenseType = 'prototype';
      result.defenseTypeLabel = 'Prototype Defense';
    } else if (/\(\s*[✓√xXv*✔]\s*\)\s*Proposal\s+Defense/i.test(rawDT)) {
      result.defenseType = 'proposal';
      result.defenseTypeLabel = 'Proposal Defense';
    } else if (/\(\s*[✓√xXv*✔]\s*\)\s*Final\s+Defense/i.test(rawDT)) {
      result.defenseType = 'final';
      result.defenseTypeLabel = 'Final Defense';
    }
  }

  // 4. Number of Rounds
  const roundMatch = text.match(/Number\s+of\s+Rounds:\s*([\s\S]*?)(?=Date\/Time\s+&|$)/i);
  if (roundMatch) {
    const rawR = roundMatch[1].replace(/\s+/g, ' ');
    if (/\(\s*[✓√xXv*✔]\s*\)\s*1\s*st/i.test(rawR)) {
      result.round = '1st';
    } else if (/\(\s*[✓√xXv*✔]\s*\)\s*2\s*nd/i.test(rawR)) {
      result.round = '2nd';
    } else if (/\(\s*[✓√xXv*✔]\s*\)\s*3\s*rd/i.test(rawR)) {
      result.round = '3rd';
    }
  }

  // 5. Date/Time & Venue
  const dtvMatch = text.match(/Date\/Time\s*&\s*Venue:\s*([^\n\r]+)/i);
  if (dtvMatch) {
    const rawDTV = dtvMatch[1].trim();
    result.dateTimeVenue = rawDTV;

    const parts = rawDTV.split(/\|\||\/\//).map((s) => s.trim());
    if (parts.length >= 3) {
      result.defenseDate = parts[0];
      result.defenseTime = parts[1];
      result.venue = parts.slice(2).join(' - ');
    } else if (parts.length === 2) {
      result.defenseDate = parts[0];
      result.venue = parts[1];
    } else {
      result.venue = rawDTV;
    }
  }

  // 6. Adviser
  const adviserMatch = text.match(/Adviser:\s*([^\n\r]+)/i);
  if (adviserMatch) {
    result.adviser = adviserMatch[1].trim();
  }

  // 7. Panel Chair/REC
  const chairMatch = text.match(/Panel\s+Chair(?:\/REC)?:\s*([^\n\r]+)/i);
  if (chairMatch) {
    result.panelChair = chairMatch[1].trim();
  }

  // 8. Panel Members
  const membersMatch = text.match(/Panel\s+Members:\s*([\s\S]*?)(?=Secretary:|$)/i);
  if (membersMatch) {
    result.panelMembers = membersMatch[1]
      .split('\n')
      .map((m) => m.trim())
      .filter((m) => m.length > 0 && !/^page\s+\d+/i.test(m) && !/Document\s+Code:/i.test(m));
  }

  // 9. Secretary
  const secMatch = text.match(/Secretary:\s*([^\n\r]+)/i);
  if (secMatch) {
    result.secretary = secMatch[1].trim();
  }

  // 10. Table of Panel Remarks
  const candidateNames = [
    result.panelChair,
    ...result.panelMembers,
    'Client',
    'Dr. Sales Aribe Jr.',
    'Dr. Sales G. Aribe Jr.',
  ].filter(Boolean);

  const tablePart = text.split(/Name\s+of\s+Panel\s+COMMENTS\/SUGGESTIONS/i);
  if (tablePart.length > 1) {
    const fullTableContent = tablePart
      .slice(1)
      .join('\n')
      .split(/Overall\s+Recommendations:/i)[0];

    const lines = fullTableContent.split('\n');
    let currentPanel = '';
    let currentComments = [];

    const flushCurrent = () => {
      if (currentPanel && currentComments.length > 0) {
        const existing = result.panelRemarks.find(
          (p) => p.panelName.toLowerCase() === currentPanel.toLowerCase(),
        );
        if (existing) {
          existing.comments.push(...currentComments);
        } else {
          result.panelRemarks.push({
            panelName: currentPanel,
            comments: [...currentComments],
          });
        }
        currentComments = [];
      }
    };

    const isBulletStart = (str) => /^(?:[•\-*]|\d+\.)\s*/.test(str.trim());

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;
      if (/Name\s+of\s+Panel\s+COMMENTS\/SUGGESTIONS/i.test(line)) continue;
      if (
        /Document\s+Code:/i.test(line) ||
        /BUKIDNON\s+STATE\s+UNIVERSITY/i.test(line) ||
        /Malaybalay\s+City/i.test(line) ||
        /Tel\(088\)/i.test(line)
      ) {
        continue;
      }

      let foundPanelInLine = null;
      let lineAfterPanel = line;

      // Check client
      if (/^Client\s*(?:Dr\.\s*Sales.*)?/i.test(line) || /^Dr\.\s*Sales\s*Aribe/i.test(line)) {
        foundPanelInLine = 'Dr. Sales Aribe Jr. (Client)';
        lineAfterPanel = line
          .replace(/^(?:Client\s*)?(?:Dr\.\s*Sales\s*Aribe\s*(?:Jr\.)?)?/i, '')
          .trim();
      } else {
        for (const cand of candidateNames) {
          const candParts = cand.split(/[\s,]+/);
          const candRegex = new RegExp(
            `^(?:${cand.replace(/\./g, '\\.')}|${candParts[candParts.length - 1]}|${candParts[0]})`,
            'i',
          );
          if (candRegex.test(line) && !isBulletStart(line)) {
            const match = line.match(/^([^•\-*]+)(.*)$/);
            if (match) {
              foundPanelInLine = match[1].trim();
              lineAfterPanel = match[2].trim();
            } else {
              foundPanelInLine = cand;
              lineAfterPanel = '';
            }
            break;
          }
        }
      }

      if (foundPanelInLine) {
        flushCurrent();
        currentPanel = foundPanelInLine;
        line = lineAfterPanel;
      }

      if (!line) continue;

      const bulletParts = line
        .split(/[•]/)
        .map((b) => b.trim())
        .filter(Boolean);

      if (bulletParts.length > 0 && (line.includes('•') || line.includes(''))) {
        for (const bp of bulletParts) {
          if (bp) currentComments.push(bp);
        }
      } else if (isBulletStart(line)) {
        const clean = line.replace(/^[•\-*]\s*/, '').trim();
        if (clean) currentComments.push(clean);
      } else if (currentComments.length > 0) {
        currentComments[currentComments.length - 1] += ' ' + line;
      } else if (currentPanel) {
        currentComments.push(line);
      }
    }
    flushCurrent();
  }

  // 11. Overall Recommendations
  const recMatch = text.match(/Overall\s+Recommendations:\s*([\s\S]*?)(?=Panel\s+Verdict:|$)/i);
  if (recMatch) {
    result.overallRecommendations = recMatch[1]
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !/Document\s+Code:/i.test(l) && !/BUKIDNON/i.test(l))
      .join(' ')
      .trim();
  }

  // 12. Panel Verdict
  const verdictMatch = text.match(
    /Panel\s+Verdict:\s*([\s\S]*?)(?=JOAN\s+MARIE|Signature\s+over|$)/i,
  );
  if (verdictMatch) {
    const rawV = verdictMatch[1].replace(/\s+/g, ' ');
    if (
      /\(\s*[✓√xXv*✔]\s*\)\s*Approved\s+with\s+Minor/i.test(rawV) ||
      /\bApproved\s+with\s+Minor[^\n(]*\(\s*[✓√xXv*✔]\s*\)/i.test(rawV)
    ) {
      result.panelVerdict = 'approved_with_minor_revisions';
      result.verdictLabel = 'Approved with Minor Revision';
    } else if (
      /\(\s*[✓√xXv*✔]\s*\)\s*Approved\s+with\s+Major/i.test(rawV) ||
      /\bApproved\s+with\s+Major[^\n(]*\(\s*[✓√xXv*✔]\s*\)/i.test(rawV)
    ) {
      result.panelVerdict = 'approved_with_major_revisions';
      result.verdictLabel = 'Approved with Major Revision';
    } else if (
      /\(\s*[✓√xXv*✔]\s*\)\s*Rejected/i.test(rawV) ||
      /\bRejected[^\n(]*\(\s*[✓√xXv*✔]\s*\)/i.test(rawV)
    ) {
      result.panelVerdict = 'rejected';
      result.verdictLabel = 'Rejected';
    }
  }

  // 13. Secretary Signatory Name
  const signMatch = text.match(
    /(?:(?:Approved|Rejected|Revision)[\s\S]*?\n)?([A-Z\s.-]{5,})\s*Signature\s+over\s+Printed\s+Name\s+of\s+Secretary/i,
  );
  if (signMatch) {
    const cleanSignName = signMatch[1]
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s && !/^(?:approved|rejected|revision)/i.test(s))
      .pop();
    if (cleanSignName) {
      result.secretarySignatoryName = cleanSignName.trim();
    }
  }

  if (!result.secretarySignatoryName && result.secretary) {
    result.secretarySignatoryName = result.secretary.toUpperCase();
  }

  // 14. Convert panelRemarks into structured Action Done Matrix (ADM) rows
  const milestoneMap = {
    proposal: 'CAPSTONE_1',
    prototype: 'CAPSTONE_2',
    final: 'CAPSTONE_4',
  };
  const milestone = milestoneMap[result.defenseType] || 'CAPSTONE_2';

  const rows = [];
  for (const panel of result.panelRemarks) {
    for (const comment of panel.comments) {
      if (!comment || comment.trim().length === 0) continue;
      rows.push({
        panelName: panel.panelName,
        suggestion: comment.trim(),
        expectedAction: `Address and resolve: ${comment.trim()}`,
        status: 'pending',
        actionDone: '',
        remarks: '',
        milestone,
      });
    }
  }
  result.admRows = rows;

  return result;
}

export default {
  parseSecretaryMinutesDocument,
};
