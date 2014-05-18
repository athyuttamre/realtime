Realtime
======

Realtime chatroom using socket.io.

##Workflow

To start running Realtime, <code>cd</code> into it's root directory, and first run <code>npm install</code> to install all the dependencies. Next, if the file <code>chatroom.db</code> already exists, delete it by running the command <code>rm chatroom.db</code>. Finally, run <code>node server.js</code> to run Realtime. Open a browser and navigate to <code>http://localhost:8080/</code> to use Realtime.

##Features

- Intuitive and beautiful user experience
- Messages sent and received instantly using socket.io
- Shows a list of online users
- Allows user to change nickname while in chatroom
- Shows typing status for other users e.g. "Katherine is typing..."
- Differentiates between current user's messages and messages of others in the room
