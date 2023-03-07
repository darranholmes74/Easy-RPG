const express = require('express')
const router = express.Router()

const mongoose = require('mongoose')

const Map = require('../game/Map')

const PlayerModel = require('../Models/player')

router.get('/', (request, response) => {
	console.log('player route accessed')
	response.send('Player Route').status(200)
})

router.get('/get', async (request, response, next) => {
	const user = request.user

	try {
		const player = await PlayerModel.findOne({ email: user.email })

		if (player !== null) {

			response.status(200).send(player)
		} else {
			createNewPlayer(user.email, user.name)
			response.status(200).send(player)
		}

		/*{
            email,
            username,
            stats: { health, etc....}
        } */
	} catch (error) {
		console.log('error getting user')
		next()
	}
})

///////// GAME FUNCTIONS

// router.get ('/attack-enemy')
//choose room

// enemy and player attack
router.get('/attack-enemy', async (request, response) => {
	
	console.log('attacking')
	try{

	let player = PlayerModel.findOne({email: request.user.email})
	player.map[player.position].enemies = request.body.newEnemies

	let updatedPlayer = await PlayerModel.updateOne(player, {
			health: newPlayerHealth,
			map: player.map
		}, {new: true})

	res.send(updatedPlayer.map.rooms[player.position]).status(200)
	} catch(error) {
		console.log('error attacking enemy')
		next()
	}
})


///// PLAYER MAP 

router.get('/new-map', async (request, response, next) => {
	console.log('creating a new map')
	try {
		let updatedPlayer = await PlayerModel.findOneAndUpdate(
			{ email: request.user.email },
			{ map: createNewMap() },
			{ new: true }
		)
		
		response.status(200).send(updatedPlayer.map.rooms[updatedPlayer.position])
	} catch (error) {
		console.log('error adding map to player')
		next()
	}
})

createNewMap = () => {
	return new Map()
}



///// NEW PLAYER



// new player
createNewPlayer = async (email, username) => {
	const Player = await PlayerModel.create({
		email: email,
		username: username,
		stats: { health: 100, gold: 10, AP: 15 },
		position: 0
	})
}

router.post('/new', async (request, response) => {
	let email = request.body.email
	let username = request.body.username

	createNewPlayer(email, username)

	response.send('New Player Created').status(200)
})


module.exports = router

router.post('/update-map', async(request, response) => {
	
})