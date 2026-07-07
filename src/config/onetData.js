// O*NET occupation SEED — a curated subset of common teen / young-adult first
// jobs, used to ground résumé suggestions in real occupational data instead of
// LLM guesses.
//
// SOURCE / ATTRIBUTION: tasks and skills are derived from O*NET, sponsored by
// the U.S. Department of Labor, Employment & Training Administration. O*NET
// content is used under the CC BY 4.0 license. See https://services.onetcenter.org/
//
// THIS IS A SEED, NOT THE FULL DATABASE. It exists so the feature ships and is
// testable before the O*NET Web Services API key is approved. To replace it
// with the full dataset, see docs/onet-extract.md — the `src/lib/onet.js`
// repository interface (searchOccupations / getOccupation) does not change.

export const OCCUPATIONS = [
  {
    code: '41-2011.00',
    title: 'Cashiers',
    keywords: ['cashier', 'checkout', 'register', 'clerk'],
    tasks: [
      'Receive and process payments by cash, credit card, or mobile payment.',
      'Greet customers, answer questions, and provide information about products.',
      'Count money in the cash drawer at the start and end of shifts to ensure it is correct.',
      'Bag, box, or wrap merchandise for customers.',
      'Resolve customer complaints and process returns or exchanges.',
    ],
    skills: ['Service Orientation', 'Active Listening', 'Speaking', 'Mathematics'],
  },
  {
    code: '41-2031.00',
    title: 'Retail Salespersons',
    keywords: ['retail', 'sales', 'store associate', 'sales associate'],
    tasks: [
      'Greet customers and help them find products that fit their needs.',
      'Recommend and describe merchandise, explaining features and benefits.',
      'Keep shelves stocked, organized, and clean throughout the shift.',
      'Ring up sales, handle payments, and process exchanges.',
      'Set up promotional displays and update price tags.',
    ],
    skills: ['Service Orientation', 'Persuasion', 'Speaking', 'Active Listening'],
  },
  {
    code: '35-3023.01',
    title: 'Baristas',
    keywords: ['barista', 'coffee', 'cafe', 'coffee shop'],
    tasks: [
      'Prepare and serve coffee, espresso drinks, and other beverages to order.',
      'Take customer orders and accept payment accurately.',
      'Clean and maintain equipment, counters, and seating areas.',
      'Describe menu items and make recommendations to customers.',
      'Restock supplies and monitor inventory of ingredients.',
    ],
    skills: ['Service Orientation', 'Active Listening', 'Speaking', 'Time Management'],
  },
  {
    code: '35-3023.00',
    title: 'Fast Food & Counter Workers',
    keywords: ['fast food', 'crew member', 'food service', 'counter'],
    tasks: [
      'Take food and drink orders and enter them into the register.',
      'Prepare and package food and beverages quickly and accurately.',
      'Keep the work area, counters, and dining space clean and sanitary.',
      'Handle payments and give correct change.',
      'Restock condiments, napkins, and supplies as needed.',
    ],
    skills: ['Service Orientation', 'Active Listening', 'Speaking', 'Coordination'],
  },
  {
    code: '35-3031.00',
    title: 'Waiters & Waitresses',
    keywords: ['server', 'waiter', 'waitress', 'restaurant'],
    tasks: [
      'Greet guests, present menus, and explain daily specials.',
      'Take food and drink orders and relay them to the kitchen.',
      'Serve food and beverages and check back to ensure guest satisfaction.',
      'Prepare checks, process payments, and make change.',
      'Set and clear tables and keep the dining area tidy.',
    ],
    skills: ['Service Orientation', 'Active Listening', 'Speaking', 'Coordination'],
  },
  {
    code: '53-7065.00',
    title: 'Stockers & Order Fillers',
    keywords: ['stock', 'stocker', 'stock clerk', 'order filler', 'warehouse'],
    tasks: [
      'Stock shelves, racks, and bins with merchandise.',
      'Receive, unpack, and inspect incoming shipments for damage.',
      'Mark items with prices or labels and rotate stock so older items sell first.',
      'Keep storage and sales areas clean, organized, and safe.',
      'Locate and gather items to fill customer or store orders.',
    ],
    skills: ['Coordination', 'Monitoring', 'Time Management', 'Active Listening'],
  },
  {
    code: '39-9011.00',
    title: 'Childcare Workers',
    keywords: ['babysitter', 'nanny', 'childcare', 'daycare', 'sitter'],
    tasks: [
      'Supervise and monitor the safety of children in your care.',
      'Organize activities and play that help children learn and develop.',
      'Prepare and serve meals and snacks for children.',
      'Help children with homework, reading, and daily routines.',
      'Communicate with parents about their child’s day and any concerns.',
    ],
    skills: ['Monitoring', 'Social Perceptiveness', 'Service Orientation', 'Active Listening'],
  },
  {
    code: '39-9032.00',
    title: 'Recreation Workers',
    keywords: ['camp counselor', 'recreation', 'summer camp', 'activities'],
    tasks: [
      'Plan, organize, and lead group activities, games, and events.',
      'Supervise participants to keep them safe during activities.',
      'Explain rules and demonstrate how to use equipment safely.',
      'Encourage participation and help resolve conflicts among group members.',
      'Set up and clean up equipment and activity areas.',
    ],
    skills: ['Coordination', 'Social Perceptiveness', 'Speaking', 'Monitoring'],
  },
  {
    code: '25-3041.00',
    title: 'Tutors',
    keywords: ['tutor', 'tutoring', 'teaching assistant', 'homework help'],
    tasks: [
      'Help students understand course material and complete assignments.',
      'Explain difficult concepts in different ways until students understand.',
      'Track student progress and adjust lessons to their needs.',
      'Prepare practice problems, study guides, and review sessions.',
      'Encourage students and build their confidence in the subject.',
    ],
    skills: ['Instructing', 'Active Listening', 'Speaking', 'Learning Strategies'],
  },
  {
    code: '33-9092.00',
    title: 'Lifeguards',
    keywords: ['lifeguard', 'pool', 'beach', 'water safety'],
    tasks: [
      'Monitor swimmers and activities to prevent accidents and injuries.',
      'Enforce pool or beach safety rules and warn of hazards.',
      'Rescue swimmers in danger and administer first aid or CPR when needed.',
      'Keep the pool deck or beach area clean and free of hazards.',
      'Test and record water quality and equipment condition.',
    ],
    skills: ['Monitoring', 'Active Listening', 'Coordination', 'Service Orientation'],
  },
]
