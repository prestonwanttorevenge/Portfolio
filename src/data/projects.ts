import type { ProjectItem } from './types';

export const projectsData: ProjectItem[] = [
  {
    id: 'tribute-t1',
    title: 'Tribute_T1',
    category: 'Web Project',
    year: '2025',
    description:
      'A web tribute page for T1 built with HTML, CSS, and JavaScript, deployed on GitHub Pages.',
    highlights: [
      'Responsive multi-section layout',
      'Custom CSS and JavaScript interactions',
      'Deployed on GitHub Pages',
    ],
    tags: ['HTML/CSS', 'JavaScript', 'GitHub Pages'],
    liveUrl: 'https://prestonwanttorevenge.github.io/Tribute_T1/',
    repoUrl: 'https://github.com/prestonwanttorevenge/Tribute_T1',
    accent: '#E11D48',
    featured: true,
    blueprintCode: '01',
  },
  {
    id: 'gdglexi',
    title: 'GDGLexi',
    category: 'Web App',
    year: '2025',
    description:
      'Web app for looking up and browsing GDG glossary terms, built with vanilla JavaScript and CSS.',
    highlights: [
      'Client-side search and filtering',
      'Responsive card grid',
      'Hosted on GitHub Pages',
    ],
    tags: ['Web App', 'JavaScript', 'CSS'],
    liveUrl: 'https://prestonwanttorevenge.github.io/gdglexi/',
    repoUrl: 'https://github.com/prestonwanttorevenge/gdglexi',
    accent: '#2563EB',
    featured: true,
    blueprintCode: '02',
  },
  {
    id: 'legacy-portfolio',
    title: 'Portfolio v1',
    category: 'Personal Site',
    year: '2024',
    description:
      'Previous static portfolio on GitHub Pages built with plain HTML, CSS, and JavaScript.',
    highlights: [
      'Version 1 personal index',
      'Static deployment on GitHub Pages',
      'Replaced by this Swarm build',
    ],
    tags: ['HTML5', 'CSS3', 'JavaScript', 'GitHub'],
    liveUrl: 'https://prestonwanttorevenge.github.io/',
    repoUrl: 'https://github.com/prestonwanttorevenge/prestonwanttorevenge.github.io',
    accent: '#059669',
    featured: true,
    blueprintCode: '03',
  },
  {
    id: 'pbl2-clinic',
    title: 'Clinic & Patient System (PBL2)',
    category: 'Desktop App (C++ / Qt)',
    year: '2025',
    description:
      'Desktop clinic and patient record manager written in C++ with Qt GUI and bcrypt password hashing.',
    highlights: [
      'C++ OOP architecture with Qt desktop UI',
      'bcrypt password hashing for staff and patient records',
      'Appointment scheduling and record CRUD',
    ],
    tags: ['C++', 'Qt Framework', 'bcrypt', 'OOP'],
    repoUrl: 'https://github.com/prestonwanttorevenge/PBL2',
    accent: '#7C3AED',
    featured: false,
    blueprintCode: '04',
  },
  {
    id: 'pbl1-graph',
    title: 'Graph Shortest-Path Engine (PBL1)',
    category: 'Algorithms (C)',
    year: '2024',
    description:
      'From-scratch C implementation comparing Dijkstra and Floyd-Warshall on weighted graphs.',
    highlights: [
      'Pure C implementation of Dijkstra and Floyd-Warshall',
      'Runtime and memory comparison across graph densities',
      'File-based adjacency matrix and list input',
    ],
    tags: ['C', 'Algorithms', 'Dijkstra', 'Floyd-Warshall'],
    repoUrl: 'https://github.com/prestonwanttorevenge',
    accent: '#D97706',
    featured: false,
    blueprintCode: '05',
  },
];
