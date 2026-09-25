import { extractText } from '../../utils/extractText.js';
import { parseSecretaryMinutesDocument } from './secretaryMinutesParser.js';
import Project from '../projects/project.model.js';
import DefenseMinutes from './defenseMinutes.model.js';
import Notification from '../notifications/notification.model.js';
import { emitToUser, emitToRoom } from '../../services/socket.service.js';
import AppError from '../../utils/AppError.js';
import env from '../../config/env.js';

/**
 * Fallback parser when Ollama is unavailable or returns non-JSON text.
 * Parses lines looking for Panelist names and bulleted remarks/suggestions.
 */
function fallbackParseMinutes(rawText) {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const rows = [];
  let currentPanel = 'Panel Member';

  for (const line of lines) {
    if (/(?:panel|panelist|chair|member|dr\.|prof\.|engr\.)/i.test(line) && line.length < 50) {
      currentPanel = line.replace(/[:-]/g, '').trim();
      continue;
    }

    if (
      line.startsWith('-') ||
      line.startsWith('•') ||
      line.startsWith('*') ||
      /^\d+\./.test(line)
    ) {
      const cleanSuggestion = line.replace(/^[-•*\d.]+\s*/, '').trim();
      if (cleanSuggestion.length > 5) {
        rows.push({
          panelName: currentPanel,
          suggestion: cleanSuggestion,
          expectedAction: `Address and resolve: ${cleanSuggestion}`,
          status: 'pending',
          actionDone: '',
          remarks: '',
        });
      }
    }
  }

  if (rows.length === 0 && rawText.trim().length > 0) {
    rows.push({
      panelName: 'Defense Committee',
      suggestion: rawText.slice(0, 300),
      expectedAction: 'Review defense minutes remarks and execute necessary revisions.',
      status: 'pending',
      actionDone: '',
      remarks: '',
    });
  }

  return rows;
}

/**
 * Scan uploaded secretary minutes document (PDF/DOCX/OCR) and return
 * structured, autofillable Form OVPAA-F-INS-032 fields.
 */
export const scanSecretaryMinutes = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No defense minutes file uploaded.' });
    }

    let rawText = '';
    try {
      rawText = await extractText(req.file.buffer, req.file.mimetype || 'application/pdf');
    } catch (parseErr) {
      return res.status(400).json({
        success: false,
        message: `Failed to extract text from document: ${parseErr.message}`,
      });
    }

    const parsedDocument = parseSecretaryMinutesDocument(rawText);

    return res.status(200).json({
      success: true,
      message: 'Secretary minutes scanned and parsed successfully.',
      data: parsedDocument,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Extract secretary defense minutes PDF to structured Action Done Matrix (ADM)
 * using high-precision parser with local Ollama fallback.
 */
export const extractMinutesToADM = async (req, res, next) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'Project ID is required.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No defense minutes PDF uploaded.' });
    }

    // 1. Extract text from uploaded file buffer
    let rawText = '';
    try {
      rawText = await extractText(req.file.buffer, req.file.mimetype || 'application/pdf');
    } catch (parseErr) {
      return res.status(400).json({
        success: false,
        message: `Failed to extract text from PDF: ${parseErr.message}`,
      });
    }

    // 2. High-precision institutional parser for OVPAA-F-INS-032
    const parsedDocument = parseSecretaryMinutesDocument(rawText);
    let parsedData = parsedDocument.admRows || [];

    // Fallback to Ollama or heuristic if parsedData is empty
    if (!parsedData || parsedData.length === 0) {
      const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
      const ollamaModel = process.env.PDF_METADATA_GLM_MODEL || 'llama3.2:3b';

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${ollamaHost}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            prompt: `Analyze the following BukSU Capstone Defense Minutes text and extract panel suggestions into a structured JSON array of ADM rows: "${rawText.slice(0, 3000)}"`,
            stream: false,
            format: 'json',
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const json = await response.json();
          const parsed = JSON.parse(json?.response || '[]');
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsedData = parsed.map((item) => ({
              panelName: item.panelName || 'Defense Panelist',
              suggestion: item.suggestion || item.comment || 'Revision required',
              expectedAction: item.expectedAction || item.action || 'Address committee remarks',
              status: 'pending',
              actionDone: '',
              remarks: '',
            }));
          }
        }
      } catch {
        parsedData = fallbackParseMinutes(rawText);
      }
    }

    if (!parsedData || parsedData.length === 0) {
      parsedData = fallbackParseMinutes(rawText);
    }

    // 3. Update the Project Document's ADM array field
    const project = await Project.findByIdAndUpdate(
      projectId,
      {
        $set: {
          actionDoneMatrix: parsedData,
          admStatus: 'pending_developer_action',
        },
      },
      { new: true },
    );

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    try {
      const team = await (await import('../teams/team.model.js')).default.findById(project.teamId);
      if (team?.members?.length > 0) {
        const notifications = team.members.map((memberId) => ({
          userId: memberId,
          type: 'minutes_uploaded',
          title: 'Defense Minutes & Action Done Matrix Ready',
          message: `Defense minutes for "${project.title}" have been uploaded. Action Done Matrix items are ready for your action.`,
          metadata: { projectId: project._id, admStatus: project.admStatus },
        }));
        const createdNotifs = await Notification.insertMany(notifications);
        createdNotifs.forEach((n) => emitToUser(n.userId, 'notification:new', n));
      }
    } catch {
      // Non-blocking notification dispatch
    }

    return res.status(200).json({
      success: true,
      message: 'Defense minutes processed. ADM staging environment generated successfully.',
      actionDoneMatrix: project.actionDoneMatrix,
      admStatus: project.admStatus,
      parsedMinutes: parsedDocument,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Save / Synchronize Secretary Minutes Form into Project ADM & Defense Minutes.
 */
export const saveSecretaryMinutes = async (req, res, next) => {
  try {
    const { projectId } = req.body;
    const { minutesData, syncToADM = true } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, message: 'Project ID is required.' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const milestoneMap = {
      proposal: 'CAPSTONE_1',
      prototype: 'CAPSTONE_2',
      final: 'CAPSTONE_4',
    };
    const milestone =
      minutesData?.milestone || milestoneMap[minutesData?.defenseType] || 'CAPSTONE_2';

    // 1. Save Secretary Minutes Document Model to Project
    if (minutesData) {
      project.secretaryMinutes = minutesData;
      if (!project.secretaryMinutesByMilestone) {
        project.secretaryMinutesByMilestone = {};
      }
      project.secretaryMinutesByMilestone[milestone] = minutesData;
      if (typeof project.markModified === 'function') {
        project.markModified('secretaryMinutes');
        project.markModified('secretaryMinutesByMilestone');
      }

      // 2. Consistent Digital Signature with ADM
      if (minutesData.signature?.signed) {
        const secSig = {
          endorsed: true,
          endorsedAt: minutesData.signature.signedAt || new Date(),
          signatoryName:
            minutesData.signature.signatoryName ||
            minutesData.secretarySignatoryName ||
            minutesData.secretary ||
            'Committee Secretary',
          notes:
            minutesData.overallRecommendations ||
            'Official Secretary Minutes verified and digitally signed.',
          signatureDataUrl: minutesData.signature.signatureDataUrl || null,
          userId: req.user?._id || minutesData.signature.userId || null,
        };

        if (!project.admSignatures) {
          project.admSignatures = { adviser: {}, instructor: {}, panelists: [], chair: {} };
        }
        project.admSignatures.secretary = secSig;

        if (!project.admSignaturesByMilestone) {
          project.admSignaturesByMilestone = {};
        }
        const targetMilestoneKey = milestone === 'CAPSTONE_4' ? 'CAPSTONE_3' : milestone; // ADM milestones are CAPSTONE_1, 2, 3
        if (!project.admSignaturesByMilestone[targetMilestoneKey]) {
          project.admSignaturesByMilestone[targetMilestoneKey] = {
            adviser: {},
            instructor: {},
            panelists: [],
            chair: {},
          };
        }
        project.admSignaturesByMilestone[targetMilestoneKey].secretary = secSig;

        if (typeof project.markModified === 'function') {
          project.markModified('admSignatures');
          project.markModified('admSignaturesByMilestone');
        }

        try {
          emitToRoom(`project:${project._id}`, 'adm:endorsed', {
            projectId: project._id,
            milestone: targetMilestoneKey,
            admSignatures: project.admSignatures,
            admSignaturesByMilestone: project.admSignaturesByMilestone,
          });
        } catch {
          // non-fatal
        }
      }
    }

    // 3. Convert panelRemarks into ADM rows if requested
    if (syncToADM && Array.isArray(minutesData?.panelRemarks)) {
      const targetMilestoneKey = milestone === 'CAPSTONE_4' ? 'CAPSTONE_3' : milestone;
      const admRows = [];
      for (const panel of minutesData.panelRemarks) {
        const panelName = panel.panelName || 'Committee Panelist';
        const comments = Array.isArray(panel.comments)
          ? panel.comments
          : [panel.comments].filter(Boolean);
        for (const comm of comments) {
          if (!comm || !comm.trim()) continue;
          admRows.push({
            panelName,
            suggestion: comm.trim(),
            expectedAction: `Address and resolve: ${comm.trim()}`,
            status: 'pending',
            actionDone: '',
            remarks: '',
            milestone: targetMilestoneKey,
          });
        }
      }

      if (admRows.length > 0) {
        project.actionDoneMatrix = admRows;
        project.admStatus = 'pending_developer_action';
        if (typeof project.markModified === 'function') {
          project.markModified('actionDoneMatrix');
        }
      }
    }

    await project.save();

    try {
      emitToRoom(`project:${project._id}`, 'defense:minutes_updated', {
        projectId: project._id,
        secretaryMinutes: project.secretaryMinutes,
        actionDoneMatrix: project.actionDoneMatrix,
      });
    } catch {
      // non-fatal
    }

    return res.status(200).json({
      success: true,
      message: 'Secretary minutes saved and synchronized successfully.',
      secretaryMinutes: project.secretaryMinutes,
      actionDoneMatrix: project.actionDoneMatrix,
      admStatus: project.admStatus,
      admSignatures: project.admSignatures,
    });
  } catch (err) {
    next(err);
  }
};

export default {
  scanSecretaryMinutes,
  extractMinutesToADM,
  saveSecretaryMinutes,
};
