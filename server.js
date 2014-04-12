// Initializing Server
var express = require('express');
var app = express();
var path = require('path'); // Using path module to easily serve static files and favicon

// Setting up Templating Engine
var engines = require('consolidate');
app.engine('html', engines.hogan); // Tell Express to run .html files through Hogan
app.set('views', __dirname + '/views'); // Tell Express where to find templates

// Setting up static files and favicon
app.use(express.static(path.join(__dirname, 'public'))); // Tell Express where to find static JS and CSS files
app.use(express.favicon(path.join(__dirname, 'public/images/favicon.ico'))); // Tell Express where to find favicon

// Connecting to Database
var anyDB = require('any-db');
var conn = anyDB.createConnection('sqlite3://chatroom.db');

// Creating TABLE messages
var query = 'CREATE TABLE messages (id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT, nickname TEXT, body TEXT, time INTEGER)';
conn.query(query).on('end', function() {
	console.log('Created TABLE');
})

app.use(express.bodyParser());

// GET request for Chatroom
app.get('/:roomName', function(request, response) {
	var name = request.params.roomName; // 'ABC123'
	console.log('GET request for room ' + name);
	response.render('room.html', {roomName: name});
	// Return chatroom HTML...
});

// POST request for Messages
app.post('/:roomName/messages', function(request, response) {
	var name = request.params.roomName;		// 'ABC123'
	var nickname = request.body.nickname;	// 'Miley'
	var message = request.body.message;		// 'I came in like a Wrecking Ballll!'
	var time = request.body.time;		// Milliseconds since 1970

	console.log('POST request for message from room ' + name);
	console.log('Nickname: ' + nickname + ' Message: ' + message + ' Time: ' + time);

	// POST to database...
	var q = conn.query('INSERT INTO messages (room, nickname, body, time) VALUES ($1, $2, $3, $4)', [name, nickname, message, time]);
	q.on('error', console.error);

	// Respond to client; if no response is recorded, browser retries request after 2 minutes, causing duplicate messages
	response.end('Message added to database.');
});	

// GET request for Messages
app.get('/:roomName/messages.json', function(request, response) {
	console.log('Client asking for messages.');
	// Fetch all of the messages for this room from TABLE messages
	var roomName = request.params.roomName;
	var messages = [];

	console.log('Retrieving message list for room ' + roomName);
	var q = conn.query('SELECT * FROM messages WHERE room=\'' + roomName + '\'');
	q.on('row', function(row) {
		var rowID = row.id;
		var rowNickname = row.nickname;
		var rowBody = row.body;
		var rowTime = new Date(row.time);

		var convertedTime = '';
		var hours = rowTime.getHours();
		var minutes = rowTime.getMinutes();

		if (minutes < 9) {
			minutes = '0' + minutes;
		}

		if(hours >= 12) {
			if(hours > 12) {
				hours = hours % 12;
			}
			convertedTime = hours + ':' + minutes + ' PM';
		}
		else {
			convertedTime = hours + ':' + minutes + ' AM';
		}

		var message = {
			id: rowID,
			nickname: rowNickname,
			body: rowBody,
			time: convertedTime
		}
		messages.push(message);
	});
	q.on('end', function() {
		console.log('Message list retrieved');
		console.log('Sending messages');
		// Encode the messages object as JSON and send it back
		response.json(messages);
	});
});

// POST request for new Chatroom
app.post('/', function(request, response) {
	console.log('POST request for new chatroom');
	var newRoomID = generateRoomIdentifier();
	// How to avoid infinite loop?
	while(chatroomExists(newRoomID)) {
		newRoomID = generateRoomIdentifier();
	}
	console.log('Redirecting to room ' + newRoomID);
	var newRoomURL = request.protocol + '://' + request.get('host') + '/' + newRoomID;
	console.log('Room URL: ' + newRoomURL);
	response.redirect(newRoomURL);
})

// GET request for root directory
app.get('/', function(request, response) {
	console.log('GET request for homepage');
	response.render('index.html');
});

// Live Server
app.listen(8080, function(error, response) {
	if(error) {
		console.log('Error: ' + error);
	}
	else {
		console.log('Server listening on Port ' + this.address().port);
	}
});

/// SOCKET CODE //////////////////////////////////////////////////////////

/// SUPPORT CODE /////////////////////////////////////////////////////////

function generateRoomIdentifier() {
	// Make a list of legal characters
	// We're intentionally excluding 0, O, I, and 1 for readability
	var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

	var result = '';
	for (var i = 0; i < 6; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}

	return result;
}

function chatroomExists(id) {
	conn.query('SELECT * FROM messages WHERE room=\'' + id + '\'', function(error, result) {
		return (result.rows.length != 0);
	});
}