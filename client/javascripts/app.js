/* jshint browser: true, jquery: true, camelcase: true, indent: 2, undef: true, quotmark: single, 
maxlen: 80, trailing: true, curly: true, eqeqeq: true, forin: true, immed: true, latedef: true, 
newcap: true, nonew: true, unused: true, strict: true */
var main = function() {
    'use strict';
    var username = '';
    var socket = io.connect(''); 
    
    var viewmodel = {
        usernameForm: ko.observable(true),
        contentUnlock: ko.observable(false),
        username: ko.observable(''),
        question: ko.observable(''),
        score: ko.observable(''),
        usernameList: ko.observableArray([]),
        answer: ko.observableArray([])
    };

    // ACTIVATE KNOCK OUT
    ko.applyBindings(viewmodel);

    // get the list of current users online
    $.get('users', function(response) {
        for (var i = 0; i<response.length; i++){
            viewmodel.usernameList.push(response[i]);
        }
        console.log(response);
    });
        
    var getQuestion = function() {
        $.get('question', function(response) {
            console.log(response);
            if (response.question !== null) {
                socket.emit('emitQuestion', response.question);
            } 
        });
    };
    socket.on('emitQuestion', function(msg){
        viewmodel.question(msg);
    });

    $('.requestQ button').on('click', function() {
        getQuestion();
    });
    
    var getScore = function() {
        $.get('score', function(response) {
            console.log(response);
            socket.emit('emitScore', response);
        });
    };
    
    socket.on('emitScore', function(msg){
        var output = 'Right: ' + msg.right + '  Wrong: ' + msg.wrong;
        viewmodel.score(output);
    });
    
    $('.requestScore button').on('click', function() {
        getScore();
    });
    
    var checkAnswer = function() {
        var answer, userAnswer;
        if ($('.inputAnswer input').val() !== '') {
            answer = $('.inputAnswer input').val();
            userAnswer = {
                'answer': answer
            };
            $.post('answer', userAnswer, function(response) {
                console.log(response);
                socket.emit('emitAnswer', username + '\'s answer is '+
                    response.correct +' --> ' +response.answer);
                getScore();
            });
            $('.inputAnswer input').val('');
        }
    };
    
    socket.on('emitAnswer', function(msg){
        viewmodel.answer.push(msg);
    });
    
    $('.inputAnswer button').on('click', function() {
        checkAnswer();
    });
    
    $('.inputAnswer input').on('keypress', function(event) {
        if (event.keyCode === 13) {
            checkAnswer();
        }
    });

    $('#usernameInput').submit(function () {
        username = $('#username').val();
        viewmodel.usernameForm(false);
        viewmodel.contentUnlock(true);
        socket.emit('newUser', username);

        return false;
    });

    socket.on('newUser', function(username){
        viewmodel.usernameList.push(username);
    });

    socket.on('removeUser', function(username){
        viewmodel.usernameList.remove(username);
    });

};
$(document).ready(main);