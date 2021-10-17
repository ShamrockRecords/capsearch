var express = require('express');
let firebaseSession = require('../modules/firebase_session.js') ;
let admin = require('firebase-admin');
let clientData = require('../modules/clientData.js');
var router = express.Router() ;
let fetch = require("node-fetch") ;
const uuid = require('node-uuid');

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

    let userProfile = await clientData.getUserProfile(currentUser.uid) ;

    if (userProfile == null) {
        let user ;

        try {
            user = await admin.auth().getUser(currentUser.uid) ;
        } catch (error) {
            
        }

        userProfile = {} ;

        userProfile["name"] = user.displayName ;
        userProfile["organization"] = "" ;
        userProfile["role"] = "0" ;
        userProfile["uid"] = user.uid ;

        clientData.setUserProfile(currentUser.uid, userProfile) ;
    }

    let tags = await clientData.getOwnedTags(currentUser.uid) ;

    if (userProfile.role == "0") {
        res.render('require', {userProfile: userProfile});	
    } else {
        let googleAuthURL = "https://accounts.google.com/o/oauth2/auth?";
        
        googleAuthURL += "client_id=" + process.env.GOOGLE_CLIENT_ID ;
        googleAuthURL += "&redirect_uri=" + encodeURIComponent(process.env.ROOT_URL + "/admin/oauth2callback") ;
        googleAuthURL += "&scope=https://www.googleapis.com/auth/youtube&response_type=code&access_type=offline" ;

        res.render('admin', {
            rootURL: process.env.ROOT_URL,
            googleAuthURL: googleAuthURL,
            userProfile: userProfile,
            tags: tags
        });	
    }	      
})) ;

router.get('/oauth2callback', wrap(async function(req, res, next) {
    let URL = "https://accounts.google.com/o/oauth2/token" ;

    let body = {} ;

    body["code"] = req.query.code ;
    body["client_id"] = process.env.GOOGLE_CLIENT_ID ;
    body["client_secret"] = process.env.GOOGLE_CLIENT_SECRET  ;
    body["redirect_uri"] = process.env.ROOT_URL + "/admin/oauth2callback" ;
    body["grant_type"] = "authorization_code" ;

    let data = {} ;

    let param = {
        method: "POST",
        "Content-Type": "application/json",
        body: JSON.stringify(body),
    } ;

    try {
        data = await fetch(URL, param)
        .then(response => response.json()) ;

        let currentUser = req.session.user ;

        let userProfile = await clientData.getUserProfile(currentUser.uid) ;

        userProfile.accessToken = data.access_token ;
        userProfile.refreshToken = data.refresh_token ;

        await clientData.setUserProfile(currentUser.uid, userProfile) ;

    } catch (e) {
        console.log(e) ;
    }

    res.redirect("/admin") ;
})) ;

router.get('/data', wrap(async function(req, res, next) {
    let tagId = req.query.tagId ;

    if (tagId == undefined) {
        tagId = "" ;
    }

    let projects = await clientData.getProjects(tagId) ;

    let fillteredProjects = [] ;

    let count = 10 ;
	let pageCount = Math.floor((projects.length != 0 ? projects.length - 1 : 0) / count) + 1 ;
	let page = req.query.page != undefined ? req.query.page : 0;
	let startIndex = page * count ;
	

	for (let i = startIndex; i < projects.length; i++) {
		let project = projects[i] ;

        /*
        let subtitles = await clientData.getSubtitles(project.projectId) ;

        if (subtitles.length > 0) {
            project.hasSubtitles = true ;
        } else {
            project.hasSubtitles = false ;
        }
        */
       
		fillteredProjects.push(project) ;

		count-- ;

		if (count == 0) {
			break ;
		}
	}

    let data = {
        projects: fillteredProjects,
        pageCount: pageCount,
        page: page} ;

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
})) ;

router.get('/tagsData', wrap(async function(req, res, next) {
    let currentUser = req.session.user ;

    let tags = await clientData.getOwnedTags(currentUser.uid) ;

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({tags: tags}));
})) ;

router.get('/delete', wrap(async function(req, res, next) {
    await clientData.deleteProject(req.query.projectId) ;       

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({}));
})) ;

router.get('/edit', wrap(async function(req, res, next) {
    let result = await firebaseSession.enter(req, res) ;

    if (result != 0) {
        res.redirect('/signin');
        return ;
    }

    let currentUser = req.session.user ;
    let project = {} ;

    if (req.query.projectId != undefined) {
        project = await clientData.getProject(req.query.projectId) ;
    }

    let tags = await clientData.getOwnedTags(currentUser.uid) ;

    res.render('editProject', {
        project: project,
        tags: tags
    });	
})) ;

router.post('/edit', wrap(async function(req, res, next) {

    let currentUser = req.session.user ;
    let project = {} ;
    let projectId = "" ;

    if (req.body.projectId != "") {
        projectId = req.body.projectId ;
    } else {
        projectId = uuid.v4().replace(/-/g, '') ;
    }

    project.date = new Date() ;
    project.videoTitle = req.body.videoTitle ;
    project.videoURL = req.body.videoURL ;
    project.videoId = req.body.videoId ;
    project.uid = currentUser.uid ;
    project.projectId = projectId ;
    project.tagId = req.body.tagId ;

    if (await clientData.isExistingVideoId(project.videoId) && req.body.projectId == "") {
        let tags = await clientData.getOwnedTags(currentUser.uid) ;

        res.render('editProject', {
            project: project,
            tags: tags
        });	
    } else {
        await clientData.addProject(project) ;        
        res.redirect('/admin');
    }
})) ;

router.get('/signout', wrap(async function(req, res, next) {
	delete req.session.errorMessage;

	await firebaseSession.signOut(req, res, () => {
		res.redirect('/') ;
	}) ;
})) ;

module.exports = router;