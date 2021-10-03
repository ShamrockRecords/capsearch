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

	let projects = await clientData.getProjects(tag.tagId) ;

	if (tag == null) {
		res.redirect('/search') ;
	} else {
    	res.render('main', 
		{
			tag: tag,
			projects: projects,
			pid: req.query.pid,
			q: req.query.q,
		});
	}
})) ;


router.get('/search/:name/data', wrap(async function(req, res, next) {
	let tag = await clientData.getTag(req.params.name) ;
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

router.get('/signout', wrap(async function(req, res, next) {
	delete req.session.errorMessage;

	await firebaseSession.signOut(req, res, () => {
		res.redirect('/') ;
	}) ;
})) ;

module.exports = router;