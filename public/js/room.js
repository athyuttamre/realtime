var socket = io.connect();

var room = meta('roomName');
var nickname = '';
var messagesIDs = [];

$(document).ready(function() {

	$('body').prepend("<div id='whitebox' style='display: none'><div id='nicknameContainer'>"
		+ "<div id='welcome'>Welcome to Room " + room + "!</div>"
		+ "<div id='pickNickname'>Pick a Nickname</div>"
		+ "<form id='nicknamePicker' action='/'><input id='nicknameInput' name='nicknameInput' autocomplete='off'></input></form></div></div>");
	
	$('#whitebox').fadeIn(200);
	$('#nicknameInput').focus();

	$('#nicknamePicker').submit(function(e) {
		e.preventDefault();
		nickname = $('#nicknameInput').val();
		moveToChat();
	})

	// Handle incoming messages
    socket.on('message', function(nickname, message, time){
        // display a newly-arrived message
        addNewMessage(nickname, message, time);
    });

    // Handle room membership changes
    socket.on('membershipChanged', function(members){
        // display the new member list
        $('#members-list').empty();
        for(var i = 0; i < members.length; i++) {
        	if(members[i] != null) {
        		$('#members-list').append('<li>' + members[i] + '</li>');
        	}
        }
    });
});

function moveToChat() {
	$('#whitebox').fadeOut(200, function() {
		this.remove();
	});
	$('#container').show();
	$('#messageField').focus();

	console.log('Joining Room ' + room);
	socket.emit('join', meta('roomName'), nickname, function(messages) {
		addMessages(messages);
	})

	var messageForm = document.getElementById('messageForm');
	messageForm.addEventListener('submit', sendNewMessage, false);
}

function addMessages(response) {
	var messagesContainer = $('#messagesContainer');
	var messagesData = JSON.parse(response);
	for(var i = 0; i < messagesData.length; i++) {
		var current = messagesData[i];
		var id = current.id;
		var nm = current.nickname;
		var body = current.body;
		var time = current.time;

		if(messagesIDs.indexOf(id) > -1) {
			continue;
		}
		else {
			messagesIDs.push(id);
			addNewMessage(nm, body, time);
			$("#messagesContainer").animate({ scrollTop: $("#messagesContainer")[0].scrollHeight}, 0);
		}
	}
}

function sendNewMessage(e) {
	// Preventing the page from redirecting
	e.preventDefault();

	// Get message data
	var message = $('#messageField').val();
	var time = (new Date()).getTime();

	// If empty message, do nothing
	if($('#messageField').val() == '') {
		return;
	}

	// Reset message field
	$('#messageField').val('');

	// Send it to the server
	console.log('Emitting message: ' + message + ' ' + time);
	socket.emit('message', message, time);
}

function changeNickname(newNickname) {
	socket.emit('nickname', newNickname);
}

function addNewMessage(nm, body, time) {
	var ul = $('#messagesContainer');
	var liClass = 'message';
	if(nm == nickname) {
		liClass += ' author';
	}
	var li = "<li class='" + liClass + "'><div class='nickname'>" + nm + "</div><div class='body'>" + body + "</div><div class='time'>" + time + "</div></li>";
	ul.append(li);
}

function meta(name) {
	var tag = document.querySelector('meta[name=' + name + ']');
	if(tag != null) {
		return tag.content;
	}
	return '';
}