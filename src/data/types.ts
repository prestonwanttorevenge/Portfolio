export interface SocialLink {
  label: string;
  href: string;
  handle: string;
  kind: 'github' | 'linkedin' | 'facebook' | 'mail' | 'globe' | 'code';
}

export interface ProfileData {
  name: string;
  alias: string;
  role: string;
  avatar: string;
  tagline: string;
  headlineWords: string[];
  bio: string[];
  location: string;
  university: string;
  major: string;
  status: string;
  email: string;
  web3formsAccessKey?: string;
  socials: SocialLink[];
  specLines: { key: string; value: string; comment?: string }[];
}

export interface ProjectItem {
  id: string;
  title: string;
  category: string;
  year: string;
  description: string;
  highlights: string[];
  tags: string[];
  liveUrl?: string;
  repoUrl?: string;
  accent: string;
  featured?: boolean;
  blueprintCode: string;
}

export interface SkillGroup {
  id: string;
  title: string;
  laneCode: string;
  accent: string;
  items: {
    name: string;
    level: 'core' | 'proficient' | 'exploring';
    note?: string;
  }[];
}

export interface ExperienceItem {
  id: string;
  period: string;
  title: string;
  organization: string;
  type: 'education' | 'mentorship' | 'engineering';
  summary: string;
  tags: string[];
}
