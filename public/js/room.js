var messagesIDs = [];

$(document).ready(function() {
	var room = meta('roomName');
	$('body').prepend("<div id='whitebox' style='display: none'><div id='nicknameContainer'>"
		+ "<div id='welcome'>Welcome to Room " + room + "!</div>"
		+ "<div id='pickNickname'>Pick a Nickname</div>"
		+ "<form id='nicknamePicker' action='/'><input id='nicknameInput' name='nicknameInput' autocomplete='off'></input></form></div></div>");
	
	$('#whitebox').fadeIn(200);
	$('#nicknameInput').focus();

	$('#nicknamePicker').submit(function(e) {
		e.preventDefault();
		$('meta[name=nickname]').attr('content', $('#nicknameInput').val());
		moveToChat();
	})
});

function moveToChat() {
	$('#whitebox').fadeOut(200, function() {
		this.remove();
	});
	$('#container').show();
	$('#messageField').focus();
	refreshMessages();
	intervalID = setInterval(refreshMessages, 500);

	var messageForm = document.getElementById('messageForm');
	messageForm.addEventListener('submit', messageHandler, false);
}

function refreshMessages() {
	request('GET', '/' + meta('roomName') + '/messages.json', null, addMessages, 'Messages could not be loaded.');
}

function addMessages(response) {
	var messagesContainer = $('#messagesContainer');
	var messagesData = JSON.parse(response);
	for(var i = 0; i < messagesData.length; i++) {
		var current = messagesData[i];
		var id = current.id;
		var nickname = current.nickname;
		var body = current.body;
		var time = current.time;

		if(messagesIDs.indexOf(id) > -1) {
			continue;
		}
		else {
			messagesIDs.push(id);
			addNewMessage(nickname, body, time);
			$("#messagesContainer").animate({ scrollTop: $("#messagesContainer")[0].scrollHeight}, 0);
		}
	}
}

function messageHandler(e) {
	// Preventing the page from redirecting
	e.preventDefault();

	// Create a new FormData object from our form
	var fd = new FormData(document.getElementById('messageForm'));
	fd.append('nickname', meta('nickname'));
	fd.append('time', (new Date()).getTime());

	if($('#messageField').val() == '') {
		return;
	}

	$('#messageField').val('');
	// Send it to the server
	request('POST', '/' + meta('roomName') + '/messages', fd, messagePosted, 'Message could not be posted!');
}

function messagePosted(response) {
	;
}

function request(type, url, body, callback, message) {
	var req = new XMLHttpRequest();
	req.open(type, url, true);

	req.addEventListener('load', function(e) {
		if(req.status == 200) {
			var content = req.responseText;
			callback(content);
		}
		else {
			alert(message);
		}
	});

	req.send(body);
}

function addNewMessage(nickname, body, time) {
	var ul = $('#messagesContainer');
	var liClass = 'message';
	if(nickname == meta('nickname')) {
		liClass += ' author';
	}
	var li = "<li class='" + liClass + "'><div class='nickname'>" + nickname + "</div><div class='body'>" + body + "</div><div class='time'>" + time + "</div></li>";
	ul.append(li);
}

function meta(name) {
	var tag = document.querySelector('meta[name=' + name + ']');
	if(tag != null) {
		return tag.content;
	}
	return '';
}