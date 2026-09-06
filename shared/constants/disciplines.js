/**
 * BukSU IT Department — Standardized IT Fields of Discipline
 * Aligned with CHED CMO 25 s. 2015 (Policies, Standards, and Guidelines for BSIT)
 * and institutional Capstone specializations.
 */
export const IT_DISCIPLINES = Object.freeze([
  {
    id: 'se_web',
    name: 'Software Engineering & Web Applications',
    domain: 'Software Engineering',
    description:
      'Full-stack web applications, microservices, progressive web apps, and enterprise systems.',
  },
  {
    id: 'ai_ml',
    name: 'Artificial Intelligence & Machine Learning',
    domain: 'Intelligent Systems',
    description: 'Predictive models, deep learning, NLP, computer vision, and cognitive computing.',
  },
  {
    id: 'net_sec',
    name: 'Networking & Cybersecurity',
    domain: 'Infrastructure & Security',
    description:
      'Network infrastructure, intrusion detection, penetration testing, and zero-trust architectures.',
  },
  {
    id: 'data_sci',
    name: 'Data Science & Analytics',
    domain: 'Data Engineering',
    description:
      'Big data analytics, business intelligence dashboards, statistical modeling, and data pipelines.',
  },
  {
    id: 'iot_embedded',
    name: 'IoT & Embedded Systems',
    domain: 'Hardware & Automation',
    description: 'Smart sensor networks, microcontroller automation, telemetry, and edge devices.',
  },
  {
    id: 'mobile_app',
    name: 'Mobile Application Development',
    domain: 'Mobile Computing',
    description: 'Native and cross-platform mobile apps for Android and iOS systems.',
  },
  {
    id: 'cloud_dist',
    name: 'Cloud Computing & Distributed Systems',
    domain: 'Cloud Infrastructure',
    description:
      'Serverless architectures, container orchestration, multi-cloud platforms, and virtualization.',
  },
  {
    id: 'health_inf',
    name: 'Health Informatics & Telemedicine',
    domain: 'Applied Informatics',
    description:
      'Electronic health records (EHR), clinical decision support, and remote patient monitoring.',
  },
  {
    id: 'agri_tech',
    name: 'Agri-Tech & Smart Farming Systems',
    domain: 'Applied Informatics',
    description:
      'Precision agriculture, soil/crop telemetry, automated irrigation, and farm management systems.',
  },
  {
    id: 'gis_spatial',
    name: 'Geographic Information Systems (GIS) & Spatial Analytics',
    domain: 'Spatial Computing',
    description:
      'Geospatial mapping, location-based intelligence, disaster risk modeling, and urban planning.',
  },
  {
    id: 'ed_tech',
    name: 'Educational Technology & E-Learning Platforms',
    domain: 'Applied Informatics',
    description:
      'Learning management systems (LMS), interactive pedagogical tools, and academic tracking.',
  },
  {
    id: 'erp_bis',
    name: 'Enterprise Resource Planning & Business Information Systems',
    domain: 'Information Systems',
    description:
      'Supply chain management, inventory systems, financial accounting, and CRM platforms.',
  },
  {
    id: 'cyber_phys',
    name: 'Cyber-Physical Systems & Robotics',
    domain: 'Hardware & Automation',
    description:
      'Automated robotics, industrial control systems (ICS/SCADA), and mechatronic systems.',
  },
  {
    id: 'game_dev',
    name: 'Game Development & Interactive Media',
    domain: 'Interactive Computing',
    description: '2D/3D games, serious games, gamification engines, and AR/VR virtual simulations.',
  },
  {
    id: 'hci_uiux',
    name: 'Human-Computer Interaction & UI/UX Systems',
    domain: 'Interactive Computing',
    description:
      'Accessible interfaces, usability engineering, assistive technologies, and adaptive UX.',
  },
  {
    id: 'blockchain_fintech',
    name: 'Blockchain & FinTech Systems',
    domain: 'Financial Technologies',
    description:
      'Decentralized ledgers, smart contracts, payment processing, and digital asset tracking.',
  },
  {
    id: 'egov_public',
    name: 'E-Governance & Public Sector Information Systems',
    domain: 'Public Administration',
    description:
      'Citizen portals, digital registry systems, municipal workflow automation, and transparency tools.',
  },
  {
    id: 'infosec_forensics',
    name: 'Information Security & Digital Forensics',
    domain: 'Infrastructure & Security',
    description:
      'Forensic evidence gathering, malware analysis, security audit automation, and threat intelligence.',
  },
]);

export const IT_DISCIPLINE_NAMES = Object.freeze(IT_DISCIPLINES.map((d) => d.name));

export const getDisciplineByNameOrId = (val) => {
  if (!val) return null;
  const str = String(val).toLowerCase().trim();
  return IT_DISCIPLINES.find((d) => d.name.toLowerCase() === str || d.id.toLowerCase() === str);
};
