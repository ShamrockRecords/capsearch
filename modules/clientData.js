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

	async getUserProfileFromTag(tag) {
		let userProfile = null ;

        {
            let snapshot = await admin.firestore().collection("users").where("tag", "==", tag).get() ;
		
			for (let key in snapshot.docs) {
				userProfile = snapshot.docs[key].data() ;
			}
        }

		return userProfile ;
	}

	async setUserProfile(uid, data) {
		await admin.firestore().collection("users").doc(uid).set(data) ;
	}

	async addProject(project) {
		await admin.firestore().collection("projects").doc(project.projectId).set(project) ;
	}

	async isExistingVideoId(videoId) {
		let snapshot = await admin.firestore().collection("projects").where("videoId", "==", videoId).get() ;
		
		if (snapshot.docs.length > 0) {
			return true ;
		} else {
			return false ;
		}
	}

	async getAllProjects() {
		let snapshot = await admin.firestore().collection("projects").orderBy("date").get() ;
		let projects = [] ;

		for (let key in snapshot.docs) {
			projects.push(snapshot.docs[key].data()) ;
		}

		return projects ;
	}
}

module.exports =  new clientData;