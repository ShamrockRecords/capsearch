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

router.get('/edit', wrap(async function(req, res, next) {
    let result = await firebaseSession.enter(req, res) ;

    if (result != 0) {
        res.redirect('/signin');
        return ;
    }

    let tag = await clientData.getTagById(req.query.tagId) ;

    res.render('tagEdit', {tag: tag});		 

})) ;

router.post('/edit', wrap(async function(req, res, next) {

    let tag = await clientData.getTagById(req.body.tagId) ;

    tag.displayName = req.body.displayName ;
    tag.description = req.body.description ;
    tag.url = req.body.url ;

    await clientData.setTag(tag) ;

    res.redirect("/admin/tags") ;
})) ;

module.exports = router;