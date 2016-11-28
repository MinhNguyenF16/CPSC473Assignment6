var express = require("express"),
    http = require("http"),
	app = express(),
    mongoose = require("mongoose"),
    redis = require("redis"),
    redisClient,
	port = process.env.PORT || 3000,
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
    counts = {},
	clients = [];
app.use(express.static(__dirname + "/client"));
var bodyParser = require('body-parser');
var userList = [];

app.use(bodyParser.urlencoded({
    extended: true
}));

mongoose.connect('mongodb://localhost/homework4', function() {
    // To clear database manually, uncomment line below:
    //mongoose.connection.db.dropDatabase();
});

//create client to connect to redis
client = redis.createClient();
server.listen(port, function() {
  console.log('Server is listening on port:3000"');  
});

//LOAD A SET OF QUESTIONS
var data = [
	{ 'question' : 'Which is the only American state to begin with the letter P?',
	'answer' : 'Pennsylvania'},
	{ 'question' : 'Whats the worlds biggest island?',
	'answer' : 'Greenland'},
	{ 'question' : 'What is the worlds longest river?',
	'answer' : 'Amazon'},
	{ 'question' : 'Whats the name the worlds largest ocean?',
	'answer' : 'Pacific'},
	{ 'question' : 'What is the diameter of Earth?',
	'answer' : '8000 miles'},
	{ 'question' : 'What is the capital city of Spain?',
	'answer' : 'Madrid'},
	{ 'question' : 'Which country is Prague in?',
	'answer' : 'Czech Republic'},
	{ 'question' : 'What colour jersey is worn by the winners of each stage of the Tour De France?',
	'answer' : 'Yellow'},
	{ 'question' : 'Name the country where you would find the Cresta Run?',
	'answer' : 'Switzerland'},
	{ 'question' : 'Which chess piece can only move diagonally?',
	'answer' : 'Bishop'}
];

var QuestionSchema = mongoose.Schema({
    question: String,
    answer: String
});

var Question = mongoose.model("Question", QuestionSchema);

Question.insertMany(data);

var index = 0;
var lastIndex = 0;

io.on('connection', function(socket){ //SAMPLE FROM SOCKET.IO CHAT
	console.log('A new user connected');
	clients.push(socket);
	socket.on('emitQuestion', function(msg){
		io.emit('emitQuestion', msg);
	});
	socket.on('emitScore', function(msg){
		io.emit('emitScore', msg);
	});
	socket.on('emitAnswer', function(msg){
		io.emit('emitAnswer', msg);
	});
    
	socket.on('disconnect', function(){
		clients.splice(clients.indexOf(socket), 1);
		console.log('A user disconnected: ' + socket.user );

        // remove username from the list
        for (var x = 0; x < userList.length; x++){
            if (userList[x] == socket.user){
                userList.splice(x,1);
            }
        }
        // remove username from other clients
        io.emit('removeUser', socket.user);
	});

    socket.on('newUser', function(newUsername) {
        console.log('A user connected: ' + newUsername);

        userList.push(newUsername);

        // each session has its own username as socket.user
        socket.user = newUsername;

        io.emit('newUser', newUsername);
    });
});

app.get('/users', function(req,res){
    res.json(userList);
});


app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');	
});

app.get('/score', function(req, res) {
    client.mget(["right", "wrong"], function(err, results) {
        if (err !== null) {
            console.log("ERROR: " + err);
            return;
        }
        // put the results of searching right and wrong into our counts
        counts.right = parseInt(results[0], 10) || 0;
        counts.wrong = parseInt(results[1], 10) || 0;
        console.log("Right:");
        console.log(counts.right);
        console.log("Wrong:");
        console.log(counts.wrong);
        res.json(counts);
    });
});

app.get('/question', function(req, res) { //CHANGED TO LOOP THROUGH QUESTIONS
    Question.find({}, function(err, result) {
        if (err !== null) {
            // the element did not get saved!
            res.send("ERROR");
        }
        console.log(JSON.stringify(result[index]));
        // check if we are out of questions in Database
        if (index < result.length) {
            var questionWithId = {
                question: result[index].question
            };
			lastIndex = index;
            index += 1;
            res.json(questionWithId);
        } else {
			lastIndex = index;
			index = 0;
			var questionWithId = {
                question: result[index].question
            };
			index += 1;
			res.json(questionWithId);
        }
    });
});

app.post('/answer', function(req, res) { //CHANGED TO GO BY LAST INDEX INSTEAD OF FINDING THROUGH QUESTION ID
    console.log(req.body);
    Question.find({}, function(err, result) {
        if (err !== null) {
            // the element id doesnt exist
            res.send("ERROR");
        }
        console.log("here..");
        console.log(JSON.stringify(result[lastIndex]));
        JSON.stringify(result[lastIndex]);
        // if the answer is correct then incr right
        if (result[lastIndex].answer == req.body.answer) {
            console.log("nice answer");
            client.incr("right");
            res.json({
                correct: 'true',
                answer: req.body.answer
            });
        }
        // if the answer is wrong then incr wrong
        else {
            console.log("bad answer");
            client.incr("wrong");
            res.json({
                correct: 'false',
                answer: 'Try again!' 
            });
        }
    });
});

app.post('/resetScore', function(req, res) {
    client.flushall();
    res.send("score resetted....");
});
