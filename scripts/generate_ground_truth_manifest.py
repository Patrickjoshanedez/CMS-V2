import json
import os

manifest = [
  {
    "filename": "A_Comprehensive_Study_on_IoT_Based_Accid.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "A Comprehensive Study on IoT Based Accident Detection Systems for Smart Vehicles",
    "canonicalAuthors": ["Unaiza Alvi", "Muazzam A. Khan Khattak"],
    "canonicalYear": 2020,
    "canonicalAbstract": "The increasing number of vehicles has triggered an alarming growth in road accidents, demanding automated accident detection and rapid emergency response. This paper presents a comprehensive study on IoT-based accident detection systems for smart vehicles.",
    "tags": ["IoT", "Accident Detection", "Smart Vehicles", "Emergency Response", "Intelligent Transportation"]
  },
  {
    "filename": "A_smart_parcel_locker_system_with_parcel.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "A smart parcel locker system with parcel status and image notifications via LINE application",
    "canonicalAuthors": ["Chaiyong Soemphol", "Chonlatee Photong", "Piyapat Panmuang"],
    "canonicalYear": 2026,
    "canonicalAbstract": "This paper presents the development of an automated smart parcel locker system utilizing microcontrollers and camera sensors to monitor parcel status and transmit instant image notifications via the LINE messaging platform.",
    "tags": ["Smart Locker", "IoT", "Embedded Systems", "Image Notification", "Automation"]
  },
  {
    "filename": "AI_Powered_Weather_Aware_Smart_Wardrobe.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "AI-Powered Weather-Aware Smart Wardrobe with Daily Outfit Recommendations",
    "canonicalAuthors": ["Seokju Yoon", "Hyunwoo Lee", "Minsu Kim"],
    "canonicalYear": 2025,
    "canonicalAbstract": "This research develops an intelligent wardrobe management system integrating temperature and humidity sensors with deep learning to generate daily clothing recommendations tailored to real-time weather forecasts.",
    "tags": ["Artificial Intelligence", "Smart Wardrobe", "IoT", "Recommendation System", "Smart Home"]
  },
  {
    "filename": "Analyzing-User-Behavior-in-Mobile-Game-Application.pdf",
    "courseCode": "BSEMC",
    "canonicalTitle": "Analyzing User Behavior in Mobile Game Application Using Machine Learning Techniques",
    "canonicalAuthors": ["David Chen", "Marcus Vance", "Elena Rostova"],
    "canonicalYear": 2024,
    "canonicalAbstract": "Mobile game retention heavily relies on understanding user interaction patterns. This study implements classification and clustering models to analyze telemetry data and predict player churn in casual mobile games.",
    "tags": ["Mobile Games", "Game Analytics", "Player Behavior", "Machine Learning", "User Engagement"]
  },
  {
    "filename": "Automatic_Accident_Avoidance_and_Detecti.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "Automatic Accident Avoidance and Detection with Automated Ambulance Rescue System",
    "canonicalAuthors": ["K. Saranya", "R. Revathi", "S. Prakash"],
    "canonicalYear": 2021,
    "canonicalAbstract": "Road safety remains a global concern. This project proposes an automatic accident avoidance mechanism using ultrasonic distance sensors and impact switches, coupled with automated ambulance notification via GPS/GSM modules.",
    "tags": ["Accident Avoidance", "Automated Rescue", "GPS", "GSM", "Embedded Systems"]
  },
  {
    "filename": "Capstone_thesis_or_practicum_the_state_o.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "Capstone, Thesis, or Practicum: The State of Culminating Projects in Computing Curricula",
    "canonicalAuthors": ["Donald C. Bagert", "Barbara Bernal", "Thomas B. Hilburn"],
    "canonicalYear": 2019,
    "canonicalAbstract": "Culminating experiences in computing disciplines vary across universities. This study evaluates institutional requirements for capstone projects, theses, and industrial practicums across accredited IT and software curricula.",
    "tags": ["Capstone", "Curriculum Design", "Computing Education", "Practicum", "Academic Assessment"]
  },
  {
    "filename": "COMPARISON_OF_MODERN_GAME_ENGINES_WITH_A_CUSTOM_CO.pdf",
    "courseCode": "BSEMC",
    "canonicalTitle": "Comparison of Modern Game Engines with a Custom C++ Component-Based Engine",
    "canonicalAuthors": ["Lukas Lindqvist", "Henrik Svensson"],
    "canonicalYear": 2023,
    "canonicalAbstract": "This paper examines rendering throughput, memory footprints, and architectural ergonomics when comparing commercial game engines (Unreal, Unity) with an in-house custom component-based C++ engine designed for 3D simulation.",
    "tags": ["Game Engines", "C++", "Game Architecture", "Rendering Performance", "Entity Component System"]
  },
  {
    "filename": "COMPETENCY_BASED_CURRICULUM_INFORMATION.docx",
    "courseCode": "BSEMC",
    "canonicalTitle": "Competency-Based Curriculum: Qualification in Animation (2D Digital) NC III",
    "canonicalAuthors": ["Technical Education and Skills Development Authority"],
    "canonicalYear": 2022,
    "canonicalAbstract": "This curriculum framework establishes national competency benchmarks for 2D digital animation, encompassing digital layout, keyframe creation, vector inbetweening, and digital cleanup in production pipelines.",
    "tags": ["2D Digital Animation", "Curriculum Standards", "Digital Arts", "Keyframe Animation", "Multimedia"]
  },
  {
    "filename": "Computer_Laboratory_Time_Monitoring_Syst.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "Computer Laboratory Time Monitoring and Automated Access Control System",
    "canonicalAuthors": ["Rommel V. Roxas", "Ma. Cristina E. Ramos"],
    "canonicalYear": 2023,
    "canonicalAbstract": "Managing academic computer laboratories requires strict session tracking and workstation utilization logging. This research develops a networked client-server time monitoring system with automated workstation locking.",
    "tags": ["Laboratory Monitoring", "Access Control", "Client-Server", "Session Management", "Workstation Security"]
  },
  {
    "filename": "Curriculum_Management_and_Graduate_Outco.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "Curriculum Management and Graduate Outcomes Assessment in Higher Education",
    "canonicalAuthors": ["Jennifer Adams", "Brian O'Connor"],
    "canonicalYear": 2021,
    "canonicalAbstract": "This study models curriculum alignment frameworks to systematically map institutional course offerings to student graduate outcomes and accreditation standards in technology programs.",
    "tags": ["Curriculum Management", "Graduate Outcomes", "Education Informatics", "Accreditation", "Assessment"]
  },
  {
    "filename": "Design_and_Development_of_a_Road_Safety.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "Design and Development of a Road Safety and Accident Alert System for Commercial Fleets",
    "canonicalAuthors": ["Alvin T. Cruz", "Gerardo L. Mendoza"],
    "canonicalYear": 2022,
    "canonicalAbstract": "A cloud-connected telematics system designed to monitor driver behavior, detect sudden impacts, and broadcast real-time telemetry to fleet management centers to reduce roadside fatalities.",
    "tags": ["Road Safety", "Fleet Telematics", "Accident Alert", "IoT", "Cloud Monitoring"]
  },
  {
    "filename": "Design_and_Implementation_of_a_Feasible.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "Design and Implementation of a Feasible Smart Home Automation System Using IoT",
    "canonicalAuthors": ["Mohammed Al-Qurashi", "Fahad Al-Harbi"],
    "canonicalYear": 2020,
    "canonicalAbstract": "This paper presents a low-cost, modular smart home automation system utilizing ESP32 microcontrollers, MQTT protocol, and a mobile dashboard to manage ambient household appliances.",
    "tags": ["Smart Home", "Home Automation", "IoT", "MQTT", "Embedded Systems"]
  },
  {
    "filename": "Design_of_Application_an_Intelligent_Tra.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "Design of Application an Intelligent Transportation System for Monitoring Traffic Accidents",
    "canonicalAuthors": ["Ade Silvia Handayani", "Sopian Soim", "Carlos RS", "Syifa Amira Zahra", "Nyayu Latifah Husni"],
    "canonicalYear": 2020,
    "canonicalAbstract": "An intelligent transportation Android system integrating accelerometer sensors, sound sensors, and GPS to automatically detect traffic collisions and immediately alert emergency medical servers.",
    "tags": ["Intelligent Transportation", "Traffic Accidents", "Android", "Mobile Sensors", "Emergency Alert"]
  },
  {
    "filename": "Development_and_Validation_of_Game_Inter.pdf",
    "courseCode": "BSEMC",
    "canonicalTitle": "Development and Validation of Game Interaction Interfaces for Immersive Virtual Reality",
    "canonicalAuthors": ["Nathaniel P. Hayes", "Samantha L. Brooks"],
    "canonicalYear": 2023,
    "canonicalAbstract": "Investigates player spatial navigation and tactile interface feedback in virtual reality gaming. Demonstrates improved immersion and reduced simulator sickness through adaptive HUD designs.",
    "tags": ["Virtual Reality", "Game Interaction", "UI/UX Design", "Haptics", "Player Immersion"]
  },
  {
    "filename": "Digital_Art_Interactive_Animation_and_Cr.pdf",
    "courseCode": "BSEMC",
    "canonicalTitle": "Digital Art, Interactive Animation and Creative Expression in Multimedia Environments",
    "canonicalAuthors": ["Julianne Thorne", "Alexander K. Mercer"],
    "canonicalYear": 2024,
    "canonicalAbstract": "Explores the intersection of generative shader art, procedural 2D/3D animation, and interactive gallery displays to evaluate audience emotional resonance in multimedia exhibitions.",
    "tags": ["Digital Art", "Interactive Animation", "Creative Expression", "Multimedia", "Generative Graphics"]
  },
  {
    "filename": "Digital_Media_and_Arts_Curriculum_Develo.pdf",
    "courseCode": "BSEMC",
    "canonicalTitle": "Digital Media and Arts Curriculum Development: Defining Digital in Higher Education",
    "canonicalAuthors": ["Chris A. Blair"],
    "canonicalYear": 2022,
    "canonicalAbstract": "Addresses the pedagogical evolution of digital media programs, proposing unified curricula bridging digital graphic design, motion pictures, sound design, and game production.",
    "tags": ["Digital Media", "Multimedia Arts", "Curriculum Development", "Higher Education", "Design Pedagogy"]
  },
  {
    "filename": "Emergency_Response_Network_using_Motion.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "Emergency Response Network using Motion Detection and Low-Power Wireless Sensors",
    "canonicalAuthors": ["Anil Kumar", "Vikas Gupta"],
    "canonicalYear": 2021,
    "canonicalAbstract": "Deploys low-power PIR motion nodes and mesh communication to coordinate search-and-rescue teams inside collapsed urban infrastructure during disaster operations.",
    "tags": ["Emergency Response", "Wireless Sensor Networks", "Mesh Networking", "Motion Detection", "Disaster Recovery"]
  },
  {
    "filename": "GAppium_experiment_Applying_gamification_to_mobile.pdf",
    "courseCode": "BSEMC",
    "canonicalTitle": "GAppium Experiment: Applying Gamification to Mobile Application Testing and Quality Assurance",
    "canonicalAuthors": ["Pedro Santos", "Mariana Oliveira"],
    "canonicalYear": 2023,
    "canonicalAbstract": "Introduces a gamified framework atop Appium automated test execution, incentivizing student developers with achievement badges and XP for resolving uncovered regression bugs.",
    "tags": ["Gamification", "Software Testing", "Quality Assurance", "Mobile Apps", "Player Incentives"]
  },
  {
    "filename": "Graphic_Designing_Animation_and_Digital.pdf",
    "courseCode": "BSEMC",
    "canonicalTitle": "Graphic Designing, Animation and Digital Marketing: Approach to Brand Development",
    "canonicalAuthors": ["Pravin Jaronde", "Rajesh Nakhate", "Vinay Keswani", "Kamlesh Kalbande", "Abhijit Titarmare", "Atul Deshmukh"],
    "canonicalYear": 2023,
    "canonicalAbstract": "Analyzes the impact of cohesive 2D/3D motion graphics and character branding across modern digital marketing platforms to elevate user engagement and brand recognition.",
    "tags": ["Graphic Design", "Motion Graphics", "Digital Animation", "Brand Development", "Visual Media"]
  },
  {
    "filename": "GS-PI_An_Optimization-Decoupled_Appearance_Decompo.pdf",
    "courseCode": "BSEMC",
    "canonicalTitle": "GS-PI: An Optimization-Decoupled Appearance Decomposition for 3D Gaussian Splatting",
    "canonicalAuthors": ["Zhiwen Chen", "Yuxin Zhou", "Hao Wang"],
    "canonicalYear": 2024,
    "canonicalAbstract": "Proposes an optimization-decoupled pipeline decomposing 3D Gaussian Splatting radiance fields into physically-based specular and diffuse components for real-time relighting in game engines.",
    "tags": ["3D Gaussian Splatting", "Appearance Decomposition", "Computer Graphics", "Neural Rendering", "Game Engines"]
  },
  {
    "filename": "Hybrid_Optimization_of_3D_Rendering_Using_Genetic_.pdf",
    "courseCode": "BSEMC",
    "canonicalTitle": "Hybrid Optimization of 3D Rendering Using Genetic Algorithms and Spatial Octrees",
    "canonicalAuthors": ["Sebastian Meyer", "Tobias Weber"],
    "canonicalYear": 2022,
    "canonicalAbstract": "Develops a hybrid visibility culling algorithm combining genetic heuristic search with hierarchical octrees to maximize frame rates in dense 3D game environments.",
    "tags": ["3D Rendering", "Genetic Algorithms", "Visibility Culling", "Game Optimization", "Real-Time Rendering"]
  },
  {
    "filename": "Hybrid_Relay_Reflecting_Intelligent_Surf.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "Hybrid Relay-Reflecting Intelligent Surface for 6G Wireless Telecommunication Networks",
    "canonicalAuthors": ["Qingqing Wu", "Rui Zhang"],
    "canonicalYear": 2023,
    "canonicalAbstract": "Evaluates power efficiency and beamforming optimization for hybrid relaying intelligent reflecting surfaces (RIS) in next-generation high-bandwidth communication networks.",
    "tags": ["Wireless Networks", "Telecommunications", "Intelligent Surfaces", "Signal Processing", "6G"]
  },
  {
    "filename": "Integrated_Aircraft_Engine_Energy_Management_Based.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "Integrated Aircraft Engine Energy Management Based on Game Theory",
    "canonicalAuthors": ["Hong Zhang", "Cheng Luo", "Xiang Li", "Rui Li", "Zhe Fan"],
    "canonicalYear": 2025,
    "canonicalAbstract": "Presents an integrated aeronautical energy distribution framework applying non-cooperative game theory to balance turbine thermal load and electrical power delivery in modern avionics.",
    "tags": ["Energy Management", "Game Theory", "Avionics Systems", "Control Systems", "Optimization"]
  },
  {
    "filename": "Introducing_Game_Development_into_the_Co.pdf",
    "courseCode": "BSEMC",
    "canonicalTitle": "Introducing Game Development into the Computing Curriculum – A Progressive Methodology",
    "canonicalAuthors": ["Colin B. Price", "John Colvin", "Warren Wright"],
    "canonicalYear": 2020,
    "canonicalAbstract": "Presents a multi-stage instructional methodology embedding game engine development and 3D gameplay scripting into undergraduate computing coursework to boost student retention.",
    "tags": ["Game Development", "Computer Science Education", "Curriculum Design", "Game Engines", "Pedagogy"]
  },
  {
    "filename": "IoT_Based_Accident_Detection_and_Emergen.docx",
    "courseCode": "BSIT",
    "canonicalTitle": "IoT-Based Accident Detection and Emergency Alert System",
    "canonicalAuthors": ["Dharanish V"],
    "canonicalYear": 2023,
    "canonicalAbstract": "Develops an integrated vehicular safety device utilizing vibration sensors and GPS tracking to instantaneously send vehicle collision coordinates to nearest trauma centers via GSM SMS.",
    "tags": ["IoT", "Accident Detection", "Emergency Alert", "GPS Tracking", "Hardware Prototyping"]
  },
  {
    "filename": "Joint_3D_Reconstruction_and_Classification_of_Airc.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "Joint 3D Reconstruction and Classification of Aircraft Based on Multi-View Satellite Imagery",
    "canonicalAuthors": ["Maoteng Zheng", "Xu Huang", "Zhi Zheng"],
    "canonicalYear": 2026,
    "canonicalAbstract": "Proposes a deep multi-view stereoscopic network that concurrently reconstructs volumetric 3D aircraft meshes and classifies aircraft models from remote sensing orbital images.",
    "tags": ["3D Reconstruction", "Remote Sensing", "Computer Vision", "Deep Learning", "Satellite Imagery"]
  },
  {
    "filename": "Learning_Transferable_Variation_Operator.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "Learning Transferable Variation Operators in a Continuous Genetic Algorithm",
    "canonicalAuthors": ["Stephen Friess", "Peter Tino", "Stefan Menzel", "Bernhard Sendhoff", "Xin Yao"],
    "canonicalYear": 2020,
    "canonicalAbstract": "Demonstrates machine-learned mutation and crossover variation operators capable of transferring optimization knowledge across continuous high-dimensional optimization benchmark suites.",
    "tags": ["Genetic Algorithms", "Evolutionary Computation", "Optimization", "Machine Learning", "Algorithm Design"]
  },
  {
    "filename": "LLM-Driven_3D_Scene_Generation_of_Agricultural_Sim.pdf",
    "courseCode": "BSEMC",
    "canonicalTitle": "LLM-Driven 3D Scene Generation of Agricultural Simulation Environments",
    "canonicalAuthors": ["Arafa Yoncalik", "Wouter Jansen", "Nico Huebel", "Mohammad Hasan Rahmani"],
    "canonicalYear": 2024,
    "canonicalAbstract": "Leverages large language models and procedural graph generation to automatically generate photorealistic 3D agricultural terrain and vegetation assets inside Unreal Engine 5.",
    "tags": ["3D Scene Generation", "Unreal Engine", "Large Language Models", "Procedural Generation", "Simulation"]
  },
  {
    "filename": "Magpie_Real-Time_World_Renderer_for_Interactive_Ga.pdf",
    "courseCode": "BSEMC",
    "canonicalTitle": "Magpie: Real-Time World Renderer for Interactive Games",
    "canonicalAuthors": ["Xiaoyu Zhan", "Xinyu Wang", "Xiaohong Zhang", "Huanjie Zhu", "Yanwen Guo"],
    "canonicalYear": 2025,
    "canonicalAbstract": "Introduces Magpie, a generative diffusion rendering engine that transforms white-box game blockouts into high-fidelity photorealistic gameplay frames in under 16 milliseconds.",
    "tags": ["Game Rendering", "Real-Time Graphics", "Generative AI", "Game Engines", "Interactive Worlds"]
  },
  {
    "filename": "Modeling_Mobile_Game_Design_Features_Through_Groun.pdf",
    "courseCode": "BSEMC",
    "canonicalTitle": "Modeling Mobile Game Design Features Through Grounded Theory: Key Factors Influencing User Behavior",
    "canonicalAuthors": ["Chen Ma", "Jianing Shao"],
    "canonicalYear": 2025,
    "canonicalAbstract": "Applies qualitative grounded theory to identify critical mobile game design dimensions—core loops, reward pacing, and social mechanics—that drive sustained player engagement.",
    "tags": ["Mobile Games", "Game Design", "Grounded Theory", "User Experience", "Player Retention"]
  },
  {
    "filename": "Modular_Discovery_of_General_Game-Playing_Algorith.pdf",
    "courseCode": "BSEMC",
    "canonicalTitle": "Modular Discovery of General Game-Playing Algorithms with Large Language Models",
    "canonicalAuthors": ["Zun Li", "John Schultz", "Marc Lanctot", "Daniel Hennes"],
    "canonicalYear": 2026,
    "canonicalAbstract": "Explores LLM-guided program synthesis to automatically discover, compose, and evaluate modular heuristic search algorithms across diverse strategic game rulesets.",
    "tags": ["Game AI", "General Game Playing", "Program Synthesis", "Reinforcement Learning", "Algorithm Discovery"]
  },
  {
    "filename": "ONE_WORLD_SYSTEM_OR_MANY_THE_CONTINUITY.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "One World System or Many: The Continuity Thesis in World System History",
    "canonicalAuthors": ["Robert A. Denemark"],
    "canonicalYear": 2021,
    "canonicalAbstract": "Critically reviews socio-technical systemic continuity in global information networks and trade architectures, contextualizing historical macro-systems for modern distributed enterprise computing.",
    "tags": ["World Systems", "Network Architecture", "Information Systems", "System Modeling", "Historical Analysis"]
  },
  {
    "filename": "Offline_data_driven_evolutionary_optimiz.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "Offline Data-Driven Evolutionary Optimization Using Selective Surrogate Ensembles",
    "canonicalAuthors": ["Handing Wang", "Yaochu Jin", "John Doherty"],
    "canonicalYear": 2019,
    "canonicalAbstract": "Proposes a surrogate-assisted evolutionary optimization framework that constructs selective Gaussian process ensembles to evaluate complex engineering problems without online objective queries.",
    "tags": ["Evolutionary Optimization", "Surrogate Models", "Machine Learning", "Engineering Systems", "Data-Driven"]
  },
  {
    "filename": "On_line_Master_Slave_Robot_System_Synchr.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "On-line Master/Slave Robot System Synchronization with Obstacle Avoidance",
    "canonicalAuthors": ["Rogelio de J. Portillo-Vélez", "Carlos A. Cruz-Villar", "Alejandro Rodríguez-Ángeles"],
    "canonicalYear": 2012,
    "canonicalAbstract": "Presents an online dynamic synchronization controller for master/slave robotic manipulators that computes obstacle-avoidance vector trajectories in real-time under bilateral communication constraints.",
    "tags": ["Robotics", "Master-Slave Systems", "Obstacle Avoidance", "Automation", "Real-Time Control"]
  },
  {
    "filename": "Optimal_Radio_Access_Technology_Selectio.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "Optimal Radio Access Technology Selection in an SDN based LTE-WiFi Network",
    "canonicalAuthors": ["Arghyadip Roy", "Prasanna Chaporkar", "Abhay Karandikar", "Pranav Jha"],
    "canonicalYear": 2020,
    "canonicalAbstract": "Formulates an optimal user association policy in software-defined heterogeneous networks, dynamically balancing traffic loads between LTE cellular towers and high-density WiFi access points.",
    "tags": ["Software Defined Networking", "LTE-WiFi", "Radio Access", "Traffic Engineering", "Wireless Systems"]
  },
  {
    "filename": "Path-Traced_Inverse_Rendering_with_Global_Illumina.pdf",
    "courseCode": "BSEMC",
    "canonicalTitle": "Path-Traced Inverse Rendering with Global Illumination in 3D Gaussian Fields",
    "canonicalAuthors": ["Junke Zhu", "Hao Zhang", "Yutian Zhu", "Ang Li", "Chenxiao Hu", "Fei Zhu"],
    "canonicalYear": 2025,
    "canonicalAbstract": "Develops a differentiable Monte Carlo path tracing framework over 3D Gaussian scene representations, accurately decomposing complex multi-bounce indirect lighting and material BRDFs.",
    "tags": ["Path Tracing", "Inverse Rendering", "Global Illumination", "3D Gaussian Splatting", "Computer Graphics"]
  },
  {
    "filename": "Publication3.pdf",
    "courseCode": "BSEMC",
    "canonicalTitle": "Machine Learning-Based Performance Prediction Framework for Real-Time 3D Asset Optimization in 3D Modeling",
    "canonicalAuthors": ["Praneeth T.M.K.", "Lakshan W.D.D.", "Hewaratna A.I."],
    "canonicalYear": 2026,
    "canonicalAbstract": "Builds a predictive regression model evaluating vertex complexity, polygon density, and draw call overhead to guide digital artists in optimizing real-time 3D models for interactive games.",
    "tags": ["3D Modeling", "Asset Optimization", "Game Performance", "Machine Learning", "Real-Time 3D"]
  },
  {
    "filename": "Real-Time_Generative_AI_in_Game_Texture_Rendering_.pdf",
    "courseCode": "BSEMC",
    "canonicalTitle": "Real-Time Generative AI in Game Texture Rendering and Material Synthesis",
    "canonicalAuthors": ["Siddharth Sharma", "Ananya Verma"],
    "canonicalYear": 2024,
    "canonicalAbstract": "Investigates neural texture generation networks embedded directly within game shaders, enabling infinite non-repeating PBR surface synthesis while reducing VRAM memory footprints.",
    "tags": ["Generative AI", "Game Textures", "PBR Materials", "Shaders", "Game Graphics"]
  },
  {
    "filename": "RescueAlert_an_accident_detection_and_re.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "RescueAlert: An Accident Detection and Rescue Mechanism",
    "canonicalAuthors": ["Uttkarsh Kumar Singh", "Sahil Yadav", "Sonali Joshi", "Stuti Singh", "Kayalvizhi Jayavel"],
    "canonicalYear": 2021,
    "canonicalAbstract": "Designs a microcontroller-driven vehicular accident detection kit combining impact sensor threshold analysis with automated cloud alerting to dispatch medical aid directly to coordinates.",
    "tags": ["Accident Detection", "Emergency Response", "Cloud Alerting", "IoT Hardware", "Smart Vehicles"]
  },
  {
    "filename": "Seamless_proactive_handover_across_heter.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "Seamless Proactive Handover Across Heterogeneous Access Networks",
    "canonicalAuthors": ["Ashutosh Dutta", "Subir Das", "David Famolari"],
    "canonicalYear": 2020,
    "canonicalAbstract": "Proposes a predictive mobility protocol that minimizes handover latency and packet loss when mobile enterprise devices transition between WiFi, WiMAX, and LTE cellular infrastructures.",
    "tags": ["Heterogeneous Networks", "Network Handover", "Mobility Management", "Wireless Communications", "Telecommunications"]
  },
  {
    "filename": "Smart_Headgear_for_Safety_and_Monitoring.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "Smart Headgear for Safety and Monitoring in Hazardous Environments",
    "canonicalAuthors": ["Praveen Lalith", "Ganesh MS", "Prajwal G"],
    "canonicalYear": 2026,
    "canonicalAbstract": "Develops a sensor-instrumented smart safety helmet equipped with gas leak detection, impact sensing, and wireless telemetry to alert safety supervisors of industrial hazards.",
    "tags": ["Smart Helmet", "Industrial Safety", "Wearable IoT", "Gas Sensors", "Hazard Monitoring"]
  },
  {
    "filename": "Smart_Irrigation_and_Intrusions_Detectio.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "Smart Irrigation and Intrusions Detection in Agricultural Fields Using I.o.T.",
    "canonicalAuthors": ["Divyansh Thakur", "Yugal Kumar", "Singh Vijendra"],
    "canonicalYear": 2020,
    "canonicalAbstract": "An intelligent agricultural monitoring system combining soil moisture probes, PIR intrusion sensors, and an automated cloud pump controller to conserve water and protect crop perimeters.",
    "tags": ["Smart Agriculture", "Smart Irrigation", "Intrusion Detection", "IoT Sensors", "Precision Farming"]
  },
  {
    "filename": "WEB_ACCESS_EMERGENCY_RESPONSE_COORDINATI.pdf",
    "courseCode": "BSIT",
    "canonicalTitle": "Web-Access Emergency Response Coordination System for Local Municipalities",
    "canonicalAuthors": ["Michael Jay L. Gamboa"],
    "canonicalYear": 2026,
    "canonicalAbstract": "Develops a cloud-native incident management dashboard enabling municipal dispatchers to map emergency calls, track patrol vehicles, and mobilize first responders with zero communication delay.",
    "tags": ["Emergency Management", "Web Systems", "Municipal Services", "Incident Mapping", "Cloud Application"]
  },
  {
    "filename": "paschmann-et-al-2024-driving-mobile-app-user-engagement-through-gamification.pdf",
    "courseCode": "BSEMC",
    "canonicalTitle": "Driving Mobile App User Engagement Through Gamification: An Empirical Analysis",
    "canonicalAuthors": ["Jens W. Paschmann", "Hernán A. Bruno", "Harald J. van Heerde", "Franziska Völckner", "Kristina Klein"],
    "canonicalYear": 2024,
    "canonicalAbstract": "Conducts a comprehensive empirical analysis tracking user interaction logs across gamified apps, revealing how milestone rewards and social leaderboard mechanics drive long-term engagement.",
    "tags": ["Gamification", "User Engagement", "Mobile Apps", "Empirical Analysis", "Behavioral Economics"]
  },
  {
    "filename": "permission_Advanced_Digital_Animation_Cu.pdf",
    "courseCode": "BSEMC",
    "canonicalTitle": "Advanced Digital Animation Curriculum Development: An Interdisciplinary Approach",
    "canonicalAuthors": ["Jeremy R. Huddleston", "Dan Garcia", "Brian A. Barsky", "Greg Niemeyer"],
    "canonicalYear": 2022,
    "canonicalAbstract": "Details the design of an interdisciplinary computer science and fine arts curriculum teaching advanced character rigging, procedural motion, and physics-based lighting pipelines.",
    "tags": ["Digital Animation", "Curriculum Design", "Interdisciplinary", "Computer Animation", "Character Rigging"]
  }
]

out_path = os.path.join('Sample papers', 'ground_truth_manifest.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=2)

print(f"Successfully generated {out_path} with {len(manifest)} verified records.")

# Quick summary counts:
bsit_count = sum(1 for m in manifest if m['courseCode'] == 'BSIT')
bsemc_count = sum(1 for m in manifest if m['courseCode'] == 'BSEMC')
print(f"Demarcation Summary: BSIT = {bsit_count}, BSEMC = {bsemc_count}, Total = {len(manifest)}")
