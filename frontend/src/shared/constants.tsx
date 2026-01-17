export const DUMMY_ANALYTICS = {
  totalTracked: 152,
  appliedCount: 84,
  viewedCount: 112,
  topRole: "Frontend Developer",
  interviewRate: "12%",
  responseTime: "4 Days"
};

export const DUMMY_APPLICATIONS = [
  {
    id: "1",
    company: "TechNova Solutions",
    role: "Software Engineering Intern",
    status: "Applied", // Use for dynamic styling (e.g., bg-DYNAMIC-accent2)
    date: "2026-01-15",
    location: "Remote",
    skillTags: ["JavaScript", "React", "CSS"],
    salary: "$45/hr"
  },
  {
    id: "2",
    company: "Starlight Data",
    role: "Backend Intern (Java/Spring)",
    status: "Not interested",
    date: "2026-01-12",
    location: "New York, NY",
    skillTags: ["Java", "Spring Boot", "SQL"],
    salary: "$50/hr"
  },
];

export const DUMMY_CAREER_TRAJECTORY = {
  targetRole: "Software Engineer",
  goalStatement: "leveraging full-stack skills in dynamic environments.",
}

export const DUMMY_SUGGESTIONS = [
  {
    id: "1",
    company: "TechNova Solutions",
    role: "Software Engineering Intern",
    location: "Remote",
    skillTags: ["JavaScript", "React", "CSS"],
    salary: "$45/hr",
    logoUrl: "../../public/INTERNITY_BACKING.svg"
  },
  {
    id: "2",
    company: "Starlight Data",
    role: "Backend Intern (Java/Spring)",
    location: "New York, NY",
    skillTags: ["Java", "Spring Boot", "SQL"],
    salary: "$50/hr",
    logoUrl: "../../public/INTERNITY_BACKING.svg"
  },
  {
    id: "3",
    company: "Global Finance Corp",
    role: "Full Stack Intern",
    location: "Hybrid",
    skillTags: ["Python", "Django", "JavaScript"],
    salary: "$40/hr",
    logoUrl: "../../public/INTERNITY_BACKING.svg"
  },
  {
    id: "4",
    company: "Innovatech Labs",
    role: "Data Science Intern",
    location: "San Francisco, CA",
    skillTags: ["Python", "Machine Learning", "Pandas"],
    salary: "$55/hr",
    logoUrl: "../../public/INTERNITY_BACKING.svg"
  }
];

export const USER_PREFERENCES = {
  name: "John Appleseed", //
  targetRoles: ["Software Engineer", "Frontend Developer", "Fullstack Engineer"],
  preferredLocations: ["Toronto", "Remote", "San Francisco"],
  autoTrackEnabled: true
};