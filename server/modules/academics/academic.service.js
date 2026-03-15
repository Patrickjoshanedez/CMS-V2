import Course from './course.model.js';
import Section from './section.model.js';
import AcademicYear from './academicYear.model.js';
import Team from '../teams/team.model.js';
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

    const section = await Section.create({
      name: data.name,
      courseId: data.courseId,
      academicYear: data.academicYear,
      createdBy: instructorId,
    });

    const populatedSection = await Section.findById(section._id).populate('courseId', 'name code');
    return { section: populatedSection };
  }

  async listSections(query) {
    const filter = { isActive: true };
    if (query.courseId) filter.courseId = query.courseId;
    if (query.academicYear) filter.academicYear = query.academicYear;

    const sections = await Section.find(filter)
      .sort({ academicYear: -1, name: 1 })
      .populate('courseId', 'name code')
      .lean();

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

    const teamFilter = { sectionId: { $in: sectionIds } };
    const teams = sectionIds.length
      ? await Team.find(teamFilter)
          .sort({ createdAt: -1 })
          .populate('leaderId', 'firstName middleName lastName email')
          .populate('members', 'firstName middleName lastName email role')
          .lean()
      : [];

    const teamsBySection = new Map();
    for (const team of teams) {
      const key = team.sectionId?.toString();
      if (!key) continue;
      if (!teamsBySection.has(key)) teamsBySection.set(key, []);
      teamsBySection.get(key).push(team);
    }

    const hierarchy = sections.map((section) => {
      const sectionTeams = teamsBySection.get(section._id.toString()) || [];
      return {
        ...section,
        teams: sectionTeams,
        teamCount: sectionTeams.length,
        studentCount: sectionTeams.reduce((total, team) => total + (team.members?.length || 0), 0),
      };
    });

    return { hierarchy };
  }
}

export default new AcademicService();
