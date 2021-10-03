var express = require('express');
let clientData = require('../modules/clientData') ;
let firebaseSession = require('../modules/firebase_session.js') ;
const multer = require('multer') ;
const upload = multer({ dest: 'uploads/' }) ;
const fs = require('fs')
var router = express.Router() ;

const wrap = fn => (...args) => fn(...args).catch(args[2]) ;

router.get('/', wrap(async function(req, res, next) {
    let result = await firebaseSession.enter(req, res) ;

    if (result != 0) {
        res.redirect('/signin');
        return ;
    }

    let project = await clientData.getProject(req.query.projectId) ;

    res.render('subtitles', {project: project});		 
})) ;

router.get('/data', wrap(async function(req, res, next) {
    let projectId = req.query.projectId ;

    let subtitles = await clientData.getSubtitles(projectId) ;

    let fillteredSubtitles = [] ;

	let pageCount = Math.floor((subtitles.length != 0 ? subtitles.length - 1 : 0) / 20) + 1 ;
	let page = req.query.page != undefined ? req.query.page : 0;
	let startIndex = page * 20 ;
	let count = 20 ;

	for (let i = startIndex; i < subtitles.length; i++) {
		let subtitle = subtitles[i] ;

		fillteredSubtitles.push(subtitle) ;

		count-- ;

		if (count == 0) {
			break ;
		}
	}

    let data = {
        subtitles: fillteredSubtitles,
        pageCount: pageCount,
        page: page} ;

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
})) ;

router.post('/upload', upload.single('file'), wrap(async function(req, res, next) {

    let data = [] ;

    try {
        let contents = fs.readFileSync(req.file.path, 'utf8')

        contents = contents.replace(/,/g, '.')

        contents.replace(
            /\d+\n^(\d+:.*)\n((?:(?!\d+:\d+:\d+).*\n*)+)\n$/gm,
            (string, time, text) => {
                if (time != "" && text != "") {
                    data.push({
                        time: {
                        start: timeToMillisec(time.split(' --> ')[0].replace(/,/g, '.')),
                        end: timeToMillisec(time.split(' --> ')[1].replace(/,/g, '.'))
                        },
                        text: text.trim().replace(/\n/g, '')
                    }) ;
                }
            }
        ) ;
    } catch (e) {
        console.log(e) ;
    }

    await clientData.setSubtitles(req.body.projectId, data) ;

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({}));
})) ;

function timeToMillisec(time) {
	var elements = time.split(':') ;
	var millisec = 0 ;

	millisec += Number(elements[0] * 60 * 60) ;
	millisec += Number(elements[1] * 60) ;
	millisec += Number(elements[2]) ;

	return millisec ;
}

module.exports = router;