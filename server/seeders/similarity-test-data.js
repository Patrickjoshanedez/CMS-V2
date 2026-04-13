/**
 * Seed data for similarity scan testing
 * Contains diverse project proposals for comprehensive testing
 */

import mongoose from 'mongoose';

export const SIMILARITY_TEST_PROJECTS = [
  {
    // Exact match candidate
    title: 'Capstone Management and Plagiarism Checker',
    problemStatement: 'Universities struggle with managing student capstone projects effectively. Current systems lack integration, making it difficult for supervisors to track progress, evaluate work, and detect academic dishonesty.',
    proposedSolution: 'An integrated platform combining capstone project management with advanced plagiarism detection using machine learning algorithms to analyze document similarity in real time.',
    uniqueContribution: 'Real-time plagiarism detection with contextual analysis. Integration of project management and academic integrity tools. AI-powered similarity scoring.',
    expectedImpact: 'Improve academic integrity by 90%. Reduce manual review time by 70%. Enable supervisors to manage 50% more capstone projects.',
    status: 'APPROVED',
    keywords: ['capstone', 'plagiarism', 'academic integrity', 'machine learning'],
  },
  {
    // Partial match: title overlap
    title: 'Capstone Project Progress Tracking System',
    problemStatement: 'Capstone supervisors cannot easily track student progress across multiple projects.',
    proposedSolution: 'Build web dashboard for real-time capstone progress visualization.',
    uniqueContribution: 'Interactive progress timeline and automated alert system.',
    expectedImpact: 'Reduce supervision overhead by 40%.',
    status: 'APPROVED',
    keywords: ['capstone', 'tracking', 'dashboard'],
  },
  {
    // Partial match: problemStatement overlap
    title: 'Academic Integrity Enforcement Platform',
    problemStatement: 'Universities struggle with academic dishonesty. Current plagiarism detection tools are expensive and inefficient, making comprehensive checking impossible for large institutions.',
    proposedSolution: 'Open-source plagiarism detection system with community-contributed detectors.',
    uniqueContribution: 'Decentralized plagiarism detection network.',
    expectedImpact: 'Make plagiarism detection accessible to all institutions.',
    status: 'PENDING',
    keywords: ['plagiarism', 'academic dishonesty', 'detection'],
  },
  {
    // Thematic match: AI/ML
    title: 'AI Smart Archive Discovery',
    problemStatement: 'Researchers struggle to find similar academic work in institutional archives. Manual searching is time-consuming and often misses relevant papers.',
    proposedSolution: 'Use machine learning to automatically discover related research papers based on semantic similarity.',
    uniqueContribution: 'Novel transformer-based semantic search algorithm optimized for academic archives.',
    expectedImpact: 'Reduce research discovery time by 60%. Increase citation discovery accuracy by 40%.',
    status: 'ARCHIVED',
    keywords: ['artificial intelligence', 'machine learning', 'semantic search', 'archive'],
  },
  {
    // Completely different
    title: 'Smart Traffic Management System',
    problemStatement: 'Urban areas suffer from severe traffic congestion affecting commuter productivity and environmental health.',
    proposedSolution: 'Deploy AI-driven adaptive traffic light system with real-time optimization using sensor networks.',
    uniqueContribution: 'Novel reinforcement learning approach for traffic signal timing.',
    expectedImpact: 'Reduce average commute time by 30%. Decrease vehicle emissions by 20%.',
    status: 'APPROVED',
    keywords: ['traffic', 'optimization', 'artificial intelligence', 'urban'],
  },
  {
    // Healthcare domain
    title: 'Smart Health Monitoring Wearable',
    problemStatement: 'Patients cannot effectively monitor their health metrics in real time. Current wearables lack integration with healthcare providers.',
    proposedSolution: 'Build IoT wearable device with cloud integration for continuous health monitoring and provider alerts.',
    uniqueContribution: 'Advanced multi-sensor fusion algorithm. Blockchain-based medical records.',
    expectedImpact: 'Enable preventive healthcare. Reduce hospital readmission by 35%.',
    status: 'APPROVED',
    keywords: ['health', 'wearable', 'IoT', 'medical'],
  },
  {
    // Healthcare analytics
    title: 'Healthcare Data Analytics Platform',
    problemStatement: 'Healthcare providers lack actionable insights from patient data. Data is siloed across departments.',
    proposedSolution: 'Centralized analytics platform for healthcare data with real-time dashboards.',
    uniqueContribution: 'HIPAA-compliant data warehouse. Predictive analytics for patient outcomes.',
    expectedImpact: 'Improve treatment outcomes by 25%. Reduce operational costs by 15%.',
    status: 'PENDING',
    keywords: ['healthcare', 'analytics', 'data', 'prediction'],
  },
  {
    // Blockchain voting
    title: 'Blockchain-Based Secure Voting System',
    problemStatement: 'Traditional voting systems are vulnerable to fraud and lack transparency. Election integrity is hard to verify.',
    proposedSolution: 'Decentralized voting using blockchain technology with cryptographic verification.',
    uniqueContribution: 'Zero-knowledge proof voting. On-chain transparency with voter privacy.',
    expectedImpact: 'Ensure election security. Eliminate voter fraud. Increase voter confidence by 90%.',
    status: 'APPROVED',
    keywords: ['blockchain', 'voting', 'security', 'cryptography'],
  },
  {
    // E-learning platform
    title: 'Adaptive E-Learning Recommendation Engine',
    problemStatement: 'Students struggle with personalized learning paths. One-size-fits-all curriculum does not accommodate different learning styles.',
    proposedSolution: 'AI-powered recommendation engine that personalizes learning content based on student performance and learning style.',
    uniqueContribution: 'Multi-modal learning style detection. Collaborative filtering for course recommendations.',
    expectedImpact: 'Improve student engagement by 50%. Increase course completion rate by 40%.',
    status: 'APPROVED',
    keywords: ['education', 'artificial intelligence', 'learning', 'recommendation'],
  },
  {
    // Supply chain
    title: 'Supply Chain Transparency using IoT',
    problemStatement: 'Supply chains lack visibility. Companies cannot track goods in real time, leading to inefficiencies and fraud.',
    proposedSolution: 'Deploy IoT sensors and blockchain for end-to-end supply chain tracking.',
    uniqueContribution: 'Real-time IoT tracking with immutable blockchain records.',
    expectedImpact: 'Reduce supply chain costs by 20%. Improve delivery time by 25%. Eliminate counterfeit products.',
    status: 'ARCHIVED',
    keywords: ['supply chain', 'IoT', 'blockchain', 'tracking'],
  },
  {
    // Gaming
    title: 'Game Development Studio Management Software',
    problemStatement: 'Game studios struggle with project management across distributed teams. Existing tools are not designed for game-specific workflows.',
    proposedSolution: 'Custom project management tool with game development-specific features.',
    uniqueContribution: 'Asset management integration. Real-time collaboration for designers and programmers.',
    expectedImpact: 'Reduce development time by 30%. Improve team coordination.',
    status: 'PENDING',
    keywords: ['gaming', 'project management', 'software'],
  },
  {
    // Environmental
    title: 'Climate Change Impact Prediction Model',
    problemStatement: 'Governments lack accurate climate models for regional planning. Current models have high uncertainty.',
    proposedSolution: 'Deep learning model for regional climate prediction using historical data.',
    uniqueContribution: 'Novel attention mechanism for temporal climate data. Regional downscaling.',
    expectedImpact: 'Improve climate prediction accuracy by 40%. Enable proactive climate adaptation.',
    status: 'APPROVED',
    keywords: ['climate', 'prediction', 'machine learning', 'environmental'],
  },
  {
    // Cybersecurity
    title: 'Zero-Trust Network Security Architecture',
    problemStatement: 'Traditional network security relies on perimeter defense which is increasingly insufficient.',
    proposedSolution: 'Implement zero-trust security model with continuous authentication.',
    uniqueContribution: 'Behavioral biometrics for continuous user authentication. Micro-segmentation engine.',
    expectedImpact: 'Reduce security breaches by 80%. Minimize lateral movement attacks.',
    status: 'APPROVED',
    keywords: ['security', 'cybersecurity', 'network', 'authentication'],
  },
  {
    // Mental health
    title: 'Mental Health Support Chatbot Platform',
    problemStatement: 'Mental health services are inaccessible and expensive. Long wait times discourage people from seeking help.',
    proposedSolution: 'AI chatbot for mental health support with escalation to licensed therapists.',
    uniqueContribution: 'Empathetic conversational AI. Crisis detection and emergency routing.',
    expectedImpact: 'Provide mental health support to 1M+ users. Reduce therapy wait times.',
    status: 'PENDING',
    keywords: ['mental health', 'artificial intelligence', 'chatbot', 'support'],
  },
  {
    // Farming/Agriculture
    title: 'Precision Agriculture IoT Platform',
    problemStatement: 'Farmers make irrigation and pesticide decisions based on guesswork, leading to wasted resources.',
    proposedSolution: 'IoT sensor network with ML-powered recommendations for optimal farming conditions.',
    uniqueContribution: 'Satellite imagery analysis for crop health. Automated irrigation control.',
    expectedImpact: 'Reduce water usage by 40%. Increase crop yield by 35%. Lower pesticide usage.',
    status: 'APPROVED',
    keywords: ['agriculture', 'IoT', 'precision farming', 'machine learning'],
  },
  {
    // Energy
    title: 'Smart Grid Energy Distribution System',
    problemStatement: 'Power grids are inefficient and inflexible. Renewable energy integration is challenging.',
    proposedSolution: 'Smart grid software coordinating distributed energy resources.',
    uniqueContribution: 'Demand forecasting with neural networks. Real-time load balancing.',
    expectedImpact: 'Reduce energy waste by 30%. Enable 70% renewable integration.',
    status: 'APPROVED',
    keywords: ['energy', 'smart grid', 'renewable', 'optimization'],
  },
];

export async function seedSimilarityTestProjects() {
  const db = mongoose.connection.db;
  const collection = db.collection('projects');

  // Clear existing test data
  await collection.deleteMany({ keywords: { $exists: true } });

  // Insert seed projects
  const docsToInsert = SIMILARITY_TEST_PROJECTS.map(project => ({
    ...project,
    _id: new mongoose.Types.ObjectId(),
    teamId: new mongoose.Types.ObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const result = await collection.insertMany(docsToInsert);
  console.log(`✓ Seeded ${result.insertedIds.length} projects for similarity testing`);
  return result.insertedIds;
}

export default SIMILARITY_TEST_PROJECTS;
