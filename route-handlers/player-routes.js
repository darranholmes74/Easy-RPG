const express = require('express')
const cors = require('cors')
const app = express()
app.use(express.json())
app.use(cors)
const router = express.Router()

const randomFromTo = require('../game/lib/helperFunctions/RandomFromTo')
const classTypes = [
	'Barbarian',
	'Assassin',
	'Warrior',
	'Ranger',
	'Bard',
	'Black Mage',
	'Samurai',
	'Ninja',
	'Bandit',
	'Pirate',
	'Sniper',
	'Witch Doctor',
]

const mongoose = require('mongoose')

const Map = require('../game/Map')

const PlayerModel = require('../Models/player')

function getPresentableRooms(roomsArg) {
	let rooms = roomsArg
	let roomsToPresent = rooms.filter(
		room => !room.cleared && room.type !== 'starter'
	)

	return roomsToPresent.slice(0, 2)
}

router.get('/', (request, response) => {
	console.log('player route accessed')
	response.send('Player Route').status(200)
})

router.post('/change-info', async (request, response, next) => {
	try {
		const player = await PlayerModel.findOneAndUpdate(
			{ email: request.user.email },
			{ username: request.body.pName, class: request.body.pClass },
			{ new: true }
		)
		console.log(`player info updated on the database | ${player}`)
		response.status(202).send(player)
	} catch (err) {
		console.log(err + 'Error updating player info')
		response.status(400).send(err | `Unable to update database`)
	}

	// config = { url: '/change-name', body: {newName: newUsername}}
})

router.get('/get', async (request, response, next) => {
	const user = request.user

	try {
		const player = await PlayerModel.findOne({ email: user.email })

		if (player !== null) {
			console.log('found player')
			let noMapPlayer = { ...player._doc }
			noMapPlayer.map = ''

			response.json({
				player: noMapPlayer,
				room: player.map.rooms[player.position],
				presentableRooms: getPresentableRooms(player.map.rooms),
			}) /// returns 3 rooms to the client as options to go forward - onClick = axios.get('/move-player', {selectedRoom.index})  <- moves player.positon to selected Room
		} else {
			console.log('creating player')
			let newPlayer = await createNewPlayer(user.email, user.name, 0)
			let noMapPlayer = { ...newPlayer._doc }
			noMapPlayer.map = ''

			response.json({
				player: noMapPlayer,
				room: newPlayer.map.rooms[player.position],
				presentableRooms: newPlayer.map.presentableRooms,
			})
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

router.put('/move', async (request, response, next) => {
	console.log('moving position')

	// UPDATE ROOMS AND POSITION IF MORE ROOMS TO CLEAR
	try {
		let player = await PlayerModel.findOne({ email: request.user.email })

		let newPlayerMap = { ...player._doc.map }

		newPlayerMap.rooms[request.body.oldIndex].cleared = true

		let newPresentableRooms = getPresentableRooms(newPlayerMap.rooms)

		if (newPresentableRooms.length > 0) {
			let updatedPlayer = await PlayerModel.findOneAndUpdate(
				{ email: request.user.email },
				{
					position: request.body.index,
					map: newPlayerMap,
				},
				{ new: true }
			)

			console.log('successful move')

			response.status(202).send({
				updatedPlayer: updatedPlayer,
				newPresentableRooms: newPresentableRooms,
				message: 'player cleared room',
				room: updatedPlayer.map.rooms[updatedPlayer.index],
			})
		} else {
			// GIVE PLAYER NEW MAP AFTER CLEARING LAST ROOM
			let newMap = createNewMap()
			let newPresentableRoomsFromNewMap = getPresentableRooms(newMap.rooms)
			let updatedPlayer = await PlayerModel.findOneAndUpdate(
				{ email: request.user.email },
				{
					position: 0,
					map: newMap,
				},
				{ new: true }
			)

			console.log('Player cleared the floor!')

			response.status(202).send({
				updatedPlayer: updatedPlayer,
				room: player.map.rooms[0],
				newPresentableRooms: newPresentableRoomsFromNewMap,
				clearedFloor: true,
				message: 'Player Cleared Floor!',
			})
		}
	} catch (error) {
		console.log('We lost the new rooms', error)
		next()
	}
})

// enemy and player attack
router.get('/attack-enemy', async (request, response, next) => {
	console.log('attacking')
	try {
		let player = PlayerModel.findOne({ email: request.user.email })
		player.map[player.position].enemies = request.body.newEnemies

		let updatedPlayer = await PlayerModel.updateOne(
			player,
			{
				health: newPlayerHealth,
				map: player.map,
			},
			{ new: true }
		)

		response.send(updatedPlayer.map.rooms[player.position]).status(200)
	} catch (error) {
		console.log('error attacking enemy')
		next()
	}
})

// Add Gold
router.put('/add-gold', async (request, response, next) => {
	console.log('adding gold')
	try {
		// findOneAndUpdate({email}, {stats: { gold: newGold }}, {new:true})
		// newPlayerGold = player.gold + request.body.gold
		// res.send(updatedPlayer)
		let player = await PlayerModel.findOne({ email: request.user.email })
		const newPlayerPotions = player.stats.potions + 2
		const newPlayerGold = player.stats.gold + request.body.amountOfGold
		const newPlayerHealth = request.body.newPlayerHealth
		console.log(newPlayerHealth)

		let updatedPlayer = await PlayerModel.findOneAndUpdate(
			{ email: request.user.email },
			{
				stats: {
					...player.stats,
					gold: newPlayerGold,
					health: newPlayerHealth,
					potions: newPlayerPotions,
				},
			},
			{ new: true }
		)

		console.log('updated health', updatedPlayer.stats)

		response.status(202).send(updatedPlayer)
	} catch (error) {
		console.log('you might need a bank...')
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

router.put('/reset-player', async (request, response, next) => {
	const oldPlayer = request.body.oldPlayer
	let highestGold = 0
	if (oldPlayer.stats.gold > oldPlayer.highestGold) {
		highestGold = oldPlayer.stats.gold
	} else {
		highestGold = oldPlayer.highestGold
	}

	this.class = classTypes[randomFromTo(0, classTypes.length - 1)]

	const Player = await PlayerModel.findOneAndUpdate(
		{ email: request.user.email },
		{
			username: oldPlayer.username,
			class: this.class,
			highestGold: highestGold,
			stats: { health: 100, gold: 0, AP: 15, potions: 5 },
			position: 0,
			map: createNewMap(),
		},
		{ new: true }
	)

	response.status(200).send({
		authorizedPlayer: Player,
		room: Player.map.rooms[0],
		presentableRooms: getPresentableRooms(Player.map.rooms),
	})
})

// new player
createNewPlayer = async (email, username, highestGold) => {
	this.class = classTypes[randomFromTo(0, classTypes.length - 1)]
	const Player = await PlayerModel.create({
		email: email,
		username: username,
		class: this.class,
		highestGold: highestGold,
		stats: { health: 100, gold: 10, AP: 15, potions: 5 },
		position: 0,
		map: createNewMap(),
	})
	return Player
}

router.post('/new', async (request, response) => {
	let email = request.body.email
	let username = request.body.username

	createNewPlayer(email, username, 0)

	response.send('New Player Created').status(200)
})

module.exports = router

router.post('/update-map', async (request, response) => {})
