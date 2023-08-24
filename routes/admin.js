var express = require('express');
let firebaseSession = require('../modules/firebase_session.js') ;
let admin = require('firebase-admin');
let clientData = require('../modules/clientData.js');
var router = express.Router() ;
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
        res.render('admin', {
            rootURL: process.env.ROOT_URL,
            userProfile: userProfile,
            tags: tags
        });	
    }	      
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

router.get('/data4gpt', wrap(async function(req, res, next) {
	let result = await firebaseSession.enter(req, res) ;

    if (result != 0) {
        res.redirect('/signin');
        return ;
    }

    let projectId = req.query.projectId ;

    let results = await makeData(projectId) ;
    
    if (results.content != "") {
        res.setHeader('Content-disposition', `attachment; filename=${projectId}.tsv`);
        res.setHeader('Content-Type', 'text/csv; charset=UTF8');
        res.send(results.content) ;
    } else {
        res.setHeader('Content-disposition', `attachment; filename=${projectId}.txt`);
        res.setHeader('Content-Type', 'text/plain; charset=UTF8');
        res.send(results.error) ;
    }
})) ;

async function makeData(projectId) {
    let subtitles = await clientData.getSubtitles(projectId) ;
    let array = [] ;
    
    for (let key in subtitles) {
        let subtitle = subtitles[key] ;
        array.push(subtitle.text) ;
    }

    let authorization = process.env.OPEN_AI_KEY ;

    let messages = [
        {"role": "user", "content": '以下の内容からいい感じの質疑応答を作成してください。[{question : "質問", answer : "回答"}, ...] のようなJSON形式でお願いします。'},
        {"role": "user", "content": "---"},
        {"role": "user", "content": array.join("\r\n")},
    ] ;

    let body = {
        "model": "gpt-3.5-turbo-16k",
        "messages": messages,
        "temperature": 0.0
    } ;

    const param = {
        method: "POST",
        headers: {"Authorization": "Bearer " + authorization, "Content-Type": "application/json"},
        body: JSON.stringify(body)
    }
     
    let data = await fetch("https://api.openai.com/v1/chat/completions", param).then(response => response.json()) ;
    
    let content = "" ;
    let error = "" ;

    try {
        if (data.error != undefined) {
            error = data.error.message ;
        } else if (data.choices[0].message != undefined) {
            let lines = JSON.parse(data.choices[0].message.content) ;
            let csvLines = [] ;

            for (let key in lines) {
                let element = lines[key] ;

                csvLines.push(element.question + "\t" + element.answer) ;
            }

            content = csvLines.join("\n") ;
        }
    } catch (e) {
        error = e.message ;
    }

    return {"content": content, "error" : error} ;
}

module.exports = router;