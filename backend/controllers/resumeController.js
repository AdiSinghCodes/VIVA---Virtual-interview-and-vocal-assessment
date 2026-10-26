const User = require('../models/User');
const { extractResumeText, inferProfile } = require('../services/resumeService');
const { calculateATS } = require('../services/atsService');
const llm = require('../services/interviewLLMService');

async function scoreResume(text, profile, overrides = {}) {
  const fallback = calculateATS(text, { ...profile, targetRole: overrides.targetRole || profile?.targetRole || '', jobDescription: overrides.jobDescription ?? profile?.targetJobDescription ?? profile?.jobDescription ?? '' });
  try {
    const response = await llm.analyzeResume({
      text, targetRole: overrides.targetRole || profile?.targetRole || '', skills: overrides.skills || profile?.skills || '',
      jobDescription: overrides.jobDescription ?? profile?.targetJobDescription ?? profile?.jobDescription ?? ''
    });
    if (response?.ats && Number.isFinite(Number(response.ats.score))) return response.ats;
  } catch (error) {
    console.warn('Pretrained semantic ATS scoring unavailable; using transparent fallback:', error?.message || error);
  }
  return fallback;
}
const { isProfileComplete } = require('../services/profileService');
async function uploadResume(req,res){
 try {
  if(!req.file)return res.status(400).json({message:'Resume file is required.'});
  const user=await User.findById(req.userId); if(!user)return res.status(404).json({message:'User not found.'});
  const text=await extractResumeText(req.file.path,req.file.originalname); if(!text.trim())return res.status(422).json({message:'Could not extract text. Please use a text-based PDF or DOCX.'});
  const current=user.profile.toObject ? user.profile.toObject() : {...user.profile};
  const resumeMeta={fileName:req.file.originalname,fileUrl:`/uploads/${req.file.filename}`,uploadedAt:new Date()};
  const inferred=inferProfile(text,current,resumeMeta);
  Object.keys(inferred).forEach(k=>{if(k==='resume')return; user.profile[k]=inferred[k];});
  user.profile.resume=inferred.resume;
  user.profileCompleted=isProfileComplete(user.profile);
  await user.save();
  res.json({user:user.toJSON(),ats:await scoreResume(text,user.profile)});
 } catch(e){console.error(e);res.status(500).json({message:e.message||'Resume processing failed.'});}
}
async function analysis(req,res){ const user=await User.findById(req.userId); if(!user)return res.status(404).json({message:'User not found.'}); const text=user.profile?.resume?.text||''; if(!text)return res.status(404).json({message:'No resume uploaded yet.'}); res.json({ats:await scoreResume(text,user.profile),resume:user.profile.resume}); }
async function analyzeForJob(req,res){
 try {
  const user=await User.findById(req.userId); if(!user)return res.status(404).json({message:'User not found.'});
  const text=user.profile?.resume?.text||''; if(!text)return res.status(404).json({message:'No resume uploaded yet.'});
  const targetRole=String(req.body?.targetRole||user.profile?.targetRole||'Software Engineer').slice(0,180);
  const jobDescription=String(req.body?.jobDescription||'').slice(0,12000);
  const ats=await scoreResume(text,user.profile,{targetRole,jobDescription});
  return res.json({ats,resume:user.profile.resume,targetRole,jobDescriptionProvided:Boolean(jobDescription)});
 } catch(e){ console.error('Custom resume analysis failed:',e); return res.status(500).json({message:e.message||'Resume analysis failed.'}); }
}
module.exports={uploadResume,analysis,analyzeForJob};
