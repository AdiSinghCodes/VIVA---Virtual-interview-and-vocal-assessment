const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function tokenFor(user) { return jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET || 'change-this-secret', { expiresIn: '7d' }); }
function payload(user) { const obj = user.toJSON(); obj.id = obj._id; delete obj._id; return obj; }

async function signup(req,res) {
  try {
    const { email, password, firstName, lastName, companyName = '' } = req.body;
    if (!email || !password || !firstName || !lastName) return res.status(400).json({message:'First name, last name, email and password are required.'});
    if (password.length < 6) return res.status(400).json({message:'Password must be at least 6 characters.'});
    const normalized = email.toLowerCase().trim();
    if (await User.findOne({ email: normalized })) return res.status(409).json({message:'An account with this email already exists.'});
    const user = await User.create({ email: normalized, passwordHash: await bcrypt.hash(password,12), firstName, lastName, companyName });
    res.status(201).json({token:tokenFor(user), user:payload(user)});
  } catch(e) { console.error(e); res.status(500).json({message:'Unable to create account.'}); }
}
async function login(req,res) {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({message:'Email and password are required.'});

    let user = await User.findOne({email});
    if (!user) {
      // Instant auto-provisioning for testing without pre-registration
      const passwordHash = await bcrypt.hash(password, 12);
      const handle = email.split('@')[0] || 'demo';
      const parts = handle.split(/[._-]/);
      const firstName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Demo';
      const lastName = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : 'Candidate';
      user = await User.create({
        email,
        passwordHash,
        firstName,
        lastName,
        profileCompleted: true,
        profile: {
          fullName: `${firstName} ${lastName}`,
          targetRole: 'Software Engineer',
          experienceLevel: 'Mid-Level',
          summary: 'Software developer testing VIVA AI platform overview.',
          skills: 'JavaScript, TypeScript, React, Node.js, Python, SQL',
          degree: 'B.S. Computer Science',
          graduationYear: '2024'
        }
      });
    } else {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) return res.status(401).json({message:'Invalid email or password.'});
    }
    res.json({token:tokenFor(user), user:payload(user)});
  } catch(e) { console.error(e); res.status(500).json({message:'Unable to sign in.'}); }
}
async function me(req,res) { const user=await User.findById(req.userId); if(!user)return res.status(404).json({message:'User not found.'}); res.json({user:payload(user)}); }
module.exports={signup,login,me,payload};
