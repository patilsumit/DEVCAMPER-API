const express = require('express');
const {register, login, getme, forgetPassword, resetPassword, updateDetails,updatePassword,logout} = require('../controllers/auth');

const {protect} = require('../middleware/auth');
const router = express.Router();

router
    .route('/register')
    .post(register);

router
    .route('/login')
    .post(login);

router.get('/logout', logout);
router.get('/me', protect, getme);

router.put('/updatedetails',protect, updateDetails);

router.put('/updatepassword',protect, updatePassword);

router.post('/forgetpassword', forgetPassword);

router.put('/resetpassword/:resettoken', resetPassword);


module.exports = router;
