import projectCoreService from './services/projectCore.service.js';
import projectTitleService from './services/projectTitle.service.js';
import projectCommitteeService from './services/projectCommittee.service.js';
import projectDefenseService from './services/projectDefense.service.js';
import projectArchiveService from './services/projectArchive.service.js';

/**
 * ProjectService Facade
 * Unified facade orchestrating 5 focused domain sub-services:
 * - projectDefenseService: Defense scheduling & schedule queries
 * - projectArchiveService: Archiving, archive search, certificates, reports, manuscripts
 * - projectCommitteeService: Adviser/panelist/secretary appointments & committee notifications
 * - projectTitleService: Title proposals, similarity checks, approvals, comments, modifications
 * - projectCoreService: Project drafts, CRUD, deadlines, status, phases, prototypes, external links
 */
class ProjectService {
  // ── Project Defense Domain ──
  async scheduleDefense(...args) {
    return projectDefenseService.scheduleDefense(...args);
  }

  async getDefenseSchedule(...args) {
    return projectDefenseService.getDefenseSchedule(...args);
  }

  // ── Project Archive Domain ──
  async archiveProject(...args) {
    return projectArchiveService.archiveProject(...args);
  }

  async tryAutoArchiveProject(...args) {
    return projectArchiveService.tryAutoArchiveProject(...args);
  }

  async getApprovalSheetUrl(...args) {
    return projectArchiveService.getApprovalSheetUrl(...args);
  }

  async searchArchive(...args) {
    return projectArchiveService.searchArchive(...args);
  }

  async uploadCertificate(...args) {
    return projectArchiveService.uploadCertificate(...args);
  }

  async getCertificateUrl(...args) {
    return projectArchiveService.getCertificateUrl(...args);
  }

  async verifyCertificate(...args) {
    return projectArchiveService.verifyCertificate(...args);
  }

  async generateReport(...args) {
    return projectArchiveService.generateReport(...args);
  }

  async _computeArchiveSimilarityAudit(...args) {
    return projectArchiveService._computeArchiveSimilarityAudit(...args);
  }

  async bulkUploadArchive(...args) {
    return projectArchiveService.bulkUploadArchive(...args);
  }

  async getProjectManuscript(...args) {
    return projectArchiveService.getProjectManuscript(...args);
  }

  async _extractArchiveSubmissionText(...args) {
    return projectArchiveService._extractArchiveSubmissionText(...args);
  }

  async _generateFallbackManuscriptPdf(...args) {
    return projectArchiveService._generateFallbackManuscriptPdf(...args);
  }

  // ── Project Committee Domain ──
  async assignAdviser(...args) {
    return projectCommitteeService.assignAdviser(...args);
  }

  async assignPanelist(...args) {
    return projectCommitteeService.assignPanelist(...args);
  }

  async removePanelist(...args) {
    return projectCommitteeService.removePanelist(...args);
  }

  async assignSecretary(...args) {
    return projectCommitteeService.assignSecretary(...args);
  }

  async removeSecretary(...args) {
    return projectCommitteeService.removeSecretary(...args);
  }

  async selectAsPanelist(...args) {
    return projectCommitteeService.selectAsPanelist(...args);
  }

  async _notifyAdviser(...args) {
    return projectCommitteeService._notifyAdviser(...args);
  }

  async _notifyCommittee(...args) {
    return projectCommitteeService._notifyCommittee(...args);
  }

  // ── Project Title Domain ──
  async checkTitleSimilarity(...args) {
    return projectTitleService.checkTitleSimilarity(...args);
  }

  async updateTitle(...args) {
    return projectTitleService.updateTitle(...args);
  }

  async submitTitle(...args) {
    return projectTitleService.submitTitle(...args);
  }

  async approveTitle(...args) {
    return projectTitleService.approveTitle(...args);
  }

  async rejectTitle(...args) {
    return projectTitleService.rejectTitle(...args);
  }

  async addTitleComment(...args) {
    return projectTitleService.addTitleComment(...args);
  }

  async reviseAndResubmit(...args) {
    return projectTitleService.reviseAndResubmit(...args);
  }

  async requestTitleModification(...args) {
    return projectTitleService.requestTitleModification(...args);
  }

  async resolveTitleModification(...args) {
    return projectTitleService.resolveTitleModification(...args);
  }

  async evaluatePostApprovalUnlocks(...args) {
    return projectTitleService.evaluatePostApprovalUnlocks(...args);
  }

  async _assertCanReviewTitle(...args) {
    return projectTitleService._assertCanReviewTitle(...args);
  }

  _assertPlagiarismCleared(...args) {
    return projectTitleService._assertPlagiarismCleared(...args);
  }

  _normalizeTitleProposals(...args) {
    return projectTitleService._normalizeTitleProposals(...args);
  }

  // ── Project Core Domain ──
  async getCreateProjectDraft(...args) {
    return projectCoreService.getCreateProjectDraft(...args);
  }

  async saveCreateProjectDraft(...args) {
    return projectCoreService.saveCreateProjectDraft(...args);
  }

  async clearCreateProjectDraft(...args) {
    return projectCoreService.clearCreateProjectDraft(...args);
  }

  async createProject(...args) {
    return projectCoreService.createProject(...args);
  }

  async _createSoloTeamForStudent(...args) {
    return projectCoreService._createSoloTeamForStudent(...args);
  }

  _normalizeProjectADMPhase(...args) {
    return projectCoreService._normalizeProjectADMPhase(...args);
  }

  async getProject(...args) {
    return projectCoreService.getProject(...args);
  }

  async getMyProject(...args) {
    return projectCoreService.getMyProject(...args);
  }

  async listProjects(...args) {
    return projectCoreService.listProjects(...args);
  }

  async setDeadlines(...args) {
    return projectCoreService.setDeadlines(...args);
  }

  async rejectProject(...args) {
    return projectCoreService.rejectProject(...args);
  }

  async advancePhase(...args) {
    return projectCoreService.advancePhase(...args);
  }

  async advanceAfterADMCompletion(...args) {
    return projectCoreService.advanceAfterADMCompletion(...args);
  }

  async getPhaseExitBlocker(...args) {
    return projectCoreService.getPhaseExitBlocker(...args);
  }

  async addPrototype(...args) {
    return projectCoreService.addPrototype(...args);
  }

  async removePrototype(...args) {
    return projectCoreService.removePrototype(...args);
  }

  async getPrototypes(...args) {
    return projectCoreService.getPrototypes(...args);
  }

  async updateGanttChartUrl(...args) {
    return projectCoreService.updateGanttChartUrl(...args);
  }

  async updateGanttPlan(...args) {
    return projectCoreService.updateGanttPlan(...args);
  }

  async updateSystemDefenseApproval(...args) {
    return projectCoreService.updateSystemDefenseApproval(...args);
  }

  async updateDemoVideoUrl(...args) {
    return projectCoreService.updateDemoVideoUrl(...args);
  }

  async updateGithubRepoUrl(...args) {
    return projectCoreService.updateGithubRepoUrl(...args);
  }

  async updateGoogleDocUrl(...args) {
    return projectCoreService.updateGoogleDocUrl(...args);
  }

  async updateExternalLinks(...args) {
    return projectCoreService.updateExternalLinks(...args);
  }

  async updateGanttApproval(...args) {
    return projectCoreService.updateGanttApproval(...args);
  }

  async updateWeeklyCheckIn(...args) {
    return projectCoreService.updateWeeklyCheckIn(...args);
  }

  async reviewWeeklyCheckIn(...args) {
    return projectCoreService.reviewWeeklyCheckIn(...args);
  }

  async reviewWeeklyCheckInWaiver(...args) {
    return projectCoreService.reviewWeeklyCheckInWaiver(...args);
  }

  async _getProjectOrFail(...args) {
    return projectCoreService._getProjectOrFail(...args);
  }

  async _assertTeamLeader(...args) {
    return projectCoreService._assertTeamLeader(...args);
  }

  async _assertTeamMember(...args) {
    return projectCoreService._assertTeamMember(...args);
  }

  async _notifyTeamMembers(...args) {
    return projectCoreService._notifyTeamMembers(...args);
  }

  async _notifyInstructors(...args) {
    return projectCoreService._notifyInstructors(...args);
  }
}

export default new ProjectService();
