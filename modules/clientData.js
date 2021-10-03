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

	async setSubtitles(projectId, data) {
		await admin.firestore().collection("subtitles").doc(projectId).set(
			{
				projectId: projectId,
				data: data
			}) ;
	}

	async getSubtitles(projectId) {
		let data ;
		
		try {
			data = (await admin.firestore().collection("subtitles").doc(projectId).get()).data() ;

			return data["data"] ;
		} catch (e) {
			return [] ;
		}
	}

	// Search
	async getProjectWithProjectId(tagId) {
		let projectWithProjectId = {} ;

		let snapshot = await admin.firestore().collection("projects").where("tagId", "==", tagId).get() ;

		for (let key in snapshot.docs) {
			let project = snapshot.docs[key].data() ;

			projectWithProjectId[project.projectId] = project ;
		}

		return projectWithProjectId ;
	}

	async searchSubtitles(projectWithProjectId, keyword) {
		let allProjectIds = Object.keys(projectWithProjectId) ;

		let searchResultsWithProjectId = {} ;

		try {
			let projectIdBlocks = [] ;
			let projectIdBlock = [] ;

			for (let key in allProjectIds) {
				projectIdBlock.push(allProjectIds[key]) ;

				if (projectIdBlock.length == 10) {
					projectIdBlocks.push(projectIdBlock) ;
					projectIdBlock = [] ;
				}
			}

			if (projectIdBlock.length > 0) {
				projectIdBlocks.push(projectIdBlock) ;
			}

			for (let key in projectIdBlocks) {
				let projectIds = projectIdBlocks[key] ;

				let snapshot = await admin.firestore().collection("subtitles").where("projectId", "in", projectIds).get() ;

				for (let key in snapshot.docs) {
					let subtitle = snapshot.docs[key].data() ;

					let project = projectWithProjectId[subtitle.projectId] ;

					if (project.videoTitle.toUpperCase().search(keyword.toUpperCase()) >= 0) {
						let contents = searchResultsWithProjectId[subtitle.projectId] ;

						if (contents == undefined) {
							contents = [] ;
							searchResultsWithProjectId[subtitle.projectId] = contents ;
						}
					}

					for (let key in subtitle.data) {
						let content = subtitle.data[key] ;

						if (content.text.toUpperCase().search(keyword.toUpperCase()) >= 0) {
							let contents = searchResultsWithProjectId[subtitle.projectId] ;

							if (contents == undefined) {
								contents = [] ;
								searchResultsWithProjectId[subtitle.projectId] = contents ;
							}

							content.projectId = subtitle.projectId ;
							content.time.start = Math.floor(content.time.start) ;
							contents.push(content) ;
						}
					}
				}
			}
		} catch (e) {
			console.log(e) ;
		}

		return searchResultsWithProjectId ;
	}

	// Projects
	async addProject(project) {
		await admin.firestore().collection("projects").doc(project.projectId).set(project) ;
	}

	async deleteProject(projectId) {
		await admin.firestore().collection("projects").doc(projectId).delete() ;
		await admin.firestore().collection("subtitles").doc(projectId).delete() ;
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
		try {
			let projects = [] ;

			if (tagId == "") {
				return projects ;
			}

			let snapshot = await admin.firestore().collection("projects").where("tagId", "==", tagId).orderBy("date", "desc").get() ;
			
			for (let key in snapshot.docs) {
				projects.push(snapshot.docs[key].data()) ;
			}

			return projects ;
		} catch (e) {
			console.log(e) ;
		}
	}

	// Others
	async isExistingVideoId(videoId) {
		let snapshot = await admin.firestore().collection("projects").where("videoId", "==", videoId).get() ;
		
		if (snapshot.docs.length > 0) {
			return true ;
		} else {
			return false ;
		}
	}
}

module.exports =  new clientData;