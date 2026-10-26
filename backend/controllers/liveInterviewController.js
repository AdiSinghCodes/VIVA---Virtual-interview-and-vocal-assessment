const { generateLocalQuestionBank, enrichQuestionBank } = require('../services/bankGenerator');
const Interview = require('../models/Interview');
const User = require('../models/User');
const llm = require('../services/interviewLLMService');

// ============================================================
// HELPERS
// ============================================================

function asArray(value) {
  if (Array.isArray(value)) {
    return value.map(String).map(x => x.trim()).filter(Boolean);
  }

  if (value === undefined || value === null || value === '') {
    return [];
  }

  return String(value).split(/[,;+]/).map(x => x.trim()).filter(Boolean);
}

// ============================================================
// WAIT / RETRY FOR PYTHON AI AGENT
// ============================================================

async function callWithRetry(fn, options = {}) {
  const maxAttempts = Number(options.maxAttempts || 30);
  const delayMs = Number(options.delayMs || 1000);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const code = error?.code || error?.cause?.code;
      const isConnectionRefused =
        code === 'ECONNREFUSED' ||
        String(error?.message || '').includes('ECONNREFUSED');

      if (!isConnectionRefused) {
        throw error;
      }

      if (attempt >= maxAttempts) {
        throw error;
      }

      console.log(
        `AI Interview Agent not ready. Retrying ${attempt}/${maxAttempts} in ${delayMs}ms...`
      );

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error('AI Interview Agent could not be reached.');
}

// ============================================================
// SETUP NORMALIZATION
// ============================================================

function cleanSetup(body = {}, user = null) {
  const types = asArray(
    body.types ?? body.interview_types ?? body.interviewTypes
  );

  const normalizedTypes = types.length ? types : asArray(body.interviewType);
  const profile = body.profile || user?.profile || null;

  const useResume = Boolean(body.useResume ?? body.use_resume);

  const setup = {
    domain: String(body.domain ?? body.primary_domain ?? '').trim(),
    subDomain: String(body.subDomain ?? body.sub_domain ?? body.sub ?? '').trim(),
    role: String(body.role ?? body.specific_role ?? '').trim(),
    objective: String(body.objective ?? body.interview_objective ?? '').trim(),

    types: normalizedTypes,
    interview_types: normalizedTypes,
    interviewType: String(
      body.interviewType ?? normalizedTypes.join(', ') ?? ''
    ).trim(),

    stage: String(body.stage ?? '').trim(),
    companyType: String(body.companyType ?? body.company_type ?? '').trim(),
    company: String(body.company ?? body.company_name ?? '').trim(),

    duration: Number(body.duration ?? body.duration_min ?? 45),

    questionCount: Number(
      body.questionCount ??
      body.question_count ??
      body.totalQuestions ??
      body.total_questions ??
      body.plannedQuestions ??
      body.planned_questions ??
      0
    ),

    difficulty: String(body.difficulty ?? '').trim(),
    language: String(body.language ?? 'English').trim(),

    useResume,
    use_resume: useResume,

    customTopics:
      Array.isArray(body.customTopics ?? body.custom_topics)
        ? (body.customTopics ?? body.custom_topics)
        : String(body.customTopics ?? body.custom_topics ?? '').trim(),

    codingLanguage: String(
      body.codingLanguage ?? body.coding_language ?? 'python'
    ).trim(),

    requiresCoding: Boolean(body.requiresCoding ?? body.requires_coding),
    requires_coding: Boolean(body.requiresCoding ?? body.requires_coding),

    requiresSql: Boolean(body.requiresSql ?? body.requires_sql),
    requires_sql: Boolean(body.requiresSql ?? body.requires_sql),

    isTechnical: Boolean(body.isTechnical ?? body.is_technical),
    is_technical: Boolean(body.isTechnical ?? body.is_technical),

    techStack: body.techStack ?? body.tech_stack ?? [],

    profile,

    resume: useResume
      ? (body.resume || profile?.resume || null)
      : null,
  };

  return setup;
}

// ============================================================
// BUILD A MINIMAL PYTHON-AGENT SETUP
// ============================================================

function buildAgentSetup(
  interviewOrSetup,
  interviewId = null,
  candidateResumeSummary = ''
) {
  const isInterview = Boolean(
    interviewOrSetup && interviewOrSetup.setup
  );

  const source = isInterview
    ? interviewOrSetup.setup
    : (interviewOrSetup || {});

  const id = interviewId ||
    (isInterview
      ? String(interviewOrSetup._id)
      : source.interviewId);

  const summary = candidateResumeSummary ||
    (isInterview
      ? interviewOrSetup.candidateResumeSummary
      : source.candidateResumeSummary) ||
    '';

  const setup = { ...source, interviewId: id || undefined };

  if (setup.useResume || setup.use_resume) {
    setup.candidateResumeSummary = summary;
    setup.resume = null;
    setup.profile = null;

    delete setup.resumeText;
    delete setup.resume_text;
    delete setup.resumeContent;
    delete setup.resume_content;
    delete setup.parsedResume;
    delete setup.parsed_resume;
  } else {
    setup.resume = null;
    setup.profile = null;
    setup.candidateResumeSummary = '';
  }

  return setup;
}

// ============================================================
// CLASSIFY INTERVIEW
// ============================================================

function classifyInterview(setup) {
  const types = (Array.isArray(setup.types) ? setup.types : [])
    .map(x => String(x).toLowerCase());

  const primaryDomain =
    `${setup.domain || ''} ${setup.subDomain || ''} ${setup.role || ''}`;

  const softwareDomain =
    /software|technology|technical|developer|programming|computer science|backend|frontend|full.?stack|data engineer|devops|machine learning|artificial intelligence/i
      .test(primaryDomain);

  const technical =
    setup.isTechnical ||
    softwareDomain ||
    types.some(t =>
      /technical|coding\s*\/\s*dsa|sql\s*\/\s*database|system design/i.test(t)
    );

  const wantsCoding =
    setup.requiresCoding ||
    softwareDomain ||
    types.some(t => /technical|coding|dsa/i.test(t));

  const wantsSql =
    setup.requiresSql ||
    softwareDomain ||
    /sql|database/i.test(primaryDomain) ||
    types.some(t => /technical|sql|database/i.test(t));

  return { technical, wantsCoding, wantsSql };
}

// ============================================================
// BUILD INTERVIEW PLAN
// ============================================================

function buildPlan(setup) {
  const explicitTotal = Number(
    setup.questionCount ??
    setup.question_count ??
    setup.totalQuestions ??
    setup.total_questions ??
    setup.plannedQuestions ??
    setup.planned_questions ??
    0
  );

  const durationTotal = Math.round(Number(setup.duration || 45) / 3);

  const requestedTotal = Math.max(
    1,
    Math.floor(
      Number.isFinite(explicitTotal) && explicitTotal > 0
        ? explicitTotal
        : durationTotal
    )
  );

  const { technical, wantsCoding, wantsSql } = classifyInterview(setup);

  if (!technical) {
    return {
      total: requestedTotal,
      verbal: requestedTotal,
      coding: 0,
      sql: 0,
    };
  }

  let availableTechnical = Math.max(
    0,
    requestedTotal - Math.min(4, requestedTotal)
  );

  let coding = 0;
  let sql = 0;

  if (wantsCoding && wantsSql) {
    while (availableTechnical > 0 && (coding < 2 || sql < 2)) {
      if ((coding <= sql && coding < 2) || sql >= 2) {
        coding += 1;
      } else if (sql < 2) {
        sql += 1;
      }

      availableTechnical -= 1;
    }
  } else if (wantsCoding) {
    coding = Math.min(2, availableTechnical);
  } else if (wantsSql) {
    sql = Math.min(2, availableTechnical);
  }

  const fixedTechnicalCount = coding + sql;

  return {
    total: requestedTotal,
    verbal: Math.max(0, requestedTotal - fixedTechnicalCount),
    coding,
    sql,
  };
}

// ============================================================
// CONVERT MONGODB HISTORY TO LLM HISTORY
// ============================================================

function historyFrom(interview) {
  return interview.answers.map(a => ({
    section: a.section,
    question: a.question,
    questionPayload: a.questionPayload,
    questionType: a.questionType,
    crossQuestion:
      a.questionType === 'cross_question' || Boolean(a.crossQuestion),
    isFollowUp:
      a.questionType === 'cross_question' || Boolean(a.crossQuestion),
    answer: a.answer,
    transcript: a.transcript,
    evaluation: a.evaluation,
    score: a.score,
    summary: a.evaluation?.summary || '',
  }));
}

function isCrossAnswer(answer) {
  return Boolean(
    answer?.questionType === 'cross_question' ||
    answer?.questionPayload?.questionType === 'cross_question' ||
    answer?.questionPayload?.crossQuestion ||
    answer?.crossQuestion
  );
}

function countMainQuestions(interview) {
  return interview.answers.filter(a => !isCrossAnswer(a)).length;
}

function countMainVerbalQuestions(interview) {
  return interview.answers.filter(
    a => a.section === 'verbal' && !isCrossAnswer(a)
  ).length;
}

function countSection(interview, section) {
  return interview.answers.filter(
    a => a.section === section && !isCrossAnswer(a)
  ).length;
}

// ============================================================
// FALLBACK QUESTIONS
// ============================================================

function buildFallbackAdaptiveQuestions(setup, history, count = 4) {
  const role = String(
    setup?.role || setup?.subDomain || setup?.domain || 'this role'
  );

  const prompts = [
    `For a ${role}, what is the most important decision you would expect to make, and what alternatives would you consider?`,
    `Describe a difficult challenge relevant to ${role} and how you would approach it step by step.`,
    `How would you measure whether your work in ${role} was successful? Give concrete indicators.`,
    `Tell me about a time you received critical feedback. What changed in your approach afterward?`,
    `What trade-offs do you consider when choosing between two reasonable approaches in ${role}?`,
    `What would you improve in a project or process you worked on, and why?`,
    `How do you explain a complex decision to a teammate or stakeholder who disagrees with you?`,
    `What would you prioritize in your first 30 days in ${role}, and how would you validate those priorities?`,
    `What assumptions could cause a project in ${role} to fail, and how would you test them early?`,
    `Describe how you handle uncertainty when you do not have enough information to make a decision.`,
    `What lesson from your past experience would you apply differently next time?`,
    `How do you keep your knowledge current and decide which new practices are worth adopting?`,
  ];

  return prompts
    .slice(0, Math.max(1, Math.min(Number(count) || 4, prompts.length)))
    .map((text, index) => ({
      section: 'verbal',
      type: 'verbal',
      questionType: 'adaptive_domain_question_fallback',
      category: `${setup?.domain || 'General'} / Adaptive Interview`,
      text,
      isFollowUp: false,
      fallback: true,
      fallbackIndex: index + 1,
    }));
}

function fallbackMainVerbalQuestion(setup, mainVerbalCount) {
  const role = String(
    setup?.role || setup?.subDomain || setup?.domain || 'this role'
  );

  const prompts = [
    `Tell me about a project or experience that best demonstrates your ability in ${role}. What was your personal contribution?`,
    `Describe a challenging problem related to ${role}. How did you analyze it and decide what to do?`,
    `Tell me about a decision you made in ${role} that involved trade-offs. What did you choose and why?`,
    `How do you evaluate the quality and impact of your work in ${role}? Give a concrete example.`,
  ];

  return {
    section: 'verbal',
    type: 'verbal',
    questionType: 'adaptive_domain_question_fallback',
    category: `${setup?.domain || 'General'} / Interview`,
    text: prompts[Math.min(Math.max(mainVerbalCount, 0), prompts.length - 1)],
    isFollowUp: false,
    fallback: true,
  };
}

function fallbackTechnicalQuestion(setup, codingCount, sqlCount, plan) {
  const wantsCoding =
    codingCount < plan.coding &&
    (codingCount <= sqlCount || sqlCount >= plan.sql);

  const section = wantsCoding ? 'coding' : 'sql';

  if (section === 'coding') {
    return {
      section: 'coding',
      type: 'coding',
      questionType: 'coding_workspace_problem',
      category: 'Coding / DSA',
      text: 'Given an array of integers and a target value, return the indices of two distinct elements whose values sum to the target. Explain your approach and time/space complexity.',
      problem: {
        statement: 'Return indices of two distinct array elements whose values sum to a target.',
        input: 'An integer array nums and integer target.',
        output: 'Two indices, if a solution exists.',
        starterCode: {},
      },
      constraints: [
        'Do not use the same element twice.',
        'Explain the expected time and space complexity.',
      ],
      examples: [
        {
          input: 'nums = [2, 7, 11, 15], target = 9',
          output: '[0, 1]',
        },
      ],
      language: setup?.codingLanguage || 'python',
    };
  }

  return {
    section: 'sql',
    type: 'sql',
    questionType: 'sql_workspace_problem',
    category: 'SQL / Database',
    text: 'Given an Employees table (employee_id, department_id, salary), write a SQL query to return the highest-paid employee or employees in each department, including ties.',
    problem: {
      statement: 'Return the highest-paid employee or employees in each department, including ties.',
      schema: 'Employees(employee_id, department_id, salary)',
    },
    constraints: [
      'Preserve ties for the maximum salary in each department.',
      'Explain how NULL salaries should be handled.',
    ],
    examples: [],
    language: 'sql',
  };
}

// ============================================================
// FOLLOW-UP RELEVANCE CHECK
// ============================================================

function isFollowUpRelevantToRole(setup, currentQuestion, followUpQuestion) {
  const roleContext = [
    setup?.domain,
    setup?.subDomain,
    setup?.role,
    setup?.objective,
    ...(Array.isArray(setup?.types) ? setup.types : []),
    setup?.customTopics,
  ].filter(Boolean).join(' ').toLowerCase();

  const current = String(currentQuestion || '').toLowerCase();
  const followUp = String(followUpQuestion || '').trim();

  if (!followUp) return false;

  const technicalRole =
    /software|technology|developer|programming|computer science|backend|frontend|full.?stack|data engineer|devops|machine learning|artificial intelligence|system design|coding|sql|database/i
      .test(roleContext);

  const hrRole =
    /human resources|\bhr\b|recruiter|recruitment|talent acquisition|applicant tracking/i
      .test(roleContext);

  const technicalTopic =
    /\b(ats|applicant tracking system|backend|frontend|api|sql|database|java|python|javascript|react|node\.?js|coding|codebase|repository|microservice|deployment|software architecture|candidate management|workflow component|technical stack)\b/i;

  if (
    technicalTopic.test(followUp) &&
    !technicalRole &&
    !technicalTopic.test(roleContext) &&
    !technicalTopic.test(current)
  ) {
    const isAtsOrRecruitmentTech =
      /\b(ats|applicant tracking system|candidate management|recruitment workflow|workflow component)\b/i
        .test(followUp);

    if (!(isAtsOrRecruitmentTech && hrRole)) return false;
  }

  const projectPivot =
    /recruitment ats|candidate management|workflow component/i.test(followUp);

  if (
    projectPivot &&
    !/recruitment ats|candidate management|workflow component/i.test(
      roleContext + ' ' + current
    ) &&
    !hrRole &&
    !technicalRole
  ) {
    return false;
  }

  return true;
}

// ============================================================
// ADAPTIVE QUESTION PREPARATION
// ============================================================

async function beginAdaptivePreparation(interview) {
  if (countMainVerbalQuestions(interview) < 4) return;

  if (['preparing', 'ready'].includes(interview.questionPreparationStatus)) {
    return;
  }

  interview.questionPreparationStatus = 'preparing';
  interview.questionPreparationError = '';
  await interview.save();

  const interviewId = String(interview._id);

  void (async () => {
    try {
      const fresh = await Interview.findById(interviewId);

      if (!fresh || fresh.status !== 'active') return;

      const plan = buildPlan(fresh.setup);

      const remainingTechnical =
        Math.max(0, plan.coding - countSection(fresh, 'coding')) +
        Math.max(0, plan.sql - countSection(fresh, 'sql'));

      const remainingAdaptive = Math.max(
        0,
        plan.total - fresh.answers.length - remainingTechnical
      );

      if (remainingAdaptive === 0) {
        const latest = await Interview.findById(interviewId);

        if (latest && latest.status === 'active') {
          latest.preparedQuestions = [];
          latest.preparedQuestionIndex = 0;
          latest.questionPreparationStatus = 'ready';
          latest.questionPreparationError = '';
          await latest.save();
        }

        return;
      }

      const introSummary = fresh.answers
        .filter(a => a.section === 'verbal' && !isCrossAnswer(a))
        .slice(0, 4)
        .map(a => ({
          question: a.question,
          answer: a.answer,
          score: a.score,
          evaluation: a.evaluation,
          summary: a.evaluation?.summary || '',
        }));

      const response = await llm.prepareFollowupQuestions({
        setup: buildAgentSetup(fresh),
        history: historyFrom(fresh),
        introSummary,
        count: Math.min(12, remainingAdaptive),
      });

      const questions = Array.isArray(response?.questions)
        ? response.questions.filter(
            q => q && String(q.text || q.question || '').trim()
          )
        : [];

      const latest = await Interview.findById(interviewId);

      if (!latest || latest.status !== 'active') return;

      latest.preparedQuestions = questions.map(q => ({
        ...q,
        text: String(q.text || q.question || ''),
        section: 'verbal',
        type: 'verbal',
        isFollowUp: false,
      }));

      latest.preparedQuestionIndex = 0;
      latest.questionPreparationStatus = questions.length ? 'ready' : 'failed';
      latest.questionPreparationError = questions.length
        ? ''
        : 'The question agent returned an empty adaptive question queue.';

      await latest.save();

      console.log(
        `Adaptive question queue ${questions.length ? 'ready' : 'empty'} for interview ${interviewId}`
      );
    } catch (error) {
      console.error(
        'Adaptive question preparation failed; using fallback queue:',
        error?.message || error
      );

      const latest = await Interview.findById(interviewId).catch(() => null);

      if (latest && latest.status === 'active') {
        const plan = buildPlan(latest.setup);

        const remainingTechnical =
          Math.max(0, plan.coding - countSection(latest, 'coding')) +
          Math.max(0, plan.sql - countSection(latest, 'sql'));

        const fallbackCount = Math.max(
          0,
          Math.min(
            12,
            plan.total - latest.answers.length - remainingTechnical
          )
        );

        latest.preparedQuestions = fallbackCount > 0
          ? buildFallbackAdaptiveQuestions(
              latest.setup,
              historyFrom(latest),
              fallbackCount
            )
          : [];

        latest.preparedQuestionIndex = 0;
        latest.questionPreparationStatus = 'ready';
        latest.questionPreparationError =
          `AI batch generation failed; using fallback questions: ${String(error?.message || 'unknown error')}`;

        await latest.save().catch(() => {});
      }
    }
  })();
}

// ============================================================
// SELECT NEXT MAIN QUESTION
// ============================================================

async function selectNextMainQuestion(interview, evaluation) {
  const setup = interview.setup || {};
  const agentSetup = buildAgentSetup(interview);
  const plan = buildPlan(setup);
  const classification = classifyInterview(setup);
  const history = historyFrom(interview);
  const mainVerbalCount = countMainVerbalQuestions(interview);
  const codingCount = countSection(interview, 'coding');
  const sqlCount = countSection(interview, 'sql');
  const questionIndex = interview.answers.length + 1;

  // Never produce another question once the selected limit is reached.
  if (interview.answers.length >= plan.total) {
    return { done: true };
  }

  await beginAdaptivePreparation(interview);

  if (mainVerbalCount < 4) {
    try {
      const generated = await callWithRetry(
        () => llm.generateNextQuestion({
          setup: agentSetup,
          history,
          questionIndex,
          section: 'verbal',
          lastEvaluation: evaluation,
        }),
        { maxAttempts: 3, delayMs: 500 }
      );

      return { nextQuestion: generated?.question || generated };
    } catch (error) {
      console.warn(
        'Verbal question generation failed; using fallback:',
        error?.message || error
      );

      return {
        nextQuestion: fallbackMainVerbalQuestion(setup, mainVerbalCount),
      };
    }
  }

  if (
    classification.technical &&
    (codingCount < plan.coding || sqlCount < plan.sql)
  ) {
    try {
      const generated = await callWithRetry(
        () => llm.generateNextQuestion({
          setup: agentSetup,
          history,
          questionIndex,
          section: 'auto',
          lastEvaluation: evaluation,
        }),
        { maxAttempts: 3, delayMs: 500 }
      );

      const question = generated?.question || generated;

      if (question?.preparationRequired) {
        return {
          preparationRequired: true,
          breakSeconds: 0,
          phase: 'preparing_adaptive_verbal',
        };
      }

      return { nextQuestion: question };
    } catch (error) {
      console.warn(
        'Technical question generation failed; using fallback:',
        error?.message || error
      );

      return {
        nextQuestion: fallbackTechnicalQuestion(
          setup,
          codingCount,
          sqlCount,
          plan
        ),
      };
    }
  }

  if (!classification.technical && !interview.adaptiveBreakCompleted) {
    return {
      preparationRequired: true,
      breakSeconds: 60,
      phase: 'preparing_adaptive_verbal',
    };
  }

  if (interview.questionPreparationStatus !== 'ready') {
    if (
      interview.questionPreparationStatus === 'idle' ||
      interview.questionPreparationStatus === 'failed'
    ) {
      interview.questionPreparationStatus = 'idle';
      await interview.save();
      await beginAdaptivePreparation(interview);
    }

    return {
      preparationRequired: true,
      breakSeconds: 0,
      phase: 'preparing_adaptive_verbal',
      preparationStatus: interview.questionPreparationStatus,
      message:
        interview.questionPreparationError ||
        'Preparing adaptive questions…',
    };
  }

  const queue = Array.isArray(interview.preparedQuestions)
    ? interview.preparedQuestions
    : [];

  const queueIndex = Number(interview.preparedQuestionIndex || 0);

  if (queueIndex < queue.length) {
    const rawQuestion = queue[queueIndex];

    const nextQuestion = {
      ...(rawQuestion?.toObject ? rawQuestion.toObject() : rawQuestion),
      section: 'verbal',
      type: 'verbal',
      isFollowUp: false,
    };

    interview.preparedQuestionIndex = queueIndex + 1;
    await interview.save();

    return { nextQuestion };
  }

  interview.questionPreparationStatus = 'idle';
  await interview.save();
  await beginAdaptivePreparation(interview);

  return {
    preparationRequired: true,
    breakSeconds: 0,
    phase: 'preparing_adaptive_verbal',
  };
}

// ============================================================
// AVERAGE SCORE
// ============================================================

function averageScore(answers) {
  if (!Array.isArray(answers) || !answers.length) return 0;

  const scored = answers
    .map(a => Number(a.score ?? a.evaluation?.score ?? 0))
    .filter(Number.isFinite);

  return scored.length
    ? Number(
        (
          scored.reduce((a, b) => a + b, 0) / scored.length
        ).toFixed(2)
      )
    : 0;
}

// ============================================================
// START INTERVIEW
// ============================================================

exports.start = async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.profileCompleted) {
      return res.status(403).json({
        message: 'Complete your profile first.',
      });
    }

    const setup = cleanSetup(req.body, user);

    if (
      !setup.domain ||
      !setup.subDomain ||
      !setup.role ||
      !setup.objective ||
      !setup.types.length
    ) {
      return res.status(400).json({
        message:
          'Domain, subdomain, role, objective and interview type are required.',
      });
    }

    const plan = buildPlan(setup);

    const interview = await Interview.create({
      userId: req.userId,
      setup,
      status: 'active',
      startedAt: new Date(),
      questionCount: plan.total,
    });

    const questionBank = [{
      id: 1,
      difficultyTier: 'easy',
      type: 'verbal',
      section: 'verbal',
      questionType: 'introduction',
      category: 'Introduction / Background',
      text: 'Please introduce yourself and walk me through your background, relevant experience, and one project you personally contributed to.',
      intent: 'Evaluate communication, background, ownership and clarity.',
    }];

    const q = questionBank[0];

    interview.questionBank = questionBank;
    await interview.save();

    void llm.preloadInterviewContext({
      setup: { ...setup, interviewId: String(interview._id) },
      interviewId: String(interview._id),
    })
      .then(async r => {
        if (r?.candidateSummary) {
          await Interview.updateOne(
            { _id: interview._id },
            {
              $set: {
                candidateResumeSummary: String(r.candidateSummary).slice(0, 1600),
              },
            }
          );
        }

        console.log(
          `Interview RAG preload ${r?.ok ? 'ready' : 'fallback'} for ${interview._id}`
        );
      })
      .catch(e =>
        console.warn(
          'Background interview RAG preload failed:',
          e?.message || e
        )
      );

    const clientSetup = { ...setup, profile: null, resume: null };

    return res.json({
      interviewId: String(interview._id),
      setup: clientSetup,
      plan,
      question: q,
      questionBank,
    });
  } catch (e) {
    console.error('Start interview failed:', e);

    return res.status(500).json({
      message: e?.message || 'Failed to start interview',
    });
  }
};

// ============================================================
// ANSWER INTERVIEW QUESTION
// ============================================================

exports.answer = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found.' });
    }

    if (interview.status !== 'active') {
      return res.status(400).json({ message: 'Interview is not active.' });
    }

    const plan = buildPlan(interview.setup);
    const history = historyFrom(interview);

    const question = String(req.body.question || '').trim();

    const answer = String(
      req.body.answer ?? req.body.transcript ?? ''
    ).trim();

    const transcript = String(
      req.body.transcript ?? answer
    ).trim();

    const section = ['verbal', 'coding', 'sql'].includes(req.body.section)
      ? req.body.section
      : 'verbal';

    const codingSubmission = req.body.codingSubmission || null;

    if (!question) {
      return res.status(400).json({ message: 'Question is required.' });
    }

    const skipped =
      Boolean(req.body.skipped) ||
      /^(skip|pass|i don['’]?t know|i do not know|idk|no idea)(\b.*)?$/i.test(answer);

    if (!answer && !codingSubmission && !skipped) {
      return res.status(400).json({ message: 'Answer is required.' });
    }

    const payload = {
      setup: buildAgentSetup(interview),
      plan,
      history,
      questionIndex: interview.answers.length + 1,
      currentQuestion: question,
      answer,
      transcript,
      section,
      codingSubmission,
    };

    const result = skipped
      ? {
          evaluation: {
            score: 0,
            correctness: 'Skipped / not answered',
            clarity: 'No answer provided',
            strengths: [],
            missingPoints: ['Candidate did not provide an answer.'],
            followUp: false,
            followUpReason:
              'Candidate skipped or indicated they did not know the answer.',
            followUpQuestion: '',
            summary: 'Skipped question recorded as 0/10.',
          },
          score: 0,
          followUp: false,
        }
      : await callWithRetry(
          () => llm.evaluateAnswer(payload),
          { maxAttempts: 30, delayMs: 1000 }
        );

    const evaluation = result?.evaluation || result || {};

    const score = Number(
      result?.score ?? evaluation?.score ?? 0
    );

    const followUp = Boolean(
      result?.followUp ?? evaluation?.followUp
    );

    const followUpReason = String(
      result?.followUpReason ?? evaluation?.followUpReason ?? ''
    );

    const isCrossQuestion = Boolean(
      req.body.crossQuestion ||
      req.body.questionPayload?.crossQuestion ||
      req.body.questionType === 'cross_question' ||
      req.body.questionPayload?.questionType === 'cross_question' ||
      /cross-question|follow-up/i.test(req.body.questionPayload?.category || '') ||
      /cross-question|follow-up/i.test(req.body.category || '')
    );

    const savedAnswer = {
      questionNumber: interview.answers.length + 1,
      section,
      questionType: isCrossQuestion
        ? 'cross_question'
        : (result?.questionType || section),
      crossQuestion: isCrossQuestion,
      question,
      questionPayload: req.body.questionPayload || null,
      answer: skipped
        ? (answer || '[Skipped — candidate did not know / chose to pass]')
        : answer,
      skipped,
      transcript,
      codingSubmission,
      followUp,
      followUpReason,
      evaluation,
      score,
      answeredAt: new Date(),
    };

    interview.answers.push(savedAnswer);
    await interview.save();

    if (countMainVerbalQuestions(interview) >= 4) {
      await beginAdaptivePreparation(interview);
    }

    // The selected question count is a hard limit across main questions
    // and cross-questions.
    const completedQuestionCount = interview.answers.length;
    const reachedPlan = completedQuestionCount >= plan.total;

    const shouldEnd =
      reachedPlan ||
      Boolean(result?.endInterview ?? evaluation?.endInterview);

    if (shouldEnd) {
      interview.status = 'completed';
      interview.completedAt = new Date();

      interview.durationSeconds = interview.startedAt
        ? Math.round((Date.now() - interview.startedAt.getTime()) / 1000)
        : 0;

      interview.finalScore = averageScore(interview.answers);

      interview.summary = {
        averageScore: interview.finalScore,
        questionCount: interview.answers.length,
        completedBecause: reachedPlan
          ? 'planned_question_count'
          : 'ai_end_interview',
        lastSummary:
          result?.summary ?? evaluation?.summary ?? '',
      };

      await interview.save();

      return res.json({
        done: true,
        evaluation,
        score,
        summary: interview.summary,
        interview: interview.toObject(),
      });
    }

    // --------------------------------------------------------
    // NEXT QUESTION
    // --------------------------------------------------------

    let next;

    const lastAns = interview.answers[interview.answers.length - 1];
    const lastWasCross = isCrossAnswer(lastAns);

    const candidateOptedOut =
      /i don['’]?t know|no idea|idk|pass|don['’]?t know/i.test(answer);

    const candidateFollowUp = String(
      result?.followUpQuestion ||
      evaluation?.followUpQuestion ||
      ''
    ).trim();

    const allowFollowUp = Boolean(
      followUp &&
      !lastWasCross &&
      !candidateOptedOut &&
      interview.answers.length < plan.total &&
      candidateFollowUp &&
      isFollowUpRelevantToRole(
        interview.setup,
        req.body.questionPayload?.text || req.body.question || question,
        candidateFollowUp
      )
    );

    if (followUp && candidateFollowUp && !allowFollowUp) {
      console.log(
        'Skipping follow-up: irrelevant to selected role or question-count limit.'
      );
    }

    if (allowFollowUp) {
      next = {
        section: 'verbal',
        type: 'verbal',
        questionType: 'cross_question',
        isFollowUp: true,
        crossQuestion: true,
        category: 'Targeted Follow-up',
        text: String(result.followUpQuestion || evaluation.followUpQuestion),
      };
    } else {
      const selection = await selectNextMainQuestion(interview, evaluation);

      if (selection?.preparationRequired) {
        return res.json({
          done: false,
          evaluation,
          score,
          followUp,
          followUpReason,
          preparationRequired: true,
          breakSeconds: Number(selection.breakSeconds || 0),
          phase: selection.phase || 'preparing_adaptive_verbal',
          message:
            selection.message ||
            'Preparing the next set of interview questions.',
        });
      }

      next = selection?.nextQuestion || selection;
    }

    await interview.save();

    return res.json({
      done: false,
      evaluation,
      score,
      followUp,
      followUpReason,
      nextQuestion: next,
    });
  } catch (e) {
    console.error('Answer processing failed:', e);

    return res.status(500).json({
      message: e?.message || 'Failed to process answer',
    });
  }
};

// ============================================================
// ADAPTIVE QUESTION PREPARATION STATUS
// ============================================================

exports.preparationStatus = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).lean();

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found.' });
    }

    return res.json({
      status: interview.questionPreparationStatus || 'idle',
      ready: interview.questionPreparationStatus === 'ready',
      error: interview.questionPreparationError || '',
      remaining: Math.max(
        0,
        (interview.preparedQuestions || []).length -
          Number(interview.preparedQuestionIndex || 0)
      ),
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || 'Could not read question preparation status.',
    });
  }
};

// ============================================================
// GET NEXT QUESTION AFTER A BREAK / BACKGROUND PREPARATION
// ============================================================

exports.nextQuestion = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found.' });
    }

    if (interview.status !== 'active') {
      return res.status(400).json({ message: 'Interview is not active.' });
    }

    const plan = buildPlan(interview.setup || {});

    // Hard-stop before selecting or generating another question.
    if (interview.answers.length >= plan.total) {
      interview.status = 'completed';
      interview.completedAt = new Date();
      interview.durationSeconds = interview.startedAt
        ? Math.round((Date.now() - interview.startedAt.getTime()) / 1000)
        : 0;
      interview.finalScore = averageScore(interview.answers);
      interview.summary = {
        averageScore: interview.finalScore,
        questionCount: interview.answers.length,
        completedBecause: 'planned_question_count',
        lastSummary: '',
      };

      await interview.save();

      return res.json({
        ok: true,
        done: true,
        message: 'Selected question limit reached.',
      });
    }

    const classification = classifyInterview(interview.setup || {});

    if (
      !classification.technical &&
      countMainVerbalQuestions(interview) >= 4
    ) {
      interview.adaptiveBreakCompleted = true;
      await interview.save();
    }

    const last = interview.answers[interview.answers.length - 1];

    const selection = await selectNextMainQuestion(
      interview,
      last?.evaluation || null
    );

    if (selection?.done) {
      return res.json({
        ok: true,
        done: true,
        message: 'Selected question limit reached.',
      });
    }

    if (selection?.preparationRequired) {
      return res.json({
        ok: true,
        preparationRequired: true,
        phase: selection.phase || 'preparing_adaptive_verbal',
        breakSeconds: Number(selection.breakSeconds || 0),
        message: selection.message || 'Questions are still being prepared.',
      });
    }

    return res.json({
      ok: true,
      preparationRequired: false,
      nextQuestion: selection?.nextQuestion || selection,
    });
  } catch (error) {
    console.error(
      'Get next interview question failed:',
      error?.message || error
    );

    return res.status(500).json({
      message: error?.message || 'Could not get the next question.',
    });
  }
};

// ============================================================
// TRANSCRIBE ANSWER AUDIO
// ============================================================

exports.transcribe = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'Audio file is required.',
      });
    }

    // Audio is only passed to Whisper.
    // It is not saved as an interview recording.

    const result = await llm.transcribe(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    return res.json(result);
  } catch (e) {
    console.error('Transcription failed:', e);

    return res.status(500).json({
      message: e?.message || 'Transcription failed',
    });
  }
};

// ============================================================
// COMPLETE INTERVIEW MANUALLY
// ============================================================

exports.complete = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found.' });
    }

    if (interview.status === 'active') {
      interview.status = 'completed';
      interview.completedAt = new Date();

      interview.durationSeconds = interview.startedAt
        ? Math.round((Date.now() - interview.startedAt.getTime()) / 1000)
        : 0;

      interview.finalScore = averageScore(interview.answers);

      const lastAnswer = interview.answers[interview.answers.length - 1];

      const lastSummary =
        lastAnswer?.evaluation?.feedback ||
        lastAnswer?.evaluation?.strengths ||
        (
          interview.answers.length
            ? `Candidate completed ${interview.answers.length} question(s).`
            : 'Interview ended by candidate.'
        );

      const isTabViolation =
        req.body?.reason === 'tab_switching_violation';

      interview.summary = {
        averageScore: interview.finalScore,
        questionCount: interview.answers.length,
        completedBecause: req.body?.reason || 'candidate_ended_interview',
        lastSummary: isTabViolation
          ? 'Interview terminated automatically due to repeated tab switching violations.'
          : lastSummary,
      };

      await interview.save();
    }

    return res.json({
      done: true,
      interview: interview.toObject(),
    });
  } catch (e) {
    console.error('Complete interview failed:', e);

    return res.status(500).json({
      message: e?.message || 'Failed to complete interview',
    });
  }
};

// ============================================================
// LIST COMPLETED INTERVIEWS / REPORTS
// ============================================================

exports.list = async (req, res) => {
  try {
    const interviews = await Interview.find({
      userId: req.userId,
      status: 'completed',
    })
      .sort({
        completedAt: -1,
        createdAt: -1,
      })
      .lean();

    return res.json({ interviews });
  } catch (e) {
    console.error('Load reports failed:', e);

    return res.status(500).json({
      message: e?.message || 'Failed to load reports',
    });
  }
};

// ============================================================
// GET SINGLE INTERVIEW
// ============================================================

exports.get = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).lean();

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found.' });
    }

    return res.json(interview);
  } catch (e) {
    console.error('Get interview failed:', e);

    return res.status(500).json({
      message: e?.message || 'Failed to get interview',
    });
  }
};

// ============================================================
// EXPORT HELPERS
// ============================================================

module.exports.cleanSetup = cleanSetup;
module.exports.buildPlan = buildPlan;
module.exports.callWithRetry = callWithRetry;