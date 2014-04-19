var socket = io.connect();

var room = meta('roomName');
var nickname = '';
var messagesIDs = [];

var typists = [];

$(document).ready(function() {

	// Initial Nickname Picking
	$('body').prepend("<div class='whitebox' style='display: none'><div class='nicknameContainer'>"
		+ "<div class='welcome'>Welcome to Room " + room + "!</div>"
		+ "<div class='pickNickname'>Pick a Nickname</div>"
		+ "<form class='nicknamePicker' action='/'><input class='nicknameInput' name='nicknameInput' autocomplete='off'></input></form></div></div>");
	
	$('.whitebox').fadeIn(200);
	$('.nicknameInput').focus();

	$('.nicknamePicker').submit(function(e) {
		e.preventDefault();
		nickname = $('.nicknameInput').val();
		moveToChat();
	})

	// Changing Nickname
	$("#changeNickname").on('click', function(e) {
		e.preventDefault();

		// Show Change Nickname whitebox
		$('body').prepend("<div class='whitebox' style='display: none'><div class='nicknameContainer'>"
		+ "<div class='pickNickname'>Change Nickname</div>"
		+ "<form class='nicknameChanger' action='/'><input class='nicknameInput' name='nicknameInput' autocomplete='off'></input></form></div></div>");
	
		$('.whitebox').fadeIn(200);
		$('.nicknameInput').focus();

		$('.nicknameChanger').submit(function(e) {
			e.preventDefault();
			nickname = $('.nicknameInput').val();
			socket.emit('nickname', nickname);

			removeWhitebox();
		});

		// Click outside to remove whitebox
		$('.whitebox').on('click', removeWhitebox);
		$('.pickNickname, .nicknameInput').on('click', function(e) {
			e.stopPropagation();
		})
	});

	// Handle incoming messages
    socket.on('message', function(nickname, message, time){
        // display a newly-arrived message
        addNewMessage(nickname, message, time);
    });

    // Handle room membership changes
    socket.on('membershipChanged', function(members){
        // display the new member list
        var membersString = "<p>Online &#8594; " + renderNames(members);
        $('#active-members').empty();
        membersString += "</p>"
        $('#active-members').html(membersString)
    });

    // Handle typing status changes
    socket.on('typingChanged', function(name, change, speed) {
    	if(name == nickname) return;

    	if(change == 'start') {
    		if(typists.indexOf(name) < 0) {
    			console.log(name + ' started typing.');
    			typists.push(name);
    		}
    	} else if (change == 'stop') {
    		console.log(name + ' stopped typing.');
    		typists.splice(typists.indexOf(name), 1);
    	}

    	console.log('Currently Typing: ' + typists);

    	if(typists.length > 0) {
    		var typistsString = '';
    		if(typists.length == 1) {
    			typistsString = renderNames(typists) + ' is typing...';
    		} else {
    			typistsString = renderNames(typists) + ' are typing...';
    		}
    		$('#typing-members').html(typistsString);
    		$('#typing-members').fadeIn(speed);
    	} else {
    		$('#typing-members').fadeOut(speed);
    	}
    });

    // Detect typing status
    var typingTimer;
    $("#messageField").keypress(function(){
    	socket.emit('startedTyping')
    	if(typingTimer != undefined) clearTimeout(typingTimer);
    	typingTimer = setTimeout(function() {socket.emit('stoppedTyping', 'fast')}, 1500);
    });
});

function removeWhitebox() {
	$('.whitebox').fadeOut(200, function() {
		this.remove();
		$('#messageField').focus();
	});
}

function moveToChat() {
	removeWhitebox();
	$('#container').show();

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
	socket.emit('stoppedTyping', 0);
}

function changeNickname(newNickname) {
	socket.emit('nickname', newNickname);
}

function addNewMessage(nm, body, time) {
	var typingBox = $('#typing-members-container');
	var liClass = 'message';
	if(nm == nickname) {
		liClass += ' author';
	}
	var li = "<li class='" + liClass + "'><div class='nickname'>" + nm + "</div><div class='body'>" + body + "</div><div class='time'>" + time + "</div></li>";
	typingBox.before(li);

	$("#messagesContainer").animate({ scrollTop: $("#messagesContainer")[0].scrollHeight}, 0);
}

function renderNames(names) {
	var namesString = '';
	for(var i = 0; i < names.length; i++) {
		if(names.length == 1) {
			namesString = names[i];
		} else if(i == names.length - 1) {
			namesString = namesString.substring(0, namesString.length - 2) + ' and ' + names[i];
		} else {
			namesString += names[i] + ', ';
		}
	}
	return namesString;
}

function meta(name) {
	var tag = document.querySelector('meta[name=' + name + ']');
	if(tag != null) {
		return tag.content;
	}
	return '';
}