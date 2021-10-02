let firebase = require('firebase') ;
let admin = require('firebase-admin');

class clientData {

	async getUserProfile(uid) {
		let userProfile = null ;

        {
            let doc = await admin.firestore().collection("users").doc(uid).get() ;
            userProfile = doc.data() ;
        }

		return userProfile ;
	}

	async getOwnedTags(uid) {
		let tags = [] ;

		{
            let snapshot = await admin.firestore().collection("tags").where('uid', '==', uid).get() ;
		
			for (let key in snapshot.docs) {
				tags.push(snapshot.docs[key].data()) ;
			}
        }

		return tags ;
	}

	async getTag(tagName) {
		let tag = null ;

        {
            let snapshot = await admin.firestore().collection("tags").where('name', '==', tagName).get() ;
		
			for (let key in snapshot.docs) {
				tag = snapshot.docs[key].data() ;
				break ;
			}
        }

		return tag ;
	}

	async setUserProfile(uid, data) {
		await admin.firestore().collection("users").doc(uid).set(data) ;
	}

	async addProject(project) {
		await admin.firestore().collection("projects").doc(project.projectId).set(project) ;
	}

	async deleteProject(projectId) {
		await admin.firestore().collection("projects").doc(projectId).delete() ;
	}

	async getSubtitles(projectId) {
		let subtitles = [] ;

		let snapshot = await admin.firestore().collection("subtitles").doc(projectId).collection("data").get() ;

		for (let key in snapshot.docs) {
			subtitles.push(snapshot.docs[key].data()) ;
		}

		return subtitles ;
	}

	async isExistingVideoId(videoId) {
		let snapshot = await admin.firestore().collection("projects").where("videoId", "==", videoId).get() ;
		
		if (snapshot.docs.length > 0) {
			return true ;
		} else {
			return false ;
		}
	}

	async getProject(projectId) {
		let project = null ;

        {
            let doc = await admin.firestore().collection("projects").doc(projectId).get() ;
            project = doc.data() ;
        }

		return project ;
	}

	async getProjects(tagId) {
		let projects = [] ;

		if (tagId == "") {
			return projects ;
		}

		let snapshot = await admin.firestore().collection("projects").where("tagId", "==", tagId).orderBy("date").get() ;
		
		for (let key in snapshot.docs) {
			projects.push(snapshot.docs[key].data()) ;
		}

		return projects ;
	}
}

module.exports =  new clientData;