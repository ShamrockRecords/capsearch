var express = require('express');
let clientData = require('../modules/clientData') ;
let firebaseSession = require('../modules/firebase_session.js') ;
var router = express.Router() ;

const wrap = fn => (...args) => fn(...args).catch(args[2]) ;

router.get('/', wrap(async function(req, res, next) {
    let result = await firebaseSession.enter(req, res) ;

    if (result != 0) {
        res.redirect('/signin');
        return ;
    }

    let currentUser = req.session.user ;

    let tags = await clientData.getOwnedTags(currentUser.uid) ;
  
    res.render('tags', {tags: tags});		 
})) ;

module.exports = router;