const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', { 
    failureRedirect: '/login',
    failureFlash: 'Failed Login!',
    successRedirect: '/',
    successFlash: 'You are now logged in!'
})

exports.logout = (req, res) => {
    req.logout();
    req.flash('success', 'You are now logged out!');
    res.redirect('/');
}

exports.isLoggedIn = (req, res, next) => {
    //check if the user is authenticated
    if(req.isAuthenticated()) {
        next();
        return
    } else {
        req.flash('error', 'You must be logged in to do that!');
        res.redirect('/login');
    }
}

exports.forgot = async (req, res) => {
    //1. see if usr with given email exists
    const user = await User.findOne({ email: req.body.email });
    if(!user) {
        req.flash('error', 'No account with that email exists!')
        return res.redirect('/login');
    }

    //2. ser reset tokens and expiry on their account
    user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordExpires = Date.now() + 3600000 // 1 hour from now
    await user.save();
    
    //3. send them and email eith the token
    const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
    mail.send({
        user,
        filename: 'password-reset',
        subject: 'Password Reset',
        resetURL
    });

    req.flash('success', `You have been emailed a password reset link.`);

    //4. redrect to login page
    res.redirect('/login');
};

exports.reset = async (req, res) => {
    const user = await User.findOne({ 
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
     });
     if(!user) {
         req.flash('error', 'Password reset is invalid or has expired');
         return res.redirect('/login');
     }
     //show password form if case there is a user
     res.render('reset', { title: 'Reset Your Password' });
};

exports.confirmedPasswords = (req, res, next) => {
    if(req.body.password === req.body['password-confirm']) { //this is how you acces a property when it has a dash in it!!!
        next();
        return; 
    } 
    req.flash('error', 'Passwords do not match!');
    res.redirect('back');
};

exports.update = async (req, res) => {
    const user = await User.findOne({ 
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });

    if(!user) {
        req.flash('error', 'Password reset is invalid or has expired');
        return res.redirect('/login');
    }

    const setPassword = promisify(user.setPassword, user);
    await setPassword(req.body.password);

    // get rid of token and expire date from MongoDB
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    const updatedUser = await user.save();
    await req.login(updatedUser);
    req.flash('success', 'Your password has been reset! You are now logged in!');
    res.redirect('/');
};
    
