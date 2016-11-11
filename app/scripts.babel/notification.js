'use strict';

// Copyright (c) 2016 Ruzu. All rights reserved.
var not_list = [];
var questions = [];

// function prepQuestions() {
//     var jqxhr = $.get('http://www.memrise.com/ajax/courses/dashboard/?courses_filter=most_recent&offset=0&limit=4&get_review_count=false', function() {
//             console.log('success');
//         })
//         .done(function() {
//             console.log('second success');
//         })
//         .fail(function() {
//             console.log('error');
//         })
//         .always(function() {
//             console.log('finished');
//         });
// }

function popUpTest(question, answer1, answer2, answer3, answer4) {

    //Prep notification details
    var options = {
        type: 'basic',
        title: question,
        message: '',
        expandedMessage: 'blahblah',
        iconUrl: 'images/icon.png',
        buttons: [{
            title: answer1 + ' | ' + answer2,
        }, {
            title: answer3 + ' | ' + answer4,
        }],
        requireInteraction: true
    };

    //Create notifications and add to array for tracking
    chrome.notifications.create('', options, function(id) {
        console.log('Add notification to array: ' + id);
        not_list.push({
            notID: id,
            ques: question,
            a1: answer1,
            a2: answer2,
            a3: answer3,
            a4: answer4,
            stage: 1
        });

        console.log('notifications(' + not_list.length + ')');
        for (var i = 0; i < not_list.length; i++) {
            console.log(not_list[i].notID);
        }

        if (not_list.length > 2 /*TODO CONFIG VAR*/ ) {
            var removeNotID = not_list.shift().notID;
            console.log('clear overflow notification ' + removeNotID);
            chrome.notifications.clear(removeNotID);
        }
    });

}

function validNotID(notifId, callback) {
    for (var i = 0; i < not_list.length; i++) {
        if (not_list[i].notID == notifId) {
            callback(not_list[i]);
            return;
        }
    }
    callback(null);
}

function popUpTest2(notifId, question, answer1, answer2) {
    var options = {
        type: 'basic',
        title: question,
        message: 'Choose the correct answer.',
        iconUrl: 'images/icon.png',
        buttons: [{
            title: answer1,
        }, {
            title: answer2,
        }]
    };

    //Update notifications array
    for (var i = 0; i < not_list.length; i++) {
        if (not_list[i].notID == notifId) {
            not_list[i].stage = 2;
            not_list[i].f1 = answer1;
            not_list[i].f2 = answer2;
        }
    }
    console.log('notifications: ' + not_list);
    chrome.notifications.update(notifId, options);
    for (var i = 0; i < not_list.length; i++) {
        console.log(not_list[i].notID);
    }

}

function checkAnswer(ques, answer_in) {
    console.log('Send ' + answer_in);

    var correct_ans = 'Hello'; //API call to get this
    var resultCorrect = (answer_in == correct_ans); //API call to get this
    var notmessage, noIconUrl;

    if (resultCorrect) {
        notmessage = 'Correct!';
        noIconUrl = 'images/correct.png';
    } else {
        notmessage = 'Incorrect, answer is ' + correct_ans;
        noIconUrl = 'images/incorrect.png';
    }

    var options = {
        type: 'basic',
        title: ques,
        message: notmessage,
        contextMessage: 'You chose ' + answer_in,
        iconUrl: noIconUrl,
        isClickable: true
    };

    chrome.notifications.create('', options);

}

/* Respond to the user's clicking one of the buttons */
chrome.notifications.onButtonClicked.addListener(function(notifId, btnIdx) {

    validNotID(notifId, function(validNot) {
        console.log('validNot: ');
        console.log(validNot);
        if (validNot && validNot.stage == 1) {
            if (btnIdx === 0) {
                popUpTest2(notifId, validNot.ques, validNot.a1, validNot.a2);
            } else if (btnIdx === 1) {
                popUpTest2(notifId, validNot.ques, validNot.a3, validNot.a4);
            }
        } else if (validNot && validNot.stage == 2) {
            chrome.notifications.clear(notifId);
            if (btnIdx === 0) {
                checkAnswer(validNot.ques, validNot.f1);
                console.log('Check answer final ' + validNot.f1);
            } else if (btnIdx === 1) {
                checkAnswer(validNot.ques, validNot.f2);
                console.log('Check answer final ' + validNot.f2);
            }
        } else {
            console.log('fail if');
        }
    });

});

//Add listener for checkAnswer notification so that click to remove is possible
chrome.notifications.onClicked.addListener(function(notifId) {
    validNotID(notifId, function(validNot) {
        if (!validNot) {
            chrome.notifications.clear(notifId);
        }
    });
});

chrome.alarms.onAlarm.addListener(function(alarm) {
    console.log('Got an alarm!', alarm);
    if (alarm.name == 'Ruzu') {
        popUpTest('\uC548\uB155', 'Hello', 'Goodbye', 'Cat', 'Dog');
    }
});

function checkAlarm(alarmName, callback) {
    chrome.alarms.getAll(function(alarms) {
        var hasAlarm = alarms.some(function(a) {
            return a.name == alarmName;
        });
        callback(hasAlarm);
    });
}

function cancelAlarm(alarmName) {
    chrome.alarms.clear(alarmName);
}

function createAlarm(alarmName) {
    chrome.storage.sync.get({
        frequency: 5,
        enabled: true
    }, function(settings) {
        if (settings.enabled) {
            var alarmOptions = {
                delayInMinutes: Number(settings.frequency),
                periodInMinutes: Number(settings.frequency)
            }
            console.log('Creating alarm with the following settings:');
            console.log(alarmOptions);
            chrome.alarms.create(alarmName, alarmOptions);
        } else {
            cancelAlarm('Ruzu');
            console.log('Alarm cancelled / not created due to enabled flag being false.');
        }

    });
}


function initialSetUp(alarmExists) {
    cancelAlarm('Ruzu');
    createAlarm('Ruzu');
    if (alarmExists) {
        console.log('Alarm already exists.');
    } else {
        console.log('Alarm does not exist.');
    }
}

checkAlarm('Ruzu', initialSetUp);
//prepQuestions();
