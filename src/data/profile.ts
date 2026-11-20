import portraitImg from '../assets/portrait.jpg';
import type { ProfileData } from './types';

export const profileData: ProfileData = {
  name: 'Trần Thịnh Phát',
  alias: 'Preston',
  role: 'Software Engineer',
  avatar: portraitImg,
  tagline: 'Building software systems, algorithms, and web interfaces.',
  headlineWords: ['Systems', 'Algorithms', 'Web'],
  bio: [
    'Data Science & AI student (25T_KHDL) at Da Nang University of Science and Technology (DUT).',
    'I write C/C++ and Python for systems and coursework, and TypeScript/React for web interfaces.',
    'Previously mentored math at FUNiX and tech at GRIT (Pacific Links Foundation).',
  ],
  location: 'Da Nang, Vietnam',
  university: 'Da Nang University of Science & Technology (DUT)',
  major: 'Data Science & AI — 25T_KHDL',
  status: 'Available for Software Engineering internships',
  email: 'phat.bd21p0323@gmail.com',
  web3formsAccessKey:
    import.meta.env.VITE_WEB3FORMS_KEY ?? '1990d3be-84d2-4037-85ae-3504b4a2426e',
  socials: [
    {
      label: 'GitHub',
      href: 'https://github.com/prestonwanttorevenge',
      handle: '@prestonwanttorevenge',
      kind: 'github',
    },
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/th%E1%BB%8Bnh-ph%C3%A1t-tr%E1%BA%A7n-56a25238a/',
      handle: 'Thịnh Phát Trần',
      kind: 'linkedin',
    },
    {
      label: 'Facebook',
      href: 'https://web.facebook.com/prestonwanttorevenge?locale=vi_VN',
      handle: 'prestonwanttorevenge',
      kind: 'facebook',
    },
    {
      label: 'Email',
      href: 'mailto:phat.bd21p0323@gmail.com',
      handle: 'phat.bd21p0323@gmail.com',
      kind: 'mail',
    },
  ],
  specLines: [
    { key: 'name', value: '"Trần Thịnh Phát"' },
    { key: 'alias', value: '"Preston"' },
    { key: 'role', value: '"Software Engineer"' },
    { key: 'school', value: '"DUT (25T_KHDL)"' },
    { key: 'stack', value: '["C/C++", "Python", "TypeScript", "Docker"]' },
    { key: 'email', value: '"phat.bd21p0323@gmail.com"' },
  ],
};
