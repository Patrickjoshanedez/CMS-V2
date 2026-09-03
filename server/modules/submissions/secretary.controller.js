import { extractText } from '../../utils/extractText.js';
import Project from '../projects/project.model.js';
import Notification from '../notifications/notification.model.js';
import { emitToUser } from '../../services/socket.service.js';
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
 * Extract secretary defense minutes PDF to structured Action Done Matrix (ADM)
 * using local Ollama instance or deterministic fallback.
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

    // 2. Feed to Local Ollama Instance using structured JSON formatting prompt
    let parsedData = [];
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const ollamaModel = process.env.PDF_METADATA_GLM_MODEL || 'llama3.2:3b';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${ollamaHost}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          prompt: `Analyze the following BukSU Capstone Defense Minutes text and extract panel suggestions into a structured JSON array of ADM rows.
Text to analyze: "${rawText.slice(0, 4000)}"

Respond ONLY with a valid JSON array, containing objects with these exact keys:
- panelName: (String, e.g., "Louie Jay Labastida", "Raul Lecaros", "Joseph Abella")
- suggestion: (String, the core technical correction suggested)
- expectedAction: (String, how the developers should address this)

Do not include any Markdown tags, preambles, or postscripts. Return raw JSON.`,
          stream: false,
          format: 'json',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        const responseText = json?.response || '';
        const parsed = JSON.parse(responseText);
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
    } catch (ollamaErr) {
      // Graceful fallback to regex/heuristic line extraction if Ollama is offline or times out
      parsedData = fallbackParseMinutes(rawText);
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
    });
  } catch (err) {
    next(err);
  }
};

export default {
  extractMinutesToADM,
};
