const isTechnicalDomain = (setup = {}) => {
  const domain = String(setup.domain || '').toLowerCase();
  const subDomain = String(setup.subDomain || domain).toLowerCase();
  const role = String(setup.role || '').toLowerCase();
  const types = Array.isArray(setup.types) ? setup.types.join(' ').toLowerCase() : String(setup.types || '').toLowerCase();
  const interviewType = String(setup.interviewType || '').toLowerCase();

  return Boolean(
    setup.isTechnical ||
    setup.requiresCoding ||
    setup.requiresSql ||
    /software|coding|dsa|developer|engineer|fullstack|frontend|backend|web|data science|database|sql|devops|cloud|ai|machine learning|python|java|react|node/i.test(domain) ||
    /software|coding|dsa|developer|engineer|fullstack|frontend|backend|web|data science|database|sql|devops|cloud|ai|machine learning|python|java|react|node/i.test(subDomain) ||
    /software|developer|engineer|fullstack|frontend|backend|web|data scientist|coder|architect/i.test(role) ||
    /technical|coding|dsa|sql|database|system design/i.test(types) ||
    /technical|coding|dsa|sql|database|system design/i.test(interviewType)
  );
};

const generateLocalQuestionBank = (setup = {}, plan = {}) => {
  const total = Number(plan.total || 10);
  const domain = String(setup.domain || 'General Domain').trim();
  const subDomain = String(setup.subDomain || domain).trim();
  const role = String(setup.role || 'Candidate').trim();
  const stage = String(setup.stage || 'entry').trim();
  const techStack = Array.isArray(setup.techStack) 
    ? setup.techStack.join(', ') 
    : String(setup.techStack || '');
  const codingLang = String(setup.codingLanguage || 'python').toLowerCase();
  const isTech = isTechnicalDomain(setup);

  const easyCount = Math.max(2, Math.min(4, Math.floor(total * 0.25)));
  const hardCount = Math.max(2, Math.min(4, Math.floor(total * 0.25)));
  const mediumCount = Math.max(2, total - easyCount - hardCount);

  const questions = [];
  const usedTexts = new Set();

  const addQuestion = (qObj) => {
    if (!usedTexts.has(qObj.text)) {
      usedTexts.add(qObj.text);
      questions.push({
        id: questions.length + 1,
        difficultyTier: qObj.difficultyTier || 'medium',
        type: qObj.type || 'verbal',
        section: qObj.section || 'verbal',
        questionType: qObj.questionType || 'verbal_question',
        category: qObj.category || 'General',
        text: qObj.text,
        intent: qObj.intent || 'Assess candidate competence.',
        problem: qObj.problem || null,
        constraints: qObj.constraints || [],
        examples: qObj.examples || [],
        language: qObj.language || ''
      });
    }
  };

  // 1. EASY TIER (Intro, College/Academic, Motivation & Skill Fit)
  addQuestion({
    difficultyTier: 'easy',
    type: 'verbal',
    section: 'verbal',
    questionType: 'introduction',
    category: 'Easy / Introduction',
    text: `Welcome to the interview! To start off, please introduce yourself and walk me through your background, key academic or professional projects, and relevant experience.`,
    intent: 'Evaluate candidate communication and general background.'
  });

  addQuestion({
    difficultyTier: 'easy',
    type: 'verbal',
    section: 'verbal',
    questionType: 'academic_motivation',
    category: 'Easy / Academic & Motivation',
    text: `What inspired you to pursue a career in ${subDomain}, and how did your education or college coursework prepare you for a role as a ${role}?`,
    intent: 'Assess candidate motivation and academic foundation.'
  });

  if (easyCount > 2) {
    addQuestion({
      difficultyTier: 'easy',
      type: 'verbal',
      section: 'verbal',
      questionType: 'skills_fit',
      category: 'Easy / Tooling & Fit',
      text: `Which specific tools, languages, or frameworks${techStack ? ` (such as ${techStack})` : ''} in ${domain} do you enjoy working with most, and why?`,
      intent: 'Identify technical enthusiasm and tooling preference.'
    });
  }

  // 2. MEDIUM TIER
  // If Technical: Include 1-2 Pseudocode / Algorithmic Logic Questions
  if (isTech) {
    addQuestion({
      difficultyTier: 'medium',
      type: 'verbal',
      section: 'verbal',
      questionType: 'technical_workflow',
      category: 'Medium / Practical Workflows',
      text: `In your work as a ${role}, how do you approach standard workflow steps and core problem-solving procedures in ${subDomain}?`,
      intent: 'Assess practical technical workflow understanding.'
    });

    addQuestion({
      difficultyTier: 'medium',
      type: 'verbal',
      section: 'verbal',
      questionType: 'scenario_problem',
      category: 'Medium / Domain Scenario',
      text: `Can you describe a practical project scenario in ${domain} where you encountered a technical bottleneck or debugging challenge, and how you resolved it?`,
      intent: 'Evaluate practical problem solving and debugging methodology.'
    });

    // PSEUDOCODE QUESTION #1
    addQuestion({
      difficultyTier: 'medium',
      type: 'verbal',
      section: 'verbal',
      questionType: 'pseudocode_logic',
      category: 'Medium / Pseudocode & Logic',
      text: `Pseudocode Challenge: Please write step-by-step pseudocode or explain the exact algorithmic logic to find the first non-repeating character in a string with O(n) time complexity.`,
      intent: 'Evaluate step-by-step pseudocode construction and time complexity reasoning.'
    });

    // PSEUDOCODE QUESTION #2
    if (mediumCount >= 4) {
      addQuestion({
        difficultyTier: 'medium',
        type: 'verbal',
        section: 'verbal',
        questionType: 'pseudocode_logic',
        category: 'Medium / Pseudocode & Logic',
        text: `Pseudocode Challenge: Write step-by-step pseudocode or outline the algorithm to validate if a given string containing brackets '()[]{}' is balanced using a stack data structure.`,
        intent: 'Evaluate stack data structure comprehension and pseudocode clarity.'
      });
    }

    // Fill remaining medium count if needed
    let fillMedIdx = 1;
    while (questions.length < easyCount + mediumCount) {
      addQuestion({
        difficultyTier: 'medium',
        type: 'verbal',
        section: 'verbal',
        questionType: 'code_quality',
        category: 'Medium / Best Practices',
        text: `When developing features in ${subDomain} (Part ${fillMedIdx}), what strategies and code quality standards do you follow to ensure maintainability, testing, and performance?`,
        intent: 'Assess code quality and testing standards.'
      });
      fillMedIdx++;
    }
  } else {
    // Non-Technical Medium Questions
    const nonTechMedium = [
      `In your day-to-day work as a ${role}, how do you approach core workflow procedures and project execution within ${subDomain}?`,
      `Can you describe a scenario in ${domain} where you encountered an operational challenge, and how you resolved it?`,
      `When delivering work in ${subDomain}, what standards do you follow to ensure high quality and efficiency?`,
      `How do you handle shifting project priorities or collaborate with cross-functional team members?`
    ];
    for (let i = 0; i < mediumCount; i++) {
      addQuestion({
        difficultyTier: 'medium',
        type: 'verbal',
        section: 'verbal',
        questionType: 'practical_scenario',
        category: 'Medium / Practical Workflows',
        text: nonTechMedium[i % nonTechMedium.length],
        intent: 'Evaluate domain competence and scenario handling.'
      });
    }
  }

  // 3. HARD TIER
  // If Technical: Include 1-2 Interactive Coding / SQL Workspace Problems
  if (isTech) {
    // HARD CODING WORKSPACE PROBLEM #1
    addQuestion({
      difficultyTier: 'hard',
      type: 'coding',
      section: 'coding',
      questionType: 'coding_workspace_problem',
      category: 'Hard / Coding Workspace',
      text: `Hands-on Coding Challenge: Write a function in ${codingLang} to solve the Two Sum Problem. Given an array of integers 'nums' and an integer 'target', return indices of the two numbers such that they add up to target. Optimize your algorithm for O(n) time complexity using a hash map.`,
      intent: 'Assess hands-on coding, workspace execution, and hash map algorithmic optimization.',
      problem: {
        title: 'Two Sum Algorithmic Optimization',
        description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.`,
        inputFormat: 'nums = [2, 7, 11, 15], target = 9',
        outputFormat: '[0, 1]',
        sampleInput: '[2, 7, 11, 15], target = 9',
        sampleOutput: '[0, 1]'
      },
      constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', 'Target time complexity: O(n)'],
      examples: [
        { input: 'nums = [2, 7, 11, 15], target = 9', output: '[0, 1]', explanation: 'nums[0] + nums[1] == 9, so return [0, 1].' },
        { input: 'nums = [3, 2, 4], target = 6', output: '[1, 2]', explanation: 'nums[1] + nums[2] == 6, so return [1, 2].' }
      ],
      language: codingLang
    });

    // HARD SQL OR CODING WORKSPACE PROBLEM #2
    if (setup.requiresSql || /sql|database/i.test(domain) || /sql|database/i.test(subDomain)) {
      addQuestion({
        difficultyTier: 'hard',
        type: 'sql',
        section: 'sql',
        questionType: 'sql_workspace_problem',
        category: 'Hard / SQL Workspace',
        text: `Hands-on SQL Challenge: Write an SQL query to find the top 2 highest-earning employees in each department from an Employees table (columns: id, name, salary, department_id). Include Department Name, Employee Name, and Salary in the output.`,
        intent: 'Assess hands-on SQL query construction, window functions (DENSE_RANK), and aggregation.',
        problem: {
          title: 'Top Department Earners Query',
          description: `Given an Employees table and a Departments table, write a query to find employees who have the highest salaries in each department.`,
          inputFormat: 'Employees (id, name, salary, department_id), Departments (id, name)',
          outputFormat: 'Department, Employee, Salary'
        },
        constraints: ['Use DENSE_RANK() or Window Functions for optimal accuracy.'],
        examples: [
          { input: 'Employees table with IT and HR departments', output: 'IT | Alice | 90000', explanation: 'Alice has top salary in IT.' }
        ],
        language: 'sql'
      });
    } else {
      addQuestion({
        difficultyTier: 'hard',
        type: 'coding',
        section: 'coding',
        questionType: 'coding_workspace_problem',
        category: 'Hard / Coding Workspace',
        text: `Hands-on Coding Challenge: Write a function in ${codingLang} to reverse a singly linked list and return the head of the reversed list. Aim for O(n) time complexity and O(1) auxiliary space complexity.`,
        intent: 'Assess data structure manipulation, pointer management, and memory complexity.',
        problem: {
          title: 'Reverse Singly Linked List',
          description: `Given the head of a singly linked list, reverse the list, and return the reversed list.`,
          inputFormat: 'head = [1, 2, 3, 4, 5]',
          outputFormat: '[5, 4, 3, 2, 1]',
          sampleInput: '[1, 2, 3, 4, 5]',
          sampleOutput: '[5, 4, 3, 2, 1]'
        },
        constraints: ['Number of nodes is in range [0, 5000]', '-5000 <= Node.val <= 5000'],
        examples: [
          { input: 'head = [1, 2, 3, 4, 5]', output: '[5, 4, 3, 2, 1]' }
        ],
        language: codingLang
      });
    }

    // Fill remaining hard questions if needed
    let fillHardIdx = 1;
    while (questions.length < total) {
      addQuestion({
        difficultyTier: 'hard',
        type: 'verbal',
        section: 'verbal',
        questionType: 'system_architecture',
        category: 'Hard / System Architecture',
        text: `Looking at modern trends and high-load system patterns in ${domain} (Part ${fillHardIdx}), how would you architect a fault-tolerant, micro-services solution for ${subDomain}?`,
        intent: 'Assess high-level system architecture and scalable design.'
      });
      fillHardIdx++;
    }
  } else {
    // Non-Technical Hard Questions
    const nonTechHard = [
      `Looking at modern industry trends and strategic challenges in ${domain}, how would you design a scalable strategy to handle complex high-impact projects in ${subDomain}?`,
      `What advanced techniques do you employ for risk management, crisis mitigation, and strategic decision making in ${subDomain}?`
    ];
    for (let i = 0; i < hardCount; i++) {
      addQuestion({
        difficultyTier: 'hard',
        type: 'verbal',
        section: 'verbal',
        questionType: 'strategic_leadership',
        category: 'Hard / Advanced & Strategy',
        text: nonTechHard[i % nonTechHard.length],
        intent: 'Evaluate strategic domain leadership and high-level decision making.'
      });
    }
  }

  const hasPlannedSections = ['verbal', 'coding', 'sql'].every(
    section => Number.isFinite(Number(plan[section]))
  );

  if (hasPlannedSections) {
    const plannedVerbal = Math.max(0, Number(plan.verbal));
    const plannedCoding = Math.max(0, Number(plan.coding));
    const plannedSql = Math.max(0, Number(plan.sql));
    const bySection = {
      verbal: questions.filter(q => (q.section || q.type) === 'verbal'),
      coding: questions.filter(q => (q.section || q.type) === 'coding'),
      sql: questions.filter(q => (q.section || q.type) === 'sql'),
    };

    const selected = {
      verbal: bySection.verbal.slice(0, plannedVerbal),
      coding: bySection.coding.slice(0, plannedCoding),
      sql: bySection.sql.slice(0, plannedSql),
    };

    const verbalShortfall = plannedVerbal - selected.verbal.length;
    if (verbalShortfall > 0) {
      const extras = [...bySection.coding, ...bySection.sql].slice(0, verbalShortfall);
      selected.verbal.push(...extras.map((q, index) => ({
        ...q,
        type: 'verbal',
        section: 'verbal',
        questionType: 'technical_reasoning',
        category: 'Hard / Technical Reasoning',
        text: `Explain your approach to ${q.problem?.title || q.category || 'this technical task'} and discuss its key tradeoffs.`,
        problem: null,
        constraints: [],
        examples: [],
        language: '',
      })));
    }

    const codingVariants = [
      {
        title: 'First Non-Repeating Character',
        text: 'Write a function that returns the first non-repeating character in a string, or null if none exists.',
        inputFormat: '"swiss"',
        outputFormat: '"w"',
        constraints: ['Target O(n) time complexity.'],
      },
      {
        title: 'Balanced Brackets',
        text: 'Write a function that returns whether a string containing (), [] and {} has balanced brackets.',
        inputFormat: '"{[()]}"',
        outputFormat: 'true',
        constraints: ['Use O(n) time and O(n) auxiliary space.'],
      },
      {
        title: 'Merge Sorted Arrays',
        text: 'Write a function that merges two sorted integer arrays into one sorted array.',
        inputFormat: '[1, 4, 7], [2, 3, 8]',
        outputFormat: '[1, 2, 3, 4, 7, 8]',
        constraints: ['Target O(n + m) time complexity.'],
      },
      {
        title: 'Maximum Subarray Sum',
        text: 'Write a function that returns the largest sum of any contiguous subarray.',
        inputFormat: '[-2, 1, -3, 4, -1, 2, 1, -5, 4]',
        outputFormat: '6',
        constraints: ['Target O(n) time complexity.'],
      },
    ];
    while (selected.coding.length < plannedCoding) {
      const variant = codingVariants[selected.coding.length % codingVariants.length];
      const number = selected.coding.length + 1;
      selected.coding.push({
        difficultyTier: 'hard',
        type: 'coding',
        section: 'coding',
        questionType: 'coding_workspace_problem',
        category: `Hard / Coding Workspace ${number}`,
        text: `Hands-on Coding Challenge: ${variant.text} Use ${codingLang}.`,
        intent: 'Assess problem solving, implementation quality, and edge-case reasoning.',
        problem: {
          title: variant.title,
          description: variant.text,
          inputFormat: variant.inputFormat,
          outputFormat: variant.outputFormat,
        },
        constraints: variant.constraints,
        examples: [{ input: variant.inputFormat, output: variant.outputFormat }],
        language: codingLang,
      });
    }

    const sqlVariants = [
      {
        title: 'Top Earners by Department',
        text: 'Return the two highest-paid employees in each department, including department, employee, and salary.',
        inputFormat: 'Employees(id, name, salary, department_id)',
        outputFormat: 'department_id, name, salary',
      },
      {
        title: 'Customers Without Orders',
        text: 'Find every customer who has not placed an order.',
        inputFormat: 'Customers(id, name); Orders(id, customer_id)',
        outputFormat: 'customer id and name',
      },
      {
        title: 'Monthly Revenue',
        text: 'Calculate monthly revenue from completed orders, grouped by calendar month.',
        inputFormat: 'Orders(id, total, status, created_at)',
        outputFormat: 'month and revenue',
      },
    ];
    while (selected.sql.length < plannedSql) {
      const variant = sqlVariants[selected.sql.length % sqlVariants.length];
      const number = selected.sql.length + 1;
      selected.sql.push({
        difficultyTier: 'hard',
        type: 'sql',
        section: 'sql',
        questionType: 'sql_workspace_problem',
        category: `Hard / SQL Workspace ${number}`,
        text: `Hands-on SQL Challenge: ${variant.text}`,
        intent: 'Assess SQL query construction, correctness, and handling of edge cases.',
        problem: {
          title: variant.title,
          description: variant.text,
          inputFormat: variant.inputFormat,
          outputFormat: variant.outputFormat,
        },
        constraints: ['Use a clear and efficient query.'],
        examples: [],
        language: 'sql',
      });
    }

    const tierOrder = { easy: 0, medium: 1, hard: 2 };
    return [...selected.verbal, ...selected.coding, ...selected.sql]
      .sort((a, b) => (tierOrder[a.difficultyTier] ?? 1) - (tierOrder[b.difficultyTier] ?? 1))
      .slice(0, total)
      .map((question, index) => ({ ...question, id: index + 1 }));
  }

  return questions;
};


const enrichQuestionBank = (questionBank, setup = {}, plan = {}) => {
  if (!Array.isArray(questionBank) || questionBank.length === 0) {
    return generateLocalQuestionBank(setup, plan);
  }

  const hasPlannedSections = ['verbal', 'coding', 'sql'].every(
    section => Number.isFinite(Number(plan[section]))
  );
  if (hasPlannedSections) {
    const expected = {
      verbal: Math.max(0, Number(plan.verbal)),
      coding: Math.max(0, Number(plan.coding)),
      sql: Math.max(0, Number(plan.sql)),
    };
    const actual = Object.fromEntries(
      Object.keys(expected).map(section => [
        section,
        questionBank.filter(q => (q.section || q.type) === section).length,
      ])
    );
    const bankMatchesPlan =
      questionBank.length === Number(plan.total) &&
      Object.keys(expected).every(section => actual[section] === expected[section]);

    if (!bankMatchesPlan) {
      console.warn('AI question bank does not match the interview plan; using the local bank.', {
        expected,
        actual,
        expectedTotal: Number(plan.total),
        actualTotal: questionBank.length,
      });
      return generateLocalQuestionBank(setup, plan);
    }
  }

  const isTech = isTechnicalDomain(setup);
  if (!isTech) return questionBank;

  const codingLang = String(setup.codingLanguage || 'python').toLowerCase();
  const enriched = [...questionBank];
  const plannedWorkspace = hasPlannedSections
    ? Number(plan.coding) + Number(plan.sql)
    : null;

  // 1. Medium Tier Pseudocode Check
  const hasPseudocode = enriched.some(
    q => q.text.toLowerCase().includes('pseudocode') || String(q.questionType).toLowerCase().includes('pseudocode')
  );

  const plannedVerbal = hasPlannedSections ? Number(plan.verbal) : null;
  if (!hasPseudocode && enriched.length >= 6 && (plannedVerbal === null || plannedVerbal >= 6)) {
    enriched[4] = {
      id: 5,
      difficultyTier: 'medium',
      type: 'verbal',
      section: 'verbal',
      questionType: 'pseudocode_logic',
      category: 'Medium / Pseudocode & Logic',
      text: `Pseudocode Challenge: Please write step-by-step pseudocode or explain the exact algorithmic logic to find the first non-repeating character in a string with O(n) time complexity.`,
      intent: 'Evaluate pseudocode logic and time complexity reasoning.',
      problem: null, constraints: [], examples: [], language: ''
    };

    enriched[5] = {
      id: 6,
      difficultyTier: 'medium',
      type: 'verbal',
      section: 'verbal',
      questionType: 'pseudocode_logic',
      category: 'Medium / Pseudocode & Logic',
      text: `Pseudocode Challenge: Write step-by-step pseudocode or outline the algorithm to validate if a given string containing brackets '()[]{}' is balanced using a stack data structure.`,
      intent: 'Evaluate stack data structure comprehension and pseudocode clarity.',
      problem: null, constraints: [], examples: [], language: ''
    };
  }

  // 2. Hard Tier Coding/SQL Workspace Check
  const hasPracticalWorkspace = enriched.some(
    q => q.type === 'coding' || q.type === 'sql' || q.section === 'coding' || q.section === 'sql'
  );

  if (!hasPracticalWorkspace && enriched.length >= 10 && (plannedWorkspace === null || plannedWorkspace > 0)) {
    enriched[8] = {
      id: 9,
      difficultyTier: 'hard',
      type: 'coding',
      section: 'coding',
      questionType: 'coding_workspace_problem',
      category: 'Hard / Coding Workspace',
      text: `Hands-on Coding Challenge: Write a function in ${codingLang} to solve the Two Sum Problem. Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. Optimize your code for O(n) time complexity.`,
      intent: 'Assess hands-on coding, workspace execution, and algorithmic optimization.',
      problem: {
        title: 'Two Sum Algorithmic Optimization',
        description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution.',
        inputFormat: 'nums = [2, 7, 11, 15], target = 9',
        outputFormat: '[0, 1]',
        sampleInput: '[2, 7, 11, 15], target = 9',
        sampleOutput: '[0, 1]'
      },
      constraints: ['2 <= nums.length <= 10^4', 'Target time complexity: O(n)'],
      examples: [{ input: 'nums = [2, 7, 11, 15], target = 9', output: '[0, 1]' }],
      language: codingLang
    };

    enriched[9] = {
      id: 10,
      difficultyTier: 'hard',
      type: setup.requiresSql ? 'sql' : 'coding',
      section: setup.requiresSql ? 'sql' : 'coding',
      questionType: setup.requiresSql ? 'sql_workspace_problem' : 'coding_workspace_problem',
      category: setup.requiresSql ? 'Hard / SQL Workspace' : 'Hard / Coding Workspace',
      text: setup.requiresSql 
        ? `Hands-on SQL Challenge: Write an SQL query to find the top 2 highest-earning employees in each department from an Employees table (columns: id, name, salary, department_id).` 
        : `Hands-on Coding Challenge: Write a function in ${codingLang} to reverse a singly linked list and return the head of the reversed list.`,
      intent: 'Assess hands-on database query construction or linked list pointer manipulation.',
      problem: {
        title: setup.requiresSql ? 'Top Department Earners Query' : 'Reverse Singly Linked List',
        description: setup.requiresSql ? 'Write a query to find employees with highest salaries per department.' : 'Reverse a singly linked list in O(n) time and O(1) space.',
        inputFormat: setup.requiresSql ? 'Employees (id, name, salary, department_id)' : 'head = [1, 2, 3, 4, 5]',
        outputFormat: setup.requiresSql ? 'Department, Employee, Salary' : '[5, 4, 3, 2, 1]'
      },
      constraints: setup.requiresSql ? ['Use DENSE_RANK() window functions'] : ['Time complexity: O(n)'],
      examples: [],
      language: setup.requiresSql ? 'sql' : codingLang
    };
  }

  return enriched;
};

module.exports = { generateLocalQuestionBank, isTechnicalDomain, enrichQuestionBank };
