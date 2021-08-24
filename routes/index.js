var express = require('express');
let firebaseSession = require('../modules/firebase_session.js') ;
let admin = require('firebase-admin');
var router = express.Router() ;

const wrap = fn => (...args) => fn(...args).catch(args[2]) ;

router.get('/', wrap(async function(req, res, next) {
    res.render('index', {});		 
})) ;

module.exports = router;