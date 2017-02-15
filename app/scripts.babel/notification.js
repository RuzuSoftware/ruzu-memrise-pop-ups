'use strict';

// Copyright (c) 2016 Ruzu Studios. All rights reserved.

var not_list = [];
var questions = [];
var qnum = 0;
var totalQnums = 0;
var things_seen = 0;
var sendAnswers = false;
var error_not;
var course_id;
var resp;
var everthing_ok = true;
var csrftoken;
var idleCount = 0;
var sessionOpen = false;

/*
 * Check if a notification is a valid Ruzu Memrise pop-up question
 * Then pass the not_list value to the callback
 * Note that this does not consider error notifications as valid
 */
function validNotID(notifId, callback) {
  for (var i = 0; i < not_list.length; i++) {
    if (not_list[i].notID == notifId) {
      callback(not_list[i]);
      return;
    }
  }
  callback(null);
}

function collectCSRF() {

  var xhr = new XMLHttpRequest();
  console.log('Collect csrf token...');
  sessionOpen = true;
  xhr.open('GET', 'https://www.memrise.com/course/' + course_id + '/', true);

  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      var text = xhr.responseText;
      var regex = /csrftoken: "(.*?)\"/;
      csrftoken = text.match(regex)[1];
    }
  }
  xhr.send();

}

function prepQuestions(callback) {
  chrome.storage.sync.get({
    courseID: defaultCourseID
  }, function(settings) {
    console.log('Got course ID: ' + settings.courseID);
    course_id = (settings.courseID ? settings.courseID : 0);
    var xhr = new XMLHttpRequest();
    console.log('Connect to course...');
    if (error_not) {
      chrome.notifications.clear(error_not);
    }
    xhr.open('GET', 'https://www.memrise.com/ajax/session/?course_id=' + course_id + '&session_slug=review_course', true);

    xhr.onreadystatechange = function() {

      if (xhr.readyState == 4) {

        var jsonOk = false;
        qnum = 0;
        things_seen = 0;
        totalQnums = 0;
        questions = [];

        // JSON.parse does not evaluate the attacker's scripts.
        try {
          resp = JSON.parse(xhr.responseText);
          jsonOk = true;
        } catch (e) {
          console.log('Error connecting to memrise.');
          console.log(e);
          if (course_id == '0') {
            errorNotifiction('invalid_course_id');
          } else {
            errorNotifiction(null);
          }
        }
        if (jsonOk) {
          setIconStatus('On');
          totalQnums = resp.boxes.length;
          for (var i = 0; i < totalQnums; i++) {

            //Shuffle answers by putting numbers 1 ~ 4 in an array for use later
            var orderArr = []
            while (orderArr.length < 4) {
              var randomnumber = Math.ceil(Math.random() * 4)
              if (orderArr.indexOf(randomnumber) > -1) continue;
              orderArr[orderArr.length] = randomnumber;
            }

            //Collect values from array once
            var question;
            var thing_id = resp.boxes[i].thing_id;
            var column_a = resp.boxes[i].column_a;
            var column_b = resp.boxes[i].column_b;
            var questionType = resp.things[thing_id].columns[column_b].kind;
            var choices_length = resp.things[thing_id].columns[column_a].choices.length;

            //Collect idx of 3 random choices
            var valueArr = []
            while (valueArr.length < 3) {
              var randomnumber = Math.ceil(Math.random() * choices_length) - 1
              if (valueArr.indexOf(randomnumber) > -1) continue;
              valueArr[valueArr.length] = randomnumber;
            }

            if (questionType == 'text') {
              question = resp.things[thing_id].columns[column_b].val;
            } else if (questionType == 'image') {
              question = 'https://static.memrise.com/' + resp.things[thing_id].columns[column_b].val[0].url;
            }

            //Add question to global question list
            questions[i] = {
              course_id: course_id,
              thing_id: thing_id,
              column_a: column_a,
              column_b: column_b,
              question: question,
              answer: resp.things[thing_id].columns[column_a].val,
              options: resp.things[thing_id].columns[column_a].choices,
              questionType: questionType
            }

            questions[i]['choice' + orderArr[0]] = resp.things[thing_id].columns[column_a].choices[valueArr[0]];
            questions[i]['choice' + orderArr[1]] = resp.things[thing_id].columns[column_a].choices[valueArr[1]];
            questions[i]['choice' + orderArr[2]] = resp.things[thing_id].columns[column_a].choices[valueArr[2]];
            questions[i]['choice' + orderArr[3]] = resp.things[thing_id].columns[column_a].val;

          }

          //Require for write mode
          //collectCSRF();

          if (callback) {
            callback(null);
          }
        }
      }
    }
    xhr.send();
  });
}

/*
 * Generate the initial question pop-up for a given qnum_id
 */
function popUpTest(qnum_id) {

  var question = questions[qnum_id].question;
  var trueAnswer = questions[qnum_id].answer;
  var answer1 = questions[qnum_id].choice1;
  var answer2 = questions[qnum_id].choice2;
  var answer3 = questions[qnum_id].choice3;
  var answer4 = questions[qnum_id].choice4;

  var optionsType;
  var optionsTitle;

  if (questions[qnum_id].questionType == 'text') {
    optionsType = 'basic';
    optionsTitle = question;
  } else if (questions[qnum_id].questionType == 'image') {
    optionsType = 'image';
    optionsTitle = 'Image';
  }

  //Prep notification details
  var options = {
    type: optionsType,
    title: optionsTitle,
    message: '',
    contextMessage: (qnum_id + 1) + '/' + totalQnums,
    iconUrl: 'images/icon48.png',
    buttons: [{
      title: answer1 + ' ' + spacer + ' ' + answer2,
    }, {
      title: answer3 + ' ' + spacer + ' ' + answer4,
    }],
    requireInteraction: true
  };

  if (questions[qnum_id].questionType == 'image') {
    options.imageUrl = question;
  }

  //Create notifications and add to array for tracking
  chrome.notifications.create('', options, function(id) {
    //Add notification to array
    not_list.push({
      notID: id,
      qnum_id: qnum_id,
      stage: 1
    });

    if (not_list.length > 2 /*TODO CONFIG VAR*/ ) {
      var removeNotID = not_list.shift().notID;
      //Clear overflow notification
      chrome.notifications.clear(removeNotID);
    }
  });

}

/*
 * Update a notification with stage 2 options depending
 * on the button clicked.
 */
function popUpTest2(btnIdx, notifId, qnum_id) {

  var answer1, answer2;

  if (btnIdx === 0) {
    var answer1 = questions[qnum_id].choice1;
    var answer2 = questions[qnum_id].choice2;
  } else {
    var answer1 = questions[qnum_id].choice3;
    var answer2 = questions[qnum_id].choice4;
  }

  var options = {
    message: 'Choose the correct answer.',
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

  chrome.notifications.update(notifId, options);

}

/*
 * Revert a buttion at stage 2 to stage 1 to
 * show all 4 options again as it did initially
 */
function revertQuestion(notifId, qnum_id) {

  var answer1 = questions[qnum_id].choice1;
  var answer2 = questions[qnum_id].choice2;
  var answer3 = questions[qnum_id].choice3;
  var answer4 = questions[qnum_id].choice4;

  var options = {
    message: '',
    buttons: [{
      title: answer1 + ' ' + spacer + ' ' + answer2,
    }, {
      title: answer3 + ' ' + spacer + ' ' + answer4,
    }]
  };

  chrome.notifications.update(notifId, options);

  //Mark notification as stage 1
  not_list.map(function(not) {
    if (not.notID == notifId) {
      not.stage = 1;
    }
  });

}

/*
 * Send the selected answer to memrise
 */
function sendAnswer(answer_data) {

  var data = jQuery.param(answer_data);

  var xhr = new XMLHttpRequest();
  xhr.withCredentials = true;

  xhr.onreadystatechange = function() {
    if (this.readyState == 4) {
      console.log(this.responseText);
    }
  };

  xhr.open('POST', 'https://www.memrise.com/api/garden/register/');
  xhr.setRequestHeader('accept', 'application/json, text/javascript, */*; q=0.01');
  xhr.setRequestHeader('x-requested-with', 'XMLHttpRequest');
  xhr.setRequestHeader('x-csrftoken', csrftoken);
  xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded');
  xhr.setRequestHeader('cache-control', 'no-cache');

  xhr.send(data);
}

/*
 * Check calculate whether the selected answer
 * was correct or not and respond with a new notification accordingly.
 * This function also calls sendAnswer() if sendAnswers = true.
 */
function checkAnswer(qnum_id, answer_in) {
  var ques = questions[qnum_id].question;
  var correct_ans = questions[qnum_id].answer;
  var resultCorrect = (answer_in == correct_ans);
  var notmessage, noIconUrl;
  var score; // 1 - correct, 0 = wrong (can only get in between 0 and 1 for typed answers)
  var points; // 1 point if review not needed, around 50 points for normal review

  var questionType = questions[qnum_id].questionType;
  var optionsType;
  var optionsTitle;

  if (questionType == 'text') {
    optionsType = 'basic';
    optionsTitle = ques;
  } else if (questionType == 'image') {
    optionsType = 'image';
    optionsTitle = 'Image';
  }


  if (resultCorrect) {
    score = 1;
    if (resp.boxes[qnum_id].review_me) {
      points = 50; //TODO: Needs revising
    } else {
      points = 1;
    }
    notmessage = 'Correct!';
    noIconUrl = 'images/correct.png';
  } else {
    score = 0;
    points = 0;
    notmessage = 'Incorrect, answer is ' + correct_ans;
    noIconUrl = 'images/incorrect.png';
  }

  var options = {
    type: optionsType,
    title: optionsTitle,
    message: notmessage,
    contextMessage: 'You chose ' + answer_in,
    iconUrl: noIconUrl,
    isClickable: true
  };

  if (questionType == 'image') {
    options.imageUrl = ques;
  }

  //Needs to be tracked seperateley since questions can be skipped.
  things_seen++;

  //Prepare data to send response via API
  var answer_data = {
    box_template: 'multiple_choice',
    column_a: questions[qnum_id].column_a,
    column_b: questions[qnum_id].column_b,
    course_id: questions[qnum_id].course_id,
    num_things_seen: things_seen,
    points: points,
    score: score,
    thing_id: questions[qnum_id].thing_id,
    time_paused: 0,
    time_spent: 10000, //10 secs
    update_scheduling: true,
  };

  //Only send responses to memrise.com if settings allow
  // if (sendAnswers) {
  //   console.log('Sending response to memrise via API...');
  //   sendAnswer(answer_data);
  // } else {
  //   console.log('Response not sent to memrise as per settings.');
  // }

  chrome.notifications.create('', options);

}


function setIconStatus(status) {

  var badgeBackgroundColor, badgeText;

  switch (status) {
    case 'On':
      everthing_ok = true;
      badgeBackgroundColor = '#5cb85c';
      badgeText = 'On';
      break;
    case 'Error':
      everthing_ok = false;
      badgeBackgroundColor = '#ff033e';
      badgeText = status;
      break;
    case 'Off':
      everthing_ok = true;
      badgeBackgroundColor = '#1e90ff';
      badgeText = status;
      break;
    default:
      badgeText = '';
  }

  if (badgeBackgroundColor) {
    chrome.browserAction.setBadgeBackgroundColor({
      color: badgeBackgroundColor
    });
  }
  chrome.browserAction.setBadgeText({
    text: badgeText
  });

}

function errorNotifiction(error_type) {
  setIconStatus('Error');
  var iconUrl = 'images/error_temp.png';
  switch (error_type) {
    case 'invalid_course_id':
      var options = {
        type: 'basic',
        title: 'Error!',
        message: 'There was an issue connecting to Memrise.com',
        contextMessage: 'Select a course and click to try again.',
        iconUrl: iconUrl,
        isClickable: true,
        requireInteraction: true,
        buttons: [{
          title: 'Options',
        }]
      };
      break;
    case 'no_results':
      var options = {
        type: 'basic',
        title: 'Attention!',
        message: 'No questions to review.',
        contextMessage: 'Select other course or wait until later.',
        iconUrl: 'images/icon48.png',
        isClickable: true,
        requireInteraction: true,
        buttons: [{
          title: 'Select another course',
        }]
      };
      break;
    default:
      var options = {
        type: 'basic',
        title: 'Error!',
        message: 'There was an issue connecting to Memrise.com',
        contextMessage: 'Login to Memrise and click to try again.',
        iconUrl: iconUrl,
        isClickable: true,
        requireInteraction: true,
        buttons: [{
          title: 'Options',
        }, {
          title: 'Try Again',
        }]
      };
  }

  chrome.notifications.create('', options, function(id) {
    //Clear old error notification
    if (error_not) {
      chrome.notifications.clear(error_not);
    }
    //Record new error notification
    error_not = id;
  });

}

/*
 * Clear current on-screen notifications
 */
function clearNotifications() {
  for (var i = 0; i < not_list.length; i++) {
    chrome.notifications.clear(not_list[i].notID);
  }
}

/*
 * Derive whether Alarm is set + user settings
 * to callback for alarm refresh / initial set up [initialSetUp()]
 */
function checkAlarm(alarmName, callback) {

  clearNotifications();

  chrome.alarms.getAll(function(alarms) {
    var hasAlarm = alarms.some(function(a) {
      return a.name == alarmName;
    });
    chrome.storage.sync.get({
      frequency: defaultFrequency,
      enabled: defaultEnabled,
      send_answers: defaultSend_answers
    }, function(settings) {
      callback(settings.enabled, hasAlarm, settings.send_answers);
    });
  });

}

function cancelAlarm(alarmName) {
  setIconStatus('Off');
  chrome.alarms.clear(alarmName);
}

/*
 * Create alarm, only when settings are enabled
 */
function createAlarm(alarmName) {
  chrome.storage.sync.get({
    frequency: defaultFrequency,
    enabled: defaultEnabled
  }, function(settings) {
    if (settings.enabled) {
      setIconStatus('On');
      var alarmOptions = {
        delayInMinutes: Number(settings.frequency),
        periodInMinutes: Number(settings.frequency)
      }
      console.log('Creating alarm with the following settings:');
      console.log(alarmOptions);
      prepQuestions(function() {
        chrome.alarms.create(alarmName, alarmOptions);
      });
    } else {
      setIconStatus('Off');
      cancelAlarm(alarmName);
      console.log('Alarm cancelled / not created due to enabled flag being false.');
    }
  });
}

/*
 * Used for initial setup of alarm
 * and refresh of alarm when settings have changed
 */
function initialSetUp(enabled, alarmExists, send_answers) {
  sendAnswers = send_answers;
  if (alarmExists) {
    if (enabled) {
      console.log('Alarm already exists, resetting alarm.');
      cancelAlarm(alarmName);
      createAlarm(alarmName);
    } else {
      console.log('Ruzu Memrise pop-ups disabled, disabling alarm.');
      cancelAlarm(alarmName);
    }
  } else {
    if (enabled) {
      console.log('Alarm does not exist, creating alarm...');
      createAlarm(alarmName);
    } else {
      setIconStatus('Off');
      console.log('Ruzu Memrise pop-ups disabled, no need to create alarm.');
    }
  }
}

/*
 * Show next pop-up, suppress questions when settings are disabled and
 * pull more questions if all local questions have been displayed already
 */
function showNextQuestion() {
  chrome.storage.sync.get({
    enabled: defaultEnabled,
  }, function(settings) {
    if (settings.enabled) {
      if (qnum >= questions.length && totalQnums != 0) {
        prepQuestions(showNextQuestion2);
      } else if (qnum == 0 && totalQnums == 0) {
        errorNotifiction('no_results');
      } else {
        showNextQuestion2();
      }
    } else {
      console.log('Cannot show next question when app disabled. Please enable in options page.');
    }
  });
}

/*
 * Display next question from local cache
 */
function showNextQuestion2() {
  popUpTest(qnum);
  qnum++;
}

function openOptions() {
  if (chrome.runtime.openOptionsPage) {
    // New way to open options pages, if supported (Chrome 42+).
    chrome.runtime.openOptionsPage();
  } else {
    // Reasonable fallback.
    window.open(chrome.runtime.getURL('options.html'));
  }
}

/*
 * Close session and reset values so that data needs to be pulled on next
 * question pop-up. This helps prevent stale questions being kept in memory
 */
function closeSession() {
  sessionOpen = false;
  qnum = totalQnums;
  //TODO - Call end session API endpoint
  clearNotifications();
}

/*
 * Respond to the user's clicking one of the buttons
 */
chrome.notifications.onButtonClicked.addListener(function(notifId, btnIdx) {
  validNotID(notifId, function(validNot) {
    if (validNot && validNot.stage == 1) {
      popUpTest2(btnIdx, notifId, validNot.qnum_id);
    } else if (validNot && validNot.stage == 2) {
      chrome.notifications.clear(notifId);
      if (btnIdx === 0) {
        checkAnswer(validNot.qnum_id, validNot.f1);
      } else if (btnIdx === 1) {
        checkAnswer(validNot.qnum_id, validNot.f2);
      }
    } else if (notifId == error_not) {
      if (btnIdx === 0) {
        openOptions();
      } else if (btnIdx === 1) {
        checkAlarm(alarmName, initialSetUp);
      }
    } else {
      console.error('Error: Something went wrong when dealing with this notification.');
    }
  });
});

/*
 * onClicked listener, handles error notification removal
 * and stage 2 revertQuestion function
 */
chrome.notifications.onClicked.addListener(function(notifId) {
  validNotID(notifId, function(validNot) {
    if (notifId == error_not) {
      checkAlarm(alarmName, initialSetUp);
    } else if (validNot && validNot.stage != 2) {
      //Do not clear valid questions on click
    } else if (validNot && validNot.stage == 2) {
      //Revert stage 2 questions
      revertQuestion(notifId, validNot.qnum_id);
    } else {
      chrome.notifications.clear(notifId);
    }
  });
});

/*
 * Command listener for keyboard shortcuts
 */
chrome.commands.onCommand.addListener(function(command) {
  if (command == 'ruzu-toggle-enabled') {
    chrome.storage.sync.get({
      enabled: defaultEnabled
    }, function(items) {
      chrome.storage.sync.set({
        enabled: !items.enabled
      });
    });
  } else if (command == 'ruzu-show-next-question') {
    showNextQuestion();
  }
});

chrome.alarms.onAlarm.addListener(function(alarm) {
  console.log('Alarm elapsed:', alarm);
  if (alarm.name == alarmName) {
    chrome.storage.sync.get({
      frequency: defaultFrequency,
    }, function(settings) {
      var secs = (settings.frequency * 2) * 60
      chrome.idle.queryState(secs, function(state) {
        if (state == 'active') {
          idleCount = 0;
          showNextQuestion();
        } else {
          console.log('Question suppressed as PC is ' + state);
          idleCount++;
          if (idleCount > 3 && sessionOpen) {
            console.log('Closing session after long period of inactivity...');
            closeSession();
          }
        }
      });
    });
  }
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
  for (var key in changes) {
    var storageChange = changes[key];
    // console.log('Storage key ' + key + ' in namespace ' + namespace + ' changed. ' +
    //   'Old value was ' + storageChange.oldValue + ', new value is ' + storageChange.newValue + '.');
    if ((key == 'enabled' || key == 'frequency' || key == 'courseID' || key == 'send_answers') && storageChange.oldValue != storageChange.newValue) {
      console.log('Reset Alarm...');
      checkAlarm(alarmName, initialSetUp);
      break;
    }
  }
});

/*
 * Handle messages from options page etc
 */
chrome.runtime.onMessage.addListener(function(request) {
  if (request && (request.id == 'refresh')) {
    checkAlarm(alarmName, initialSetUp);
  } else if (request && (request.id == 'showNextQuestion')) {
    showNextQuestion();
  }
});

checkAlarm(alarmName, initialSetUp);
