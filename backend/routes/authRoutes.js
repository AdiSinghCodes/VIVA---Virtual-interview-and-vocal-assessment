const router=require('express').Router(); const c=require('../controllers/authController'); const {requireAuth}=require('../middleware/authMiddleware');
router.post('/signup',c.signup); router.post('/login',c.login); router.get('/me',requireAuth,c.me); module.exports=router;
