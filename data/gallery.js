// Photo gallery — add your photos to assets/images/gallery/ and list them here.
// Each entry: src (path), caption (shown on hover & in lightbox), category (filter tab).
// Until a photo file exists, the site shows a placeholder tile with the expected
// filename, so you can see exactly what to add.
const GALLERY = [
  // ---- Site visit: Future Ready-Mix Concrete Plant ----
  {
    src: "assets/images/gallery/ready-mix-1.jpg",
    caption: "Briefing civil engineering students at the Future Ready-Mix concrete plant, Kuwait",
    category: "Site visits"
  },
  {
    src: "assets/images/gallery/ready-mix-2.jpg",
    caption: "Walking students through the batching process — aggregates, silos, and quality control",
    category: "Site visits"
  },
  {
    src: "assets/images/gallery/ready-mix-3.jpg",
    caption: "Mixer trucks and batching silos at the Future Ready-Mix plant",
    category: "Site visits"
  },
  {
    src: "assets/images/gallery/ready-mix-4.jpg",
    caption: "Group photo with the class at Future Ready-Mix Co.",
    category: "Site visits"
  },
  // ---- Site visit: Kayan residential building construction site ----
  {
    src: "assets/images/gallery/kayan-1.jpg",
    caption: "With students and site engineers on the slab — Kayan residential building site",
    category: "Site visits"
  },
  {
    src: "assets/images/gallery/kayan-2.jpg",
    caption: "Reading the structural frame from inside — Kayan residential building site",
    category: "Site visits"
  },
  {
    src: "assets/images/gallery/kayan-3.jpg",
    caption: "Examining slab reinforcement before the concrete pour",
    category: "Site visits"
  },
  {
    src: "assets/images/gallery/kayan-4.jpg",
    caption: "Inspecting rebar detailing with the site engineers",
    category: "Site visits"
  },
  // ---- Graduation project: Robotics in Construction (1st place, 2025–2026) ----
  {
    src: "assets/images/gallery/grad-robotics-4.jpg",
    caption: "The prototype: a quadruped robot with computer vision for construction-site monitoring — 1st place graduation project",
    category: "Graduation projects"
  },
  {
    src: "assets/videos/grad-robotics-demo.mp4",
    type: "video",
    poster: "assets/images/gallery/grad-robotics-demo-poster.jpg",
    caption: "Robot dog in action — live demo of the award-winning robotics graduation project",
    category: "Graduation projects"
  },
  {
    src: "assets/images/gallery/grad-robotics-1.jpg",
    caption: "The winning team with their certificates — \"First Winning Project in Civil Engineering\", Australian University",
    category: "Graduation projects"
  },
  {
    src: "assets/images/gallery/grad-robotics-2.jpg",
    caption: "Receiving the first-place plaque with the robot dog on the demo table",
    category: "Graduation projects"
  },
  {
    src: "assets/images/gallery/grad-robotics-3.jpg",
    caption: "Award ceremony with university leadership — Exhibition of Engineering Students' Graduation Projects",
    category: "Graduation projects"
  },
  // ---- Graduation project: Exosuit Efficacy (2nd place, 2024–2025) ----
  {
    src: "assets/images/gallery/grad-exosuit-team.jpg",
    caption: "With the exosuit research team — 2nd place, Exhibition of Engineering Students' Graduation Projects, Spring 2024/2025",
    category: "Graduation projects"
  },
  {
    src: "assets/videos/grad-exosuit-award.mp4",
    type: "video",
    poster: "assets/images/gallery/grad-exosuit-award-poster.jpg",
    caption: "The award moment — the exosuit team receives 2nd place in Civil Engineering",
    category: "Graduation projects"
  },
  // ---- Graduation project: YOLOv8 PPE detection (2nd place, 2022–2023) ----
  {
    src: "assets/images/gallery/grad-yolo-team.jpg",
    caption: "The YOLOv8 PPE-detection team — the graduation project that became the EC3 2024 paper",
    category: "Graduation projects"
  },
  // ---- Research in action: exoskeleton laboratory testing ----
  {
    src: "assets/videos/exo-lab-testing.mp4",
    type: "video",
    poster: "assets/images/gallery/exo-lab-testing-poster.jpg",
    caption: "Inside the exoskeleton lab: masonry lifting trials with live pose detection, synchronized EMG, and real-time heart-rate monitoring — the methodology behind the back-support exoskeleton papers",
    category: "Research in action"
  },
  {
    src: "assets/videos/exo-field-testing.mp4",
    type: "video",
    poster: "assets/images/gallery/exo-field-testing-poster.jpg",
    caption: "From lab to jobsite: masons wearing back-support exoskeletons during real construction work — the field trials of the exoskeleton research",
    category: "Research in action"
  },
  // ---- Research in action: VR safety training study (Safety, 2023) ----
  {
    src: "assets/images/gallery/vr-training-1.jpg",
    caption: "Testing the VR working-at-heights training alongside workers from WSP and Combined Group, Kuwait",
    category: "Research in action"
  },
  {
    src: "assets/images/gallery/vr-training-2.jpg",
    caption: "Safety training session with construction crews — the fieldwork behind \"Safer Working at Heights\" (Safety, 2023)",
    category: "Research in action"
  },
  // ---- Teaching: VR in the classroom ----
  {
    src: "assets/images/gallery/vr-class-1.jpg",
    caption: "Demonstrating the VR concrete-structures environment in class — walking through the building before calculating it",
    category: "Teaching"
  },
  {
    src: "assets/images/gallery/vr-class-2.jpg",
    caption: "Setting up the VR session — immersive technology as a standard part of the civil engineering classroom",
    category: "Teaching"
  },
  {
    src: "assets/images/gallery/vr-class-3.jpg",
    caption: "Handing a student the headset — engineering is learned by doing",
    category: "Teaching"
  },
  // ---- IEEE EDUCON 2025 — London, UK ----
  {
    src: "assets/images/gallery/educon25-1.jpg",
    caption: "With Dr. Sayed M. Soleimani (Purdue University) at IEEE EDUCON 2025 — Queen Mary University of London",
    category: "Conferences"
  },
  {
    src: "assets/videos/conf-educon25-clip.mp4",
    type: "video",
    poster: "assets/images/gallery/conf-educon25-clip-poster.jpg",
    caption: "Presenting at IEEE EDUCON 2025, London — \"If we teach today's students as we taught yesterday's, we rob them of tomorrow\"",
    category: "Conferences"
  },
  {
    src: "assets/images/gallery/educon25-2.jpg",
    caption: "At Westminster with colleagues during EDUCON 2025 — conferences are where collaborations begin",
    category: "Conferences"
  },
  // ---- Teaching Excellence Award 2024/2025 ----
  {
    src: "assets/images/gallery/award-stage.jpg",
    caption: "Receiving the Teaching Excellence Award from Prof. Isam Zabalawi, President of the Australian University — top recipient, College of Engineering, 2024/2025",
    category: "Teaching"
  },
  {
    src: "assets/images/gallery/award-au.jpg",
    caption: "Award night at the Australian University, Kuwait",
    category: "Teaching"
  },
  {
    src: "assets/images/gallery/award-plaque.jpg",
    caption: "The Teaching Excellence Award plaque",
    category: "Teaching"
  },
  // ---- EC3 2024 — Chania, Crete, Greece ----
  {
    src: "assets/images/gallery/conf-ec3-1.jpg",
    caption: "Presenting \"Enhancing Construction Site Safety Using AI\" at EC3 2024 — Minoa Palace, Chania, Crete",
    category: "Conferences"
  },
  {
    src: "assets/videos/conf-ec3-clip.mp4",
    type: "video",
    poster: "assets/images/gallery/conf-ec3-clip-poster.jpg",
    caption: "Highlight from the EC3 2024 talk — a custom YOLOv8 model for real-time PPE compliance detection",
    category: "Conferences"
  },
  {
    src: "assets/images/gallery/conf-ec3-2.jpg",
    caption: "At the 2024 European Conference on Computing in Construction, Chania, Crete — July 2024",
    category: "Conferences"
  },
  {
    src: "assets/images/gallery/conf-ec3-3.jpg",
    caption: "EC3 2024 — where computing meets construction",
    category: "Conferences"
  },
  // ---- IEEE EDUCON 2023 — Salmiya, Kuwait ----
  {
    src: "assets/images/gallery/conf-educon-1.jpg",
    caption: "Presenting \"A Gamified Approach to Concrete Structure's Interpretation using Virtual Reality\" at IEEE EDUCON 2023",
    category: "Conferences"
  },
  {
    src: "assets/videos/conf-educon-clip.mp4",
    type: "video",
    poster: "assets/images/gallery/conf-educon-clip-poster.jpg",
    caption: "Highlight from my IEEE EDUCON 2023 talk — traditional 2D plans vs. gamified VR for concrete structures education",
    category: "Conferences"
  },
  {
    src: "assets/images/gallery/conf-educon-2.jpg",
    caption: "Demonstrating the VR construction-site simulation on stage at IEEE EDUCON 2023",
    category: "Conferences"
  },
  {
    src: "assets/images/gallery/conf-educon-3.jpg",
    caption: "Engaging the audience at IEEE EDUCON 2023 — Global Engineering Education Conference, Kuwait",
    category: "Conferences"
  },
  {
    src: "assets/images/gallery/conf-educon-4.jpg",
    caption: "IEEE EDUCON 2023, Salmiya, Kuwait — May 2023",
    category: "Conferences"
  },
  // ---- ICEEI 2022 — Hanoi, Vietnam ----
  {
    src: "assets/images/gallery/conf-iceei-1.jpg",
    caption: "Presenting \"The Integration of Digital Techniques in Engineering Education\" at ICEEI 2022, Hanoi, Vietnam",
    category: "Conferences"
  },
  {
    src: "assets/images/gallery/conf-iceei-2.jpg",
    caption: "With fellow researchers at the 4th International Conference on Engineering Education and Innovation (ICEEI 2022), Hanoi",
    category: "Conferences"
  },
  {
    src: "assets/images/gallery/conf-iceei-3.jpg",
    caption: "Certificate exchange at ICEEI 2022 — connecting with educators from across Asia and beyond",
    category: "Conferences"
  },
  {
    src: "assets/images/gallery/conf-iceei-4.jpg",
    caption: "The conference venue in Hanoi, Vietnam — ICEEI 2022, December 2022",
    category: "Conferences"
  }
];
