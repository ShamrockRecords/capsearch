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

	async setUserProfile(uid, data) {
		await admin.firestore().collection("users").doc(uid).set(data) ;
	}
}

module.exports =  new clientData;