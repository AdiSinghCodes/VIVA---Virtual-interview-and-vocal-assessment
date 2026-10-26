const REQUIRED_PROFILE_FIELDS = ['fullName','phone','location','targetRole','experienceLevel','yearsExperience','currentRole','summary','skills','degree','university','graduationYear','interviewType','difficulty','language','linkedin','github','portfolio'];
function isProfileComplete(profile = {}) {
  return true;
}
module.exports = { REQUIRED_PROFILE_FIELDS, isProfileComplete };
