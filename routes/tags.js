var express = require('express');
let clientData = require('../modules/clientData') ;
let firebaseSession = require('../modules/firebase_session.js') ;
const uuid = require('node-uuid');
var router = express.Router() ;

const wrap = fn => (...args) => fn(...args).catch(args[2]) ;

router.get('/', wrap(async function(req, res, next) {
    let result = await firebaseSession.enter(req, res) ;

    if (result != 0) {
        res.redirect('/signin');
        return ;
    }

    let currentUser = req.session.user ;
    let userProfile = await clientData.getUserProfile(currentUser.uid) ;

    if (userProfile.role == "0") {
        res.render('require', {userProfile: userProfile});	
    } else {
        let tags = await clientData.getOwnedTags(currentUser.uid) ;
    
        res.render('tags', 
        {
            userProfile: userProfile,
            tags: tags
        });	
    }	 
})) ;

router.get('/edit', wrap(async function(req, res, next) {
    let result = await firebaseSession.enter(req, res) ;

    if (result != 0) {
        res.redirect('/signin');
        return ;
    }

    let tag = {} ;

    if (req.query.tagId != undefined) {
        tag = await clientData.getTagById(req.query.tagId) ;
    }

    res.render('tagEdit', {tag: tag});		 

})) ;

router.post('/edit', wrap(async function(req, res, next) {

    if (req.body.tagId == "") {
        
        let currentUser = req.session.user ;

        let tag = {} ;
        
        tag.name = req.body.name ;
        tag.displayName = req.body.displayName ;
        tag.description = req.body.description ;
        tag.url = req.body.url ;
        tag.isPublished = req.body.isPublished == "1" ;
        tag.uids = [currentUser.uid] ;
        
        if (await clientData.getTagByName(tag.name) != null) {
            res.render('tagEdit', {tag: tag});
            return ;
        }

        tag.tagId = uuid.v4().replace(/-/g, '') ;

        await clientData.setTag(tag) ;
    } else {
        let tag = await clientData.getTagById(req.body.tagId) ;

        tag.displayName = req.body.displayName ;
        tag.description = req.body.description ;
        tag.url = req.body.url ;
        tag.isPublished = req.body.isPublished == "1" ;

        await clientData.setTag(tag) ;
    }

    res.redirect("/admin/tags") ;
})) ;

router.get('/projectIds', wrap(async function(req, res, next) {
    let result = await firebaseSession.enter(req, res) ;

    if (result != 0) {
        res.redirect('/signin');
        return ;
    }

    let projectIds = [] ;

    let tagId = req.query.tagId ;

    if (tagId != undefined) {
        let projects = await clientData.getProjects(tagId) ;

        for (let key in projects) {
            let project = projects[key] ;

            projectIds.push(project.projectId) ;
        }
    }
    
    res.setHeader('Content-disposition', `attachment; filename=projectIds.txt`);
    res.setHeader('Content-Type', 'text/plain; charset=UTF8');
    res.send(projectIds.join("\r\n")) ;
})) ;

module.exports = router;