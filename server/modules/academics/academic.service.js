import Course from './course.model.js';
import Section from './section.model.js';
import AcademicYear from './academicYear.model.js';
import Team from '../teams/team.model.js';
import User from '../users/user.model.js';
import Project from '../projects/project.model.js';
import AppError from '../../utils/AppError.js';
import { inferCapstoneCourseFromSection, resolveCapstoneCurriculumMeta } from '@cms/shared';

class AcademicService {
  async createCourse(instructorId, data) {
    const normalizedCode = data.code.trim().toUpperCase();

    const existing = await Course.findOne({ code: normalizedCode });
    if (existing) {
      throw new AppError('Course code already exists.', 409, 'DUPLICATE_COURSE');
    }

    const course = await Course.create({
      name: data.name,
      code: normalizedCode,
      createdBy: instructorId,
    });

    return { course };
  }

  async listCourses() {
    const courses = await Course.find({ isActive: true }).sort({ name: 1 }).lean();
    return { courses };
  }

  async createSection(instructorId, data) {
    const course = await Course.findOne({ _id: data.courseId, isActive: true });
    if (!course) {
      throw new AppError('Course not found.', 404, 'COURSE_NOT_FOUND');
    }

    const normalizedSection = (data.section || data.name || '').trim().toUpperCase();
    const normalizedCode = data.code.trim().toUpperCase();
    const resolvedTerm =
      data.academicTerm || (data.capstoneCourse === 2 ? '2nd Semester' : '1st Semester');
    const resolvedCapstoneCourse =
      data.capstoneCourse ?? inferCapstoneCourseFromSection(normalizedSection, resolvedTerm);

    const section = await Section.create({
      name: normalizedSection,
      code: normalizedCode,
      courseId: data.courseId,
      academicYear: data.academicYear,
      academicTerm: resolvedTerm,
      capstoneCourse: resolvedCapstoneCourse,
      createdBy: instructorId,
    });

    const populatedSection = await Section.findById(section._id).populate('courseId', 'name code');
    return { section: populatedSection };
  }

  async listSections(query) {
    const fallbackEnabled = query.fallback === true;
    const baseFilter = { isActive: true };
    if (query.courseId) baseFilter.courseId = query.courseId;
    if (query.academicTerm) baseFilter.academicTerm = query.academicTerm;
    if (query.capstoneCourse) baseFilter.capstoneCourse = Number(query.capstoneCourse);

    const primaryFilter = { ...baseFilter };
    if (query.academicYear) primaryFilter.academicYear = query.academicYear;

    let sections = await Section.find(primaryFilter)
      .sort({ academicYear: -1, academicTerm: 1, name: 1, code: 1 })
      .populate('courseId', 'name code')
      .lean();

    if (fallbackEnabled && query.academicYear && sections.length === 0) {
      sections = await Section.find(baseFilter)
        .sort({ academicYear: -1, academicTerm: 1, name: 1, code: 1 })
        .populate('courseId', 'name code')
        .lean();
    }

    return { sections };
  }

  async listAcademicYears() {
    const [sectionYears, explicitYears] = await Promise.all([
      Section.distinct('academicYear', { isActive: true }),
      AcademicYear.distinct('year', { isActive: true }),
    ]);

    // Merge them and delete duplicates just in case there are years used in sections but not explicitly created
    const years = [...new Set([...sectionYears, ...explicitYears])];
    years.sort((a, b) => b.localeCompare(a));

    return { academicYears: years };
  }

  async createAcademicYear(instructorId, data) {
    const existing = await AcademicYear.findOne({ year: data.year });
    if (existing) {
      throw new AppError('Academic year already exists.', 409, 'DUPLICATE_YEAR');
    }

    const yearDoc = await AcademicYear.create({
      year: data.year,
      createdBy: instructorId,
    });

    return { academicYear: yearDoc.year };
  }

  async getHierarchy(query) {
    const sectionFilter = { isActive: true };
    if (query.courseId) sectionFilter.courseId = query.courseId;
    if (query.academicYear) sectionFilter.academicYear = query.academicYear;
    if (query.academicTerm) sectionFilter.academicTerm = query.academicTerm;
    if (query.sectionId) sectionFilter._id = query.sectionId;

    const sections = await Section.find(sectionFilter)
      .populate('courseId', 'name code')
      .sort({ name: 1, academicTerm: 1, code: 1 })
      .lean();

    const sectionIds = sections.map((section) => section._id);

    const activeStudents = sectionIds.length
      ? await User.find({
          sectionId: { $in: sectionIds },
          role: 'student',
          isActive: true,
        })
          .select(
            '_id firstName middleName lastName email role studentId academicTerm sectionId instructorId teamId isVerified isActive createdAt',
          )
          .populate('instructorId', 'firstName middleName lastName email')
          .lean()
      : [];

    const studentIds = activeStudents.map((student) => student._id);
    const studentSectionById = new Map(
      activeStudents.map((student) => [student._id.toString(), student.sectionId?.toString()]),
    );
    const studentsBySection = new Map();
    for (const student of activeStudents) {
      const secKey = student.sectionId?.toString();
      if (!secKey) continue;
      if (!studentsBySection.has(secKey)) studentsBySection.set(secKey, []);
      studentsBySection.get(secKey).push(student);
    }

    // Include both:
    // 1) Teams explicitly linked to a section or enrolled via capstoneEnrollments
    // 2) Legacy teams missing sectionId but containing section-assigned students
    const teams = sectionIds.length
      ? await Team.find({
          $or: [
            { sectionId: { $in: sectionIds } },
            { 'capstoneEnrollments.sectionId': { $in: sectionIds } },
            { members: { $in: studentIds } },
          ],
        })
          .sort({ createdAt: -1 })
          .populate('leaderId', 'firstName middleName lastName email studentId')
          .populate({
            path: 'members',
            select:
              'firstName middleName lastName email role studentId academicTerm sectionId instructorId isVerified isActive createdAt',
            populate: { path: 'instructorId', select: 'firstName middleName lastName email' },
          })
          .populate('adviserId', 'firstName middleName lastName email')
          .lean()
      : [];

    // Derive section student counts directly in-memory from activeStudents (eliminating redundant DB aggregation)
    const studentCountBySection = new Map(
      Array.from(studentsBySection.entries()).map(([secId, list]) => [secId, list.length]),
    );

    const sectionIdSet = new Set(sectionIds.map((id) => id.toString()));
    const teamsBySection = new Map();
    for (const team of teams) {
      const matchedSectionKeys = new Set();
      const primaryKey = team.sectionId?.toString() || null;
      if (primaryKey && sectionIdSet.has(primaryKey)) {
        matchedSectionKeys.add(primaryKey);
      }

      for (const enrollment of team.capstoneEnrollments || []) {
        const enrolledSecId = enrollment?.sectionId?.toString();
        if (enrolledSecId && sectionIdSet.has(enrolledSecId)) {
          matchedSectionKeys.add(enrolledSecId);
        }
      }

      // Fallback mapping for legacy teams without sectionId.
      if (matchedSectionKeys.size === 0) {
        for (const member of team.members || []) {
          const memberSectionId =
            member.sectionId?.toString() || studentSectionById.get(member._id?.toString()) || null;
          if (memberSectionId && sectionIdSet.has(memberSectionId)) {
            matchedSectionKeys.add(memberSectionId);
            break;
          }
        }
      }

      for (const key of matchedSectionKeys) {
        if (!teamsBySection.has(key)) teamsBySection.set(key, []);
        teamsBySection.get(key).push(team);
      }
    }

    const teamIds = teams.map((t) => t._id);
    const projects = teamIds.length
      ? await Project.find({ teamId: { $in: teamIds } })
          .select('teamId title stage workflowPhase capstonePhase titleStatus projectStatus')
          .lean()
      : [];

    const projectByTeamId = new Map(projects.map((p) => [p.teamId?.toString(), p]));

    const hierarchy = sections.map((section) => {
      const resolvedCapstoneCourse =
        section.capstoneCourse ??
        inferCapstoneCourseFromSection(section.name, section.academicTerm);
      const curriculumMeta = resolveCapstoneCurriculumMeta(resolvedCapstoneCourse);

      const sectionTeams = (teamsBySection.get(section._id.toString()) || []).map((team) => {
        const proj = projectByTeamId.get(team._id.toString());
        const roleByUserId = new Map(
          (team.memberRoles || []).map((mr) => [mr.userId?.toString(), mr.role]),
        );
        const enrichedMembers = (team.members || []).map((member) => ({
          ...member,
          teamRole: roleByUserId.get(member._id?.toString()) || null,
          isLeader: team.leaderId?._id?.toString() === member._id?.toString(),
        }));
        return {
          ...team,
          members: enrichedMembers,
          assignment: {
            projectId: proj?._id || null,
            title: proj?.title || null,
            stage: proj?.stage || null,
            workflowPhase: proj?.workflowPhase || null,
            capstonePhase: proj?.capstonePhase || resolvedCapstoneCourse || null,
            titleStatus: proj?.titleStatus || null,
            projectStatus: proj?.projectStatus || null,
          },
        };
      });

      const rawSectionStudents = studentsBySection.get(section._id.toString()) || [];
      return {
        ...section,
        academicTerm: section.academicTerm || curriculumMeta?.academicTerm || '1st Semester',
        capstoneCourse: resolvedCapstoneCourse,
        curriculumLabel: curriculumMeta?.curriculumLabel || null,
        teams: sectionTeams,
        students: rawSectionStudents,
        teamCount: sectionTeams.length,
        studentCount: studentCountBySection.get(section._id.toString()) || 0,
      };
    });

    return { hierarchy };
  }
}

export default new AcademicService();
