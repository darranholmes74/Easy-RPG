import io from 'socket.io-client'

const URL = 'https://easy-rpg-backend.herokuapp.com/'
const URL2 = 'http://localhost:3001'

const socket = io(URL).connect()

// create a socket connection function

socket.on('connect', () => console.log('connected to socket'))
socket.on('connect_error', error => {
	console.log('connect error')
	socket.disconnect()
})

export default socket
