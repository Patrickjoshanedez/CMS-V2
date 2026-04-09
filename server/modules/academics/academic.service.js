import Course from './course.model.js';
import Section from './section.model.js';
import AcademicYear from './academicYear.model.js';
import Team from '../teams/team.model.js';
import User from '../users/user.model.js';
import AppError from '../../utils/AppError.js';

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

    const section = await Section.create({
      name: normalizedSection,
      code: data.code.trim().toUpperCase(),
      courseId: data.courseId,
      academicYear: data.academicYear,
      createdBy: instructorId,
    });

    const populatedSection = await Section.findById(section._id).populate('courseId', 'name code');
    return { section: populatedSection };
  }

  async listSections(query) {
    const fallbackEnabled = query.fallback === true;
    const baseFilter = { isActive: true };
    if (query.courseId) baseFilter.courseId = query.courseId;

    const primaryFilter = { ...baseFilter };
    if (query.academicYear) primaryFilter.academicYear = query.academicYear;

    let sections = await Section.find(primaryFilter)
      .sort({ academicYear: -1, name: 1 })
      .populate('courseId', 'name code')
      .lean();

    if (fallbackEnabled && query.academicYear && sections.length === 0) {
      sections = await Section.find(baseFilter)
        .sort({ academicYear: -1, name: 1 })
        .populate('courseId', 'name code')
        .lean();
    }

    return { sections };
  }

  async listAcademicYears() {
    const sectionYears = await Section.distinct('academicYear', { isActive: true });
    const explicitYears = await AcademicYear.distinct('year', { isActive: true });

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
    if (query.sectionId) sectionFilter._id = query.sectionId;

    const sections = await Section.find(sectionFilter)
      .populate('courseId', 'name code')
      .sort({ name: 1 })
      .lean();

    const sectionIds = sections.map((section) => section._id);

    const activeStudents = sectionIds.length
      ? await User.find({
          sectionId: { $in: sectionIds },
          role: 'student',
          isActive: true,
        })
          .select('_id sectionId')
          .lean()
      : [];

    const studentIds = activeStudents.map((student) => student._id);
    const studentSectionById = new Map(
      activeStudents.map((student) => [student._id.toString(), student.sectionId?.toString()]),
    );

    // Include both:
    // 1) Teams explicitly linked to a section
    // 2) Legacy teams missing sectionId but containing section-assigned students
    const teams = sectionIds.length
      ? await Team.find({
          $or: [{ sectionId: { $in: sectionIds } }, { members: { $in: studentIds } }],
        })
          .sort({ createdAt: -1 })
          .populate('leaderId', 'firstName middleName lastName email')
          .populate('members', 'firstName middleName lastName email role sectionId')
          .lean()
      : [];

    // Count students from user assignments so orphaned/non-team students are included.
    const studentCounts = sectionIds.length
      ? await User.aggregate([
          {
            $match: {
              sectionId: { $in: sectionIds },
              role: 'student',
              isActive: true,
            },
          },
          {
            $group: {
              _id: '$sectionId',
              count: { $sum: 1 },
            },
          },
        ])
      : [];

    const studentCountBySection = new Map(
      studentCounts.map((item) => [item._id?.toString(), item.count || 0]),
    );

    const sectionIdSet = new Set(sectionIds.map((id) => id.toString()));
    const teamsBySection = new Map();
    for (const team of teams) {
      let key = team.sectionId?.toString() || null;

      // Fallback mapping for legacy teams without sectionId.
      if (!key || !sectionIdSet.has(key)) {
        for (const member of team.members || []) {
          const memberSectionId =
            member.sectionId?.toString() || studentSectionById.get(member._id?.toString()) || null;
          if (memberSectionId && sectionIdSet.has(memberSectionId)) {
            key = memberSectionId;
            break;
          }
        }
      }

      if (!key || !sectionIdSet.has(key)) continue;
      if (!teamsBySection.has(key)) teamsBySection.set(key, []);
      teamsBySection.get(key).push(team);
    }

    const hierarchy = sections.map((section) => {
      const sectionTeams = teamsBySection.get(section._id.toString()) || [];
      return {
        ...section,
        teams: sectionTeams,
        teamCount: sectionTeams.length,
        studentCount: studentCountBySection.get(section._id.toString()) || 0,
      };
    });

    return { hierarchy };
  }
}

export default new AcademicService();
