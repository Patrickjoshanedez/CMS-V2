import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../modules/users/user.model.js';
import Team from '../modules/teams/team.model.js';
import Project from '../modules/projects/project.model.js';
import Section from '../modules/academics/section.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/cms_v2';
const DEFAULT_PASSWORD = 'Password123!';

const seededAccounts = [
  {
    email: 'instructor@student.buksu.edu.ph',
    firstName: 'Patrick Josh',
    middleName: 'S.',
    lastName: 'Añedez',
    role: 'instructor',
    title: 'Instructor / Coordinator',
    capabilities: [
      'Defense Scheduling',
      'Classes Management',
      'Reports Generation',
      'Archive Management',
      'Rubrics Configuration',
      'User Management',
      'Activity Log Review',
    ],
  },
  {
    email: 'adviser@student.buksu.edu.ph',
    firstName: 'Leon',
    middleName: '',
    lastName: 'Mentor',
    role: 'adviser',
    facultyRole: 'adviser',
    title: 'Faculty Adviser',
    capabilities: ['Advisee Reviews', 'Consultations Log', 'Tier 1 ADM Digital Signature'],
  },
  {
    email: 'panelchair@student.buksu.edu.ph',
    firstName: 'Steven Joe',
    middleName: '',
    lastName: 'Bautista',
    role: 'panelist',
    facultyRole: 'panelist',
    title: 'Faculty Panel Chair',
    capabilities: ['Panel Reviews', 'Defense Hearing Scoring', 'Tier 2 ADM Digital Signature'],
  },
  {
    email: 'student@student.buksu.edu.ph',
    firstName: 'Bennettchristiangeofferdon',
    middleName: '',
    lastName: 'Student',
    role: 'student',
    title: 'Student (Team Alpha Lead)',
    targetTeam: 'Team Alpha',
    capabilities: ['Team Lead', 'Capstone 1 (Approved Title)', 'Chapter Submissions & Revisions'],
  },
  {
    email: 'student2@student.buksu.edu.ph',
    firstName: 'John Jethro',
    middleName: '',
    lastName: 'Israel',
    role: 'student',
    title: 'Student (Team Beta Lead)',
    targetTeam: 'Team Beta',
    capabilities: ['Team Lead', 'Capstone 1 (Submitted Proposal pending hearing)'],
  },
  {
    email: 'student3@student.buksu.edu.ph',
    firstName: 'Gabriel',
    middleName: 'Mark',
    lastName: 'Diaz',
    role: 'student',
    title: 'Student (Team Gamma Lead)',
    targetTeam: 'Team Gamma',
    capabilities: ['Team Lead', 'Phase 0 (Open Roster, assembling 4-member team)'],
  },
  {
    email: 'student4@student.buksu.edu.ph',
    firstName: 'Clarisse',
    middleName: 'Anne',
    lastName: 'Reyes',
    role: 'student',
    title: 'Student (Team Alpha Member)',
    targetTeam: 'Team Alpha',
    capabilities: ['Team Member', 'Frontend & UI/UX Developer', 'Capstone Submissions'],
  },
  {
    email: 'secretary@student.buksu.edu.ph',
    firstName: 'Elena',
    middleName: 'R.',
    lastName: 'Mendoza',
    role: 'faculty',
    facultyRole: 'panelist',
    title: 'Defense Secretary',
    capabilities: ['Defense Minutes', 'Secretary Compliance Verification Gate', 'ADM Endorsement'],
  },
  {
    email: 'panelist2@student.buksu.edu.ph',
    firstName: 'Marco',
    middleName: 'L.',
    lastName: 'Villanueva',
    role: 'faculty',
    facultyRole: 'panelist',
    title: 'Faculty Panelist 2',
    capabilities: ['Panel Reviews', 'Defense Hearing Scoring', 'Tier 2 ADM Digital Signature'],
  },
  {
    email: 'panelist3@student.buksu.edu.ph',
    firstName: 'Clarissa',
    middleName: 'D.',
    lastName: 'Navarro',
    role: 'faculty',
    facultyRole: 'panelist',
    title: 'Faculty Panelist 3',
    capabilities: ['Panel Reviews', 'Defense Hearing Scoring', 'Tier 2 ADM Digital Signature'],
  },
  {
    email: 'dean@student.buksu.edu.ph',
    firstName: 'Roberto',
    middleName: 'C.',
    lastName: 'Santos',
    role: 'faculty',
    facultyRole: 'adviser',
    title: 'Dean / Institutional Signatory',
    capabilities: ['Tier 3 ADM Digital Signature', 'Institutional Oversight', 'Reports Review'],
  },
];

async function seedCanonicalAccounts() {
  console.log('======================================================================');
  console.log('🌱 BukSU CMS-V2 Canonical Role-Based User Seeder (v2)');
  console.log('======================================================================');
  console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB successfully.');

  const sectionA = await Section.findOne({ name: { $regex: /Section A|BSIT 4-A/i } });
  const sectionB = await Section.findOne({ name: { $regex: /Section B|BSIT 4-B/i } });

  const createdMap = new Map();

  for (const acc of seededAccounts) {
    let user = await User.findOne({ email: acc.email });

    const userPayload = {
      firstName: acc.firstName,
      middleName: acc.middleName || '',
      lastName: acc.lastName,
      email: acc.email,
      role: acc.role,
      facultyRole: acc.facultyRole || null,
      password: DEFAULT_PASSWORD,
      isActive: true,
      isVerified: true,
      authProvider: 'local',
      sectionId: acc.targetTeam === 'Team Beta' ? sectionB?._id || sectionA?._id : sectionA?._id,
    };

    if (user) {
      console.log(
        `🔄 Updating existing user: ${acc.email} (${acc.fullName || `${acc.firstName} ${acc.lastName}`})`,
      );
      user.set(userPayload);
      await user.save();
    } else {
      console.log(`✨ Creating user: ${acc.email} (${acc.firstName} ${acc.lastName})`);
      user = await User.create(userPayload);
    }

    createdMap.set(acc.email, user);
  }

  // Bind student leads to their respective teams and projects
  const teamAlpha = await Team.findOne({ name: 'Team Alpha' });
  const teamBeta = await Team.findOne({ name: 'Team Beta' });
  const teamGamma = await Team.findOne({ name: 'Team Gamma' });

  const student1 = createdMap.get('student@student.buksu.edu.ph');
  const student2 = createdMap.get('student2@student.buksu.edu.ph');
  const student3 = createdMap.get('student3@student.buksu.edu.ph');
  const student4 = createdMap.get('student4@student.buksu.edu.ph');
  const adviser = createdMap.get('adviser@student.buksu.edu.ph');
  const secretary = createdMap.get('secretary@student.buksu.edu.ph');
  const panelChair = createdMap.get('panelchair@student.buksu.edu.ph');
  const panelist2 = createdMap.get('panelist2@student.buksu.edu.ph');
  const panelist3 = createdMap.get('panelist3@student.buksu.edu.ph');

  if (teamAlpha && student1) {
    student1.teamId = teamAlpha._id;
    await student1.save();

    if (student4) {
      student4.teamId = teamAlpha._id;
      await student4.save();
    }

    teamAlpha.leaderId = student1._id;
    if (!teamAlpha.members.some((m) => m.equals(student1._id))) {
      teamAlpha.members[0] = student1._id;
    }
    if (student4 && !teamAlpha.members.some((m) => m.equals(student4._id))) {
      if (teamAlpha.members.length < 4) {
        teamAlpha.members.push(student4._id);
      } else {
        teamAlpha.members[1] = student4._id;
      }
    }
    if (adviser) teamAlpha.adviserId = adviser._id;
    if (secretary) teamAlpha.secretaryId = secretary._id;
    teamAlpha.panelistIds = [panelChair?._id, panelist2?._id, panelist3?._id].filter(Boolean);
    await teamAlpha.save();
    console.log('✅ Team Alpha bound to student, student4, adviser, secretary & 3 panelists');

    const projectAlpha = await Project.findOne({ teamId: teamAlpha._id });
    if (projectAlpha) {
      if (adviser) projectAlpha.adviserId = adviser._id;
      projectAlpha.panelists = [
        panelChair && { userId: panelChair._id, role: 'chair' },
        panelist2 && { userId: panelist2._id, role: 'member' },
        panelist3 && { userId: panelist3._id, role: 'member' },
        secretary && { userId: secretary._id, role: 'secretary' },
      ].filter(Boolean);
      await projectAlpha.save();
      console.log('✅ Project Alpha adviser, secretary, and 3 panelists bound.');
    }
  }

  if (teamBeta && student2) {
    student2.teamId = teamBeta._id;
    await student2.save();

    teamBeta.leaderId = student2._id;
    if (!teamBeta.members.some((m) => m.equals(student2._id))) {
      teamBeta.members[0] = student2._id;
    }
    await teamBeta.save();
    console.log('✅ Team Beta bound to student2@student.buksu.edu.ph');
  }

  if (teamGamma && student3) {
    student3.teamId = teamGamma._id;
    await student3.save();

    teamGamma.leaderId = student3._id;
    if (!teamGamma.members.some((m) => m.equals(student3._id))) {
      teamGamma.members[0] = student3._id;
    }
    await teamGamma.save();
    console.log('✅ Team Gamma bound to student3@student.buksu.edu.ph');
  }

  console.log('\n======================================================================');
  console.log('🎉 CANONICAL ROLE-BASED ACCOUNTS SEEDED SUCCESSFULLY!');
  console.log('======================================================================');
  console.log(`Universal Default Password: ${DEFAULT_PASSWORD}\n`);
  for (const acc of seededAccounts) {
    console.log(
      `   📧 ${acc.email.padEnd(35)} | ${acc.title.padEnd(30)} | ${acc.firstName} ${acc.lastName}`,
    );
  }
  console.log('======================================================================\n');

  await mongoose.disconnect();
  console.log('📡 Disconnected from MongoDB.');
  process.exit(0);
}

seedCanonicalAccounts().catch((err) => {
  console.error('❌ Seeding failed with error:', err);
  process.exit(1);
});
