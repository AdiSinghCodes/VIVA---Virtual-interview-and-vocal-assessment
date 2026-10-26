const User = require('../models/User');
const { isProfileComplete } = require('../services/profileService');
const ALLOWED=['fullName','phone','location','targetRole','experienceLevel','yearsExperience','currentRole','summary','skills','degree','university','graduationYear','interviewType','difficulty','language','linkedin','github','portfolio'];
async function getProfile(req,res){ const user=await User.findById(req.userId); if(!user)return res.status(404).json({message:'User not found.'}); res.json({profile:user.profile,profileCompleted:user.profileCompleted}); }
async function updateProfile(req,res){
 try { const user=await User.findById(req.userId); if(!user)return res.status(404).json({message:'User not found.'}); const incoming=req.body.profile||req.body; ALLOWED.forEach(k=>{if(incoming[k]!==undefined) user.profile[k]=String(incoming[k]);}); user.profileCompleted=isProfileComplete(user.profile); await user.save(); res.json({user:user.toJSON()}); }
 catch(e){console.error(e);res.status(500).json({message:'Unable to save profile.'});}
}
module.exports={getProfile,updateProfile};
