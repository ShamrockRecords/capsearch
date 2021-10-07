var express = require('express');
let firebaseSession = require('../modules/firebase_session.js') ;
let admin = require('firebase-admin');
let clientData = require('../modules/clientData.js');
var router = express.Router() ;

const wrap = fn => (...args) => fn(...args).catch(args[2]) ;

router.get('/', wrap(async function(req, res, next) {
	res.render('index', {rootURL: process.env.ROOT_URL});		 
})) ;

router.get('/tagData', wrap(async function(req, res, next) {
	let tags = await clientData.getAllTags() ;

	res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(
		{
			tags: tags,
		}
	));	 
})) ;

router.get('/search', wrap(async function(req, res, next) {
    res.render('index', {});
})) ;

router.get('/search/:name', wrap(async function(req, res, next) {

	let tag = await clientData.getTagByName(req.params.name) ;

	let projects = await clientData.getProjects(tag.tagId) ;

	if (tag == null) {
		res.redirect('/search') ;
	} else {

		projects.sort(function(a,b){
			if (a.videoTitle < b.videoTitle) {
				 return -1;
			} else if( a.videoTitle > b.videoTitle ) {
				return 1;
			} else {
				return 0;
			}
		});

		var host = req.headers.host ;
  		var protocol = "https" ;

  		var ogURL = protocol + "://" + host + req.url ;
		
    	res.render('main', 
		{
			ogURL: ogURL,
			tag: tag,
			projects: projects,
			pid: req.query.pid,
			q: req.query.q,
		});
	}
})) ;

router.get('/search/:name/data', wrap(async function(req, res, next) {
	let tag = await clientData.getTagByName(req.params.name) ;
	let searchWord = req.query.q ;
	let projectId = req.query.pid ;

	if (searchWord == "") {
		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify(
			{
				projectWithProjectId: {},
				searchResultsWithProjectId: {}
			}
		));
		return ;
	}

	let projectWithProjectId = await clientData.getProjectWithProjectId(tag.tagId) ;
		
	if (projectId != "") {
		let project = projectWithProjectId[projectId] ;

		projectWithProjectId = {} ;
		projectWithProjectId[project.projectId] = project ;
	}

	let searchResultsWithProjectId = await clientData.searchSubtitles(projectWithProjectId, req.query.q) ;

	res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(
		{
			projectWithProjectId: projectWithProjectId,
			searchResultsWithProjectId: searchResultsWithProjectId
		}
	));
})) ;

/*
router.get('/download', wrap(async function(req, res, next) {
	let projectWithProjectId = {} ;

	{
		let snapshot = await admin.firestore().collection("projects").get() ;

		for (let key in snapshot.docs) {
			let project = snapshot.docs[key].data() ;

			projectWithProjectId[project.projectId] = project ;
		}
	}

	let snapshot = await admin.firestore().collection("subtitles").get() ;

	let contents = [] ;

	contents.push("projectId,tagId,startTime,content") ;

	for (let key in snapshot.docs) {
		let subtitle = snapshot.docs[key].data() ;

		for (let key in subtitle.data) {
			let content = subtitle.data[key] ;
			let project = projectWithProjectId[subtitle.projectId] ;

			contents.push(subtitle.projectId + "," + project.tagId + "," + content.time.start + ",\"" + content.text + "\"") ;
		}
	}

	res.setHeader('Content-disposition', 'attachment; filename=data.csv');
	res.setHeader('Content-Type', 'text/csv; charset=UTF-8');

	let csv = "" ;

	for (let key in contents) {
		csv += contents[key] + "\r\n" ;
	}
	
    res.end(csv);
})) ;
*/

router.get('/signout', wrap(async function(req, res, next) {
	delete req.session.errorMessage;

	await firebaseSession.signOut(req, res, () => {
		res.redirect('/') ;
	}) ;
})) ;

module.exports = router;