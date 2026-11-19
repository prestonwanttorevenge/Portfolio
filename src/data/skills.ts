import type { SkillGroup } from './types';

export const skillsData: SkillGroup[] = [
  {
    id: 'languages',
    title: 'Languages & Core',
    laneCode: '01 · Languages',
    accent: '#2563EB',
    items: [
      { name: 'C / C++', level: 'core', note: 'DSA, Qt, Systems' },
      { name: 'Python', level: 'core', note: 'AI / Data & Scripting' },
      { name: 'TypeScript / JS', level: 'proficient', note: 'React, Vite, DOM' },
      { name: 'SQL', level: 'proficient', note: 'Relational Modeling' },
      { name: 'HTML5 / CSS3', level: 'core', note: 'Layout & Styling' },
    ],
  },
  {
    id: 'systems',
    title: 'Systems & Tools',
    laneCode: '02 · Systems & Tools',
    accent: '#059669',
    items: [
      { name: 'Linux (Ubuntu)', level: 'core', note: 'CLI & Shell' },
      { name: 'Docker', level: 'proficient', note: 'Containers' },
      { name: 'Terraform', level: 'exploring', note: 'IaC Basics' },
      { name: 'Git / GitHub', level: 'core', note: 'Workflows & Pages' },
      { name: 'React / Vite', level: 'proficient', note: 'Web Apps' },
    ],
  },
  {
    id: 'fundamentals',
    title: 'CS Fundamentals',
    laneCode: '03 · Fundamentals',
    accent: '#7C3AED',
    items: [
      { name: 'Data Structures & Algorithms', level: 'core' },
      { name: 'Graph Theory (Dijkstra / Floyd)', level: 'core' },
      { name: 'System Optimization', level: 'proficient' },
      { name: 'Password Hashing (bcrypt)', level: 'proficient' },
      { name: 'Technical Mentorship', level: 'core' },
    ],
  },
];
