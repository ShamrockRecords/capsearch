var express = require('express');
let firebaseSession = require('../modules/firebase_session.js') ;
let admin = require('firebase-admin');
let clientData = require('../modules/clientData.js');
var router = express.Router() ;

const wrap = fn => (...args) => fn(...args).catch(args[2]) ;

router.get('/', wrap(async function(req, res, next) {
	res.render('index', {});		 
})) ;

router.get('/search', wrap(async function(req, res, next) {
    res.render('index', {});
})) ;

router.get('/search/:name', wrap(async function(req, res, next) {

	let tag = await clientData.getTag(req.params.name) ;

	if (tag == null) {
		res.redirect('/search') ;
	} else {
    	res.render('main', {tag: tag});
	}
})) ;

router.get('/signout', wrap(async function(req, res, next) {
	delete req.session.errorMessage;

	await firebaseSession.signOut(req, res, () => {
		res.redirect('/') ;
	}) ;
})) ;

module.exports = router;