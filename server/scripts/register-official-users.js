import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Models
import User from '../modules/users/user.model.js';
import AcademicYear from '../modules/academics/academicYear.model.js';
import Course from '../modules/academics/course.model.js';
import Section from '../modules/academics/section.model.js';
import SystemSettings from '../modules/settings/settings.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/cms_v2';
const DEFAULT_PASSWORD = 'Password123!';

async function registerOfficialRoster() {
  console.log('═'.repeat(70));
  console.log('🏛️ BUKSU CMS-V2: REGISTER OFFICIAL INSTRUCTOR, STUDENTS & FACULTY');
  console.log('═'.repeat(70));
  console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);

  await mongoose.connect(MONGODB_URI);
  console.log(`✅ Connected to DB: ${mongoose.connection.db.databaseName}`);

  // 1. Clean up old placeholder instructor if present
  const removedPlaceholder = await User.deleteOne({ email: 'instructor@buksu.edu.ph' });
  if (removedPlaceholder.deletedCount > 0) {
    console.log('🧹 Removed temporary placeholder account (instructor@buksu.edu.ph)');
  }

  // 2. Resolve Academic Foundation
  const acadYear = await AcademicYear.findOne({ year: '2025-2026' });
  const course = await Course.findOne({ code: 'BSIT' });
  const section = await Section.findOne({ code: 'BSIT-4A' });

  // 3. Register Instructor: Rozanne Tuesday Flores
  console.log('\n👩‍🏫 Registering Instructor: Rozanne Tuesday Flores...');
  let instructor = await User.findOne({ email: 'rozanneflores1@buksu.edu.ph' });
  if (!instructor) {
    instructor = await User.create({
      firstName: 'Rozanne Tuesday',
      middleName: '',
      lastName: 'Flores',
      email: 'rozanneflores1@buksu.edu.ph',
      password: DEFAULT_PASSWORD, // Mongoose pre-save hook handles hashing
      role: 'instructor',
      facultyRole: null,
      studentId: '',
      fieldOfDiscipline: 'Software Engineering',
      section: 'BSIT-4A',
      isVerified: true,
      isActive: true,
      authProvider: 'local',
      panelAssignments: [],
    });
    console.log(`✅ Created Instructor: ${instructor.fullName} (${instructor.email})`);
  } else {
    instructor.password = DEFAULT_PASSWORD;
    instructor.isVerified = true;
    instructor.isActive = true;
    await instructor.save();
    console.log(`ℹ️ Instructor already exists; updated: ${instructor.fullName}`);
  }

  // Update Academic Foundation createdBy to instructor
  if (acadYear) {
    acadYear.createdBy = instructor._id;
    await acadYear.save();
  }
  if (course) {
    course.createdBy = instructor._id;
    await course.save();
  }
  if (section) {
    section.createdBy = instructor._id;
    await section.save();
  }

  // 4. Register Students
  console.log('\n🎓 Registering Students (Lead & Members)...');
  const studentsData = [
    {
      firstName: 'Patrick Josh',
      middleName: 'S.',
      lastName: 'Añedez',
      email: '2301103203@student.buksu.edu.ph',
      studentId: '2301103203',
      isLead: true,
    },
    {
      firstName: 'Throylan',
      middleName: '',
      lastName: 'Antipuesto',
      email: '2301101345@student.buksu.edu.ph',
      studentId: '2301101345',
      isLead: false,
    },
    {
      firstName: 'Steven Joe',
      middleName: '',
      lastName: 'Bautista',
      email: '2301104051@student.buksu.edu.ph',
      studentId: '2301104051',
      isLead: false,
    },
    {
      firstName: 'Chijay',
      middleName: '',
      lastName: 'Canoy',
      email: '2301103201@student.buksu.edu.ph',
      studentId: '2301103201',
      isLead: false,
    },
  ];

  const seededStudents = [];
  for (const s of studentsData) {
    let student = await User.findOne({ email: s.email });
    if (!student) {
      student = await User.create({
        firstName: s.firstName,
        middleName: s.middleName,
        lastName: s.lastName,
        email: s.email,
        password: DEFAULT_PASSWORD,
        role: 'student',
        facultyRole: null,
        studentId: s.studentId,
        fieldOfDiscipline: 'Software Engineering',
        section: 'BSIT-4A',
        sectionId: section?._id || null,
        instructorId: instructor._id,
        isVerified: true,
        isActive: true,
        authProvider: 'local',
        panelAssignments: [],
      });
      console.log(
        `✅ Created Student [${s.isLead ? 'LEAD' : 'MEMBER'}]: ${student.fullName} (${student.email})`,
      );
    } else {
      student.password = DEFAULT_PASSWORD;
      student.isVerified = true;
      student.isActive = true;
      student.sectionId = section?._id || null;
      student.instructorId = instructor._id;
      await student.save();
      console.log(`ℹ️ Student already exists; updated: ${student.fullName}`);
    }
    seededStudents.push(student);
  }

  // 5. Register Faculty Committee Members
  console.log('\n👨‍🏫 Registering Faculty (Adviser, Panelists, Secretary)...');
  const facultyData = [
    {
      firstName: 'Glaiza Mae',
      middleName: '',
      lastName: 'Libe',
      email: 'glaizalibe1@buksu.edu.ph',
      facultyRole: 'adviser',
      title: 'Adviser',
    },
    {
      firstName: 'Louie',
      middleName: '',
      lastName: 'Labastida',
      email: 'louielabastida1@buksu.edu.ph',
      facultyRole: 'panelist',
      title: 'Panel Chair',
    },
    {
      firstName: 'Raul',
      middleName: '',
      lastName: 'Lecaros',
      email: 'raullecaros1@buksu.edu.ph',
      facultyRole: 'panelist',
      title: 'Panel Member 2',
    },
    {
      firstName: 'Joseph',
      middleName: '',
      lastName: 'Abella',
      email: 'josephabella1@buksu.edu.ph',
      facultyRole: 'panelist',
      title: 'Panel Member 3',
    },
    {
      firstName: 'Joan Marie',
      middleName: '',
      lastName: 'Panes',
      email: 'joanpanes1@buksu.edu.ph',
      facultyRole: 'panelist',
      title: 'Committee Secretary',
    },
  ];

  const seededFaculty = [];
  for (const f of facultyData) {
    let fac = await User.findOne({ email: f.email });
    if (!fac) {
      fac = await User.create({
        firstName: f.firstName,
        middleName: f.middleName,
        lastName: f.lastName,
        email: f.email,
        password: DEFAULT_PASSWORD,
        role: 'faculty',
        facultyRole: f.facultyRole,
        studentId: '',
        fieldOfDiscipline: 'Software Engineering',
        isVerified: true,
        isActive: true,
        authProvider: 'local',
        panelAssignments: [],
      });
      console.log(`✅ Created Faculty [${f.title}]: ${fac.fullName} (${fac.email})`);
    } else {
      fac.password = DEFAULT_PASSWORD;
      fac.isVerified = true;
      fac.isActive = true;
      fac.facultyRole = f.facultyRole;
      await fac.save();
      console.log(`ℹ️ Faculty already exists; updated: ${fac.fullName}`);
    }
    seededFaculty.push(fac);
  }

  // 6. Summary Report
  const totalUsers = await User.countDocuments();
  const instructorsCount = await User.countDocuments({ role: 'instructor' });
  const studentsCount = await User.countDocuments({ role: 'student' });
  const facultyCount = await User.countDocuments({ role: 'faculty' });

  console.log('\n' + '═'.repeat(70));
  console.log('📋 ROSTER REGISTRATION SUMMARY');
  console.log('═'.repeat(70));
  console.log(`  Total Users:       ${totalUsers} (Expected: 10)`);
  console.log(`  Instructors:       ${instructorsCount} (Expected: 1)`);
  console.log(`  Students:          ${studentsCount} (Expected: 4)`);
  console.log(`  Faculty Members:   ${facultyCount} (Expected: 5)`);

  console.log('\n🔑 All accounts initialized with default password: ' + DEFAULT_PASSWORD);

  await mongoose.disconnect();
  process.exit(0);
}

registerOfficialRoster().catch((err) => {
  console.error('\n❌ Fatal error registering roster:', err);
  process.exit(1);
});
