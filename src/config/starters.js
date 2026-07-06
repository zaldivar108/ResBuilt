// Resume content presets. Pure data — a section's `id` is assigned at creation
// time in ResumeContext, not here.

// Student / first-résumé preset — education-first, no fabricated senior experience.
// Written to guide teens & young adults on what to actually put down.
const STUDENT_SECTIONS = [
  {
    title: 'Contact Information',
    type: 'contact',
    content: '<p><strong>Your Name</strong></p><p>you@example.com &nbsp;|&nbsp; (555) 000-0000 &nbsp;|&nbsp; City, State</p>',
  },
  {
    title: 'Objective',
    type: 'summary',
    content: '<p>Hardworking and reliable [grade/year] student looking for a [part-time job / summer role / internship] where I can learn new skills and contribute. Comfortable working in a team and eager to take on responsibility.</p>',
  },
  {
    title: 'Education',
    type: 'education',
    content: '<p><strong>Your High School / College Name</strong> &nbsp;|&nbsp; City, State</p><p><em>Expected graduation: June 2027</em></p><p>GPA: 3.5 (optional) &nbsp;&mdash;&nbsp; Relevant courses: [e.g. Business, Computer Science, Art]</p>',
  },
  {
    title: 'Experience',
    type: 'experience',
    content: '<p><strong>Role (e.g. Babysitter, Cashier, Tutor)</strong> &mdash; Where / Family / Company</p><p><em>Summer 2025 &nbsp;|&nbsp; City, State</em></p><ul><li>Describe what you did and who you helped</li><li>Show a skill you used — reliability, customer service, teamwork</li><li>Add a result or number if you can (e.g. "handled up to 20 customers per hour")</li></ul><p style="opacity:0.7"><em>No paid job yet? That\'s fine — delete this section or use activities and volunteering below instead.</em></p>',
  },
  {
    title: 'Activities & Leadership',
    type: 'activities',
    content: '<ul><li><strong>Club / Team / Student Government</strong> &mdash; your role &nbsp;|&nbsp; 2024&ndash;Present</li><li>What you do and any responsibility you hold (captain, treasurer, organizer)</li></ul>',
  },
  {
    title: 'Volunteer Experience',
    type: 'volunteer',
    content: '<ul><li><strong>Organization / Cause</strong> &mdash; what you helped with &nbsp;|&nbsp; hours or dates</li><li>Example: "Helped run a food drive that collected 300+ items"</li></ul>',
  },
  {
    title: 'Skills',
    type: 'skills',
    content: '<p><strong>Computer:</strong> Google Docs, Excel, Canva, [others]</p><p><strong>Languages:</strong> English, Spanish (conversational)</p><p><strong>Strengths:</strong> Communication, teamwork, time management, dependable</p>',
  },
  {
    title: 'Awards & Achievements',
    type: 'awards',
    content: '<ul><li>Honor Roll / Merit List &mdash; year</li><li>Competition, sports, or academic award</li></ul>',
  },
]

// Internship preset — students applying for internships. Leads with education,
// coursework, and projects since most applicants have little formal work history.
const INTERNSHIP_SECTIONS = [
  {
    title: 'Contact Information',
    type: 'contact',
    content: '<p><strong>Your Name</strong></p><p>you@example.com &nbsp;|&nbsp; (555) 000-0000 &nbsp;|&nbsp; City, State</p><p>linkedin.com/in/yourname &nbsp;|&nbsp; portfolio or github (optional)</p>',
  },
  {
    title: 'Objective',
    type: 'summary',
    content: '<p>[Year] student studying [major/field] seeking a [season] internship in [area]. Eager to apply coursework in [subject] and grow real-world skills while contributing to a team.</p>',
  },
  {
    title: 'Education',
    type: 'education',
    content: '<p><strong>Your School / University</strong> &nbsp;|&nbsp; City, State</p><p><em>Expected graduation: June 2027</em> &nbsp;&mdash;&nbsp; GPA: 3.5 (optional)</p><p><strong>Relevant coursework:</strong> [Course 1], [Course 2], [Course 3]</p>',
  },
  {
    title: 'Projects',
    type: 'projects',
    content: '<p><strong>Project or Assignment Name</strong> &nbsp;|&nbsp; <em>tools or subject</em></p><ul><li>What you built or researched and the goal</li><li>What you learned or the result — include a number if you can</li></ul><p style="opacity:0.7"><em>School projects, club projects, and personal projects all count.</em></p>',
  },
  {
    title: 'Skills',
    type: 'skills',
    content: '<p><strong>Technical:</strong> [software, tools, or methods you know]</p><p><strong>Strengths:</strong> Communication, problem-solving, teamwork, quick learner</p>',
  },
  {
    title: 'Experience & Activities',
    type: 'activities',
    content: '<ul><li><strong>Part-time job, club, or volunteer role</strong> &mdash; what you did &nbsp;|&nbsp; dates</li><li>Show responsibility, reliability, or leadership</li></ul>',
  },
]

// IT / Tech preset — entry-level tech and help-desk roles. Skills- and cert-forward.
const IT_SECTIONS = [
  {
    title: 'Contact Information',
    type: 'contact',
    content: '<p><strong>Your Name</strong></p><p>you@example.com &nbsp;|&nbsp; (555) 000-0000 &nbsp;|&nbsp; City, State</p><p>linkedin.com/in/yourname &nbsp;|&nbsp; github.com/yourname</p>',
  },
  {
    title: 'Summary',
    type: 'summary',
    content: '<p>Motivated entry-level IT candidate with hands-on experience troubleshooting hardware, software, and networks. Comfortable helping users and eager to grow into a [help desk / support / systems] role.</p>',
  },
  {
    title: 'Technical Skills',
    type: 'skills',
    content: '<p><strong>Operating systems:</strong> Windows, macOS, Linux (basics)</p><p><strong>Support:</strong> Troubleshooting, ticketing, hardware setup, printers</p><p><strong>Networking:</strong> TCP/IP basics, Wi-Fi, routers/switches</p><p><strong>Tools:</strong> Microsoft 365, Google Workspace, remote desktop</p>',
  },
  {
    title: 'Certifications',
    type: 'certifications',
    content: '<ul><li><strong>CompTIA A+</strong> &mdash; in progress / year (or planned)</li><li><strong>Google IT Support Certificate</strong> &mdash; year</li></ul><p style="opacity:0.7"><em>List certs you have or are working toward — entry certs like A+ and Google IT Support carry weight.</em></p>',
  },
  {
    title: 'Projects & Hands-On',
    type: 'projects',
    content: '<ul><li><strong>Home lab / build</strong> &mdash; e.g. built a PC, set up a home network, ran a media server</li><li>What you configured and what it taught you</li></ul>',
  },
  {
    title: 'Experience',
    type: 'experience',
    content: '<p><strong>Role (e.g. Tech Helper, Retail, Repair)</strong> &mdash; Company</p><p><em>dates &nbsp;|&nbsp; City, State</em></p><ul><li>Supported users or fixed issues — describe the task and outcome</li></ul>',
  },
  {
    title: 'Education',
    type: 'education',
    content: '<p><strong>Your School / Program</strong> &nbsp;|&nbsp; City, State</p><p><em>Graduated or expected: year</em></p>',
  },
]

// General entry-level preset — first full-time or part-time job (retail, food,
// service, admin). Objective + experience + skills + availability.
const ENTRY_LEVEL_SECTIONS = [
  {
    title: 'Contact Information',
    type: 'contact',
    content: '<p><strong>Your Name</strong></p><p>you@example.com &nbsp;|&nbsp; (555) 000-0000 &nbsp;|&nbsp; City, State</p>',
  },
  {
    title: 'Objective',
    type: 'summary',
    content: '<p>Dependable and friendly worker looking for a [role, e.g. retail associate / crew member] position. Fast learner with a strong work ethic, ready to provide great service and support the team.</p>',
  },
  {
    title: 'Work Experience',
    type: 'experience',
    content: '<p><strong>Role</strong> &mdash; Company Name</p><p><em>dates &nbsp;|&nbsp; City, State</em></p><ul><li>Describe your main duties and who you helped</li><li>Highlight reliability, customer service, or handling money/tasks</li><li>Add a number if you can (customers per shift, sales, etc.)</li></ul><p style="opacity:0.7"><em>No formal job yet? Use babysitting, chores for pay, volunteering, or school jobs.</em></p>',
  },
  {
    title: 'Skills',
    type: 'skills',
    content: '<p><strong>Strengths:</strong> Customer service, teamwork, punctuality, cash handling, communication</p><p><strong>Other:</strong> [languages, POS systems, food-safety cert, etc.]</p>',
  },
  {
    title: 'Education',
    type: 'education',
    content: '<p><strong>Your School Name</strong> &nbsp;|&nbsp; City, State</p><p><em>Graduated or expected: year</em></p>',
  },
  {
    title: 'Availability',
    type: 'availability',
    content: '<p>Available [days/hours, e.g. weekends and weekday evenings]. Flexible schedule and open to weekends and holidays.</p>',
  },
]

// Professional preset — kept for young adults who already have work history.
const PROFESSIONAL_SECTIONS = [
  {
    title: 'Contact Information',
    type: 'contact',
    content: '<p><strong>Your Name</strong></p><p>email@example.com &nbsp;|&nbsp; (555) 000-0000 &nbsp;|&nbsp; City, State</p><p>linkedin.com/in/yourname &nbsp;|&nbsp; github.com/yourname</p>',
  },
  {
    title: 'Professional Summary',
    type: 'summary',
    content: '<p>Motivated professional with X years of experience in [field]. Proven track record of [achievement]. Seeking to leverage skills in [goal].</p>',
  },
  {
    title: 'Work Experience',
    type: 'experience',
    content: '<p><strong>Job Title</strong> &mdash; Company Name</p><p><em>Jan 2022 &ndash; Present &nbsp;|&nbsp; City, State</em></p><ul><li>Accomplished [X] by doing [Y], resulting in [Z]</li><li>Led team of N to deliver project on time and under budget</li><li>Increased [metric] by X% through [initiative]</li></ul>',
  },
  {
    title: 'Education',
    type: 'education',
    content: '<p><strong>Bachelor of Science in Computer Science</strong></p><p>University Name &nbsp;|&nbsp; Graduated May 2021</p><p>GPA: 3.8 / 4.0 &nbsp;&mdash;&nbsp; Dean\'s List</p>',
  },
  {
    title: 'Skills',
    type: 'skills',
    content: '<p><strong>Languages:</strong> JavaScript, Python, TypeScript, Java</p><p><strong>Frameworks:</strong> React, Node.js, Express, Django</p><p><strong>Tools:</strong> Git, Docker, AWS, PostgreSQL</p>',
  },
  {
    title: 'Projects',
    type: 'projects',
    content: '<p><strong>Project Name</strong> &nbsp;|&nbsp; <em>React, Node.js, MongoDB</em></p><ul><li>Built a full-stack application that [description of impact]</li><li>Implemented [feature] reducing load time by X%</li></ul>',
  },
  {
    title: 'Certifications',
    type: 'certifications',
    content: '<p><strong>AWS Certified Solutions Architect</strong> &mdash; Amazon Web Services &nbsp;|&nbsp; 2023</p><p><strong>Google Professional Cloud Developer</strong> &mdash; Google &nbsp;|&nbsp; 2022</p>',
  },
]

export const STARTERS = {
  student: {
    id: 'student',
    label: 'Student / First résumé',
    description: 'Education-first — great if you have little or no work experience yet',
    sections: STUDENT_SECTIONS,
  },
  internship: {
    id: 'internship',
    label: 'Internship',
    description: 'For students applying to internships — coursework and projects lead',
    sections: INTERNSHIP_SECTIONS,
  },
  it: {
    id: 'it',
    label: 'IT / Tech',
    description: 'Entry-level tech and help desk — skills and certifications forward',
    sections: IT_SECTIONS,
  },
  entryLevel: {
    id: 'entryLevel',
    label: 'Entry-Level Job',
    description: 'First retail, food, or service job — includes an availability section',
    sections: ENTRY_LEVEL_SECTIONS,
  },
  professional: {
    id: 'professional',
    label: 'Professional',
    description: 'Experience-first — for when you already have work history',
    sections: PROFESSIONAL_SECTIONS,
  },
}

export const DEFAULT_STARTER_ID = 'student'
