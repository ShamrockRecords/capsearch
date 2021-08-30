var express = require('express');
let firebaseSession = require('../modules/firebase_session.js') ;
let admin = require('firebase-admin');
let clientData = require('../modules/clientData.js');
var router = express.Router() ;

const wrap = fn => (...args) => fn(...args).catch(args[2]) ;

router.get('/', wrap(async function(req, res, next) {
	let result = await firebaseSession.enter(req, res) ;

    if (result != 0) {
        if (result == 2) {
            res.render('verify', {});
            return ;
        }

        res.redirect('/signin');
        return ;
    }

    let currentUser = req.session.user ;

    let user ;

    try {
        user = await admin.auth().getUser(currentUser.uid) ;
    } catch (error) {
        
    }

    let userProfile = await clientData.getUserProfile(user.uid) ;

    if (userProfile == null) {
        userProfile = {} ;

        userProfile["name"] = "" ;
        userProfile["organization"] = "" ;
        userProfile["tag"] = "" ;
        userProfile["role"] = "0" ;

        clientData.setUserProfile(user.uid, userProfile) ;
    }

    if (userProfile.role == "0") {
        res.render('require', {user: user});	
    } else {
        res.render('admin', {user: user});	
    }	      
})) ;

router.get('/signout', wrap(async function(req, res, next) {
	delete req.session.errorMessage;

	await firebaseSession.signOut(req, res, () => {
		res.redirect('/') ;
	}) ;
})) ;

module.exports = router;