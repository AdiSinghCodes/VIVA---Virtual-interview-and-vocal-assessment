const User = require('../models/User');
const Interview = require('../models/Interview');

async function createInterview(req, res) {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: 'User not found.'
      });
    }

    if (!user.profileCompleted) {
      return res.status(403).json({
        message: 'Complete your profile before starting an interview.'
      });
    }

    // Save the complete interview setup
    const setup = {
      domain: req.body.domain || '',
      subDomain: req.body.subDomain || req.body.sub || '',
      role: req.body.role || '',
      objective: req.body.objective || '',
      types: Array.isArray(req.body.types)
        ? req.body.types
        : [],
      stage: req.body.stage || '',
      companyType: req.body.companyType || '',
      company: req.body.company || '',
      duration: Number(req.body.duration || 45),
      difficulty: req.body.difficulty || '',
      language: req.body.language || 'English',
      useResume: Boolean(req.body.useResume),
      customTopics: req.body.customTopics || '',
      codingLanguage: req.body.codingLanguage || 'python',

      // Keep profile/resume information used by the AI
      profile: req.body.profile || user.profile || null,
      resume: req.body.resume || user.profile?.resume || null
    };

    const interview = await Interview.create({
      userId: user._id,
      setup,
      status: 'created'
    });

    return res.status(201).json({
      id: interview._id.toString(),
      interviewId: interview._id.toString(),
      createdAt: interview.createdAt,
      setup
    });

  } catch (error) {
    console.error(
      'Create interview error:',
      error
    );

    return res.status(500).json({
      message:
        error.message ||
        'Failed to create interview.'
    });
  }
}

module.exports = {
  createInterview
};