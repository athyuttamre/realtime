// Initializing Server
var http = require('http');
var express = require('express');
var app = express();
var server = http.createServer(app);
var path = require('path'); // Using path module to easily serve static files and favicon

// Add socket.io
var io = require('socket.io').listen(server);
io.set('log level', 1); // Reduce logging (number of debug messages)

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

server.listen(8080, function() {
	console.log('Server listneing on Port ' + this.address().port);
});

/// SOCKET CODE //////////////////////////////////////////////////////////

io.sockets.on('connection', function(socket) {
	// Client joined new room
    socket.on('join', function(roomName, nickname, callback) {
        socket.join(roomName); // this is a socket.io method
        socket.roomName = roomName;
        socket.nickname = nickname;

        console.log('Client ' + nickname + ' joined Room ' + roomName);

        // Get a list of messages currently in the room, then send it back
        var messages = getMessages(roomName, callback);
        broadcastMembership(roomName);
    });

    // Client changed nickname
    socket.on('nickname', function(nickname) {
    	console.log('Nickname changed from ' + socket.nickname + ' to ' + nickname);
        socket.nickname = nickname;
        broadcastMembership(roomName);
    });

    // Client sent a new message
    socket.on('message', function(message, time) {
        // Process an incoming messages
        var roomName = socket.roomName;
        var nickname = socket.nickname;

        console.log('New message to room ' + roomName);
		console.log('Nickname: ' + nickname + ' Message: ' + message + ' Time: ' + time);

		// POST to database
		var q = conn.query('INSERT INTO messages (room, nickname, body, time) VALUES ($1, $2, $3, $4)', [roomName, nickname, message, time]);
		q.on('error', console.error);

		// Broadcast new message
		io.sockets.in(roomName).emit('message', nickname, message, convertTime(time));
    });

    // Client disconnected / closed their browser window
    socket.on('disconnect', function() {
    	console.log(socket.nickname + ' left Room ' + socket.roomName);
        broadcastMembership(socket.roomName);
    });
});

/// SUPPORT CODE /////////////////////////////////////////////////////////

// Sends latest messages to client
function getMessages(requestedRoomName, callback) {
	console.log('Client asking for messages.');

	// Fetch all of the messages for this room from TABLE messages
	var roomName = requestedRoomName;
	var messages = [];

	console.log('Retrieving message list for room ' + roomName);
	var q = conn.query('SELECT * FROM messages WHERE room=\'' + roomName + '\'');

	q.on('row', function(row) {
		var rowID = row.id;
		var rowNickname = row.nickname;
		var rowBody = row.body;
		var convertedTime = convertTime(row.time);

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

		// Encode the messages object as JSON and send it back to client
		console.log('Retrieved messages from database: ' + messages);
		console.log('Sending messages');
		callback(JSON.stringify(messages));
	});
}

function broadcastMembership(roomName) {
	console.log('Broadcasting membership for Room ' + roomName);
	var sockets = io.sockets.clients(roomName);

	var nicknames = sockets.map(function(socket) {
		return socket.nickname;
	});

	console.log('Active Members: ' + nicknames);
	io.sockets.in(roomName).emit('membershipChanged', nicknames);
}

function convertTime(millisecondsTime) {
	var givenTime = new Date(millisecondsTime);

	var convertedTime = '';
	var hours = givenTime.getHours();
	var minutes = givenTime.getMinutes();

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

	return convertedTime;
}

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