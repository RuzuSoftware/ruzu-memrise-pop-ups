'use strict';

// Copyright (c) 2016 Ruzu Studios. All rights reserved.

var not_list = [];
var questions = [];
var qnum = 0;
var totalQnums = 0;
var error_not;
var course_id;
var resp;
var everthing_ok = true;
var csrftoken;
var idleCount = 0;
var sessionOpen = false;
var xhr = [];
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

function getNumLevels(course_id, callback) {
  var jsonOk = false;
  var xhr = new XMLHttpRequest();
  var num_levels = 1;
  xhr.open('GET', 'https://www.memrise.com/ajax/session/?course_id=' + course_id + '&level_index=1&session_slug=preview', true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
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
        num_levels = resp.session.course.num_levels;
        var idx;
        if (callback) {
          callback(num_levels);
        }
      }
    }
  }
  xhr.send();
}

function prepQuestions(callback) {
  chrome.storage.sync.get({
    courseID: defaultCourseID
  }, function(settings) {
    course_id = (settings.courseID ? settings.courseID : 0);
    var jsonOk = false;
    var thisLevelQnums = 0;
    qnum = 0;
    totalQnums = 0;
    questions = [];
    console.log('Connecting to course...');
    if (error_not) {
      chrome.notifications.clear(error_not);
    }

    getNumLevels(course_id, function(num_levels) {
      for (var this_level = 1; this_level <= num_levels; this_level++) {
        (function(this_level) {
          console.log('Loading level ' + this_level + '...');
          xhr[this_level] = new XMLHttpRequest();
          xhr[this_level].open('GET', 'https://www.memrise.com/ajax/session/?course_id=' + course_id + '&level_index=' + this_level + '&session_slug=preview', true);

          xhr[this_level].onreadystatechange = function() {

            if (xhr[this_level].readyState == 4) {

              jsonOk = false;

              // JSON.parse does not evaluate the attacker's scripts.
              try {
                if (xhr[this_level].responseText) {
                  resp = JSON.parse(xhr[this_level].responseText);
                  jsonOk = true;
                } else {
                  console.log('Level ' + this_level + ' returned no results...');
                }
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
                totalQnums += resp.learnables.length;
                thisLevelQnums = resp.learnables.length;
                var idx;
                for (var i = 0; i < thisLevelQnums; i++) {
                  //Shuffle answers by putting numbers 1 ~ 4 in an array for use later
                  var orderArr = []
                  while (orderArr.length < 4) {
                    var randomnumber = Math.ceil(Math.random() * 4)
                    if (orderArr.indexOf(randomnumber) > -1) continue;
                    orderArr[orderArr.length] = randomnumber;
                  }

                  //Collect values from array once
                  var question;
                  var thing_id = resp.learnables[i].thing_id;
                  if (resp.learnables[i].tests.multiple_choice.prompt.hasOwnProperty('text')) {
                    var question = resp.learnables[i].tests.multiple_choice.prompt.text;
                    var questionType = 'text';
                  } else {
                    var question = resp.learnables[i].tests.multiple_choice.prompt.image[0];
                    var questionType = 'image';
                  }
                  var answer = resp.learnables[i].tests.multiple_choice.correct;
                  var choices_length = resp.learnables[i].tests.multiple_choice.choices.length;

                  //Collect idx of 3 random choices
                  var valueArr = []
                  while (valueArr.length < 3) {
                    var randomnumber = Math.ceil(Math.random() * choices_length) - 1
                    if (valueArr.indexOf(randomnumber) > -1) continue;
                    valueArr[valueArr.length] = randomnumber;
                  }

                  //Add question to global question list
                  idx = questions.length;
                  questions[idx] = {
                    course_id: course_id,
                    thing_id: thing_id,
                    question: question,
                    answer: resp.learnables[i].tests.multiple_choice.correct,
                    options: resp.learnables[i].tests.multiple_choice.choices,
                    questionType: questionType
                  }
                  questions[idx]['choice' + orderArr[0]] = resp.learnables[i].tests.multiple_choice.choices[valueArr[0]];
                  questions[idx]['choice' + orderArr[1]] = resp.learnables[i].tests.multiple_choice.choices[valueArr[1]];
                  questions[idx]['choice' + orderArr[2]] = resp.learnables[i].tests.multiple_choice.choices[valueArr[2]];
                  questions[idx]['choice' + orderArr[3]] = resp.learnables[i].tests.multiple_choice.correct;

                }

                if (callback && this_level <= num_levels) {
                  callback(null);
                }
              }
            }
          }
          xhr[this_level].send();
        })(this_level);
      }
    });
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
 * Check calculate whether the selected answer
 * was correct or not and respond with a new notification accordingly.
 */
function checkAnswer(qnum_id, answer_in) {
  var ques = questions[qnum_id].question;
  var correct_ans = questions[qnum_id].answer;
  var resultCorrect = (answer_in == correct_ans);
  var notmessage, noIconUrl;

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
    notmessage = 'Correct!';
    noIconUrl = 'images/correct.png';
  } else {
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
    }, function(settings) {
      callback(settings.enabled, hasAlarm);
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
function initialSetUp(enabled, alarmExists) {
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
 * getRandomIntInclusive - The maximum is inclusive and the minimum is inclusive
 */
function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/*
 * Display next question from local cache
 */
function showNextQuestion2() {
  chrome.storage.sync.get({
    randomOrder: defaultRandomOrder,
  }, function(settings) {
    if (settings.randomOrder) {
      popUpTest(getRandomIntInclusive(0, totalQnums-1));
    } else {
      popUpTest(qnum);
      qnum++;
    }
  });
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
    if ((key == 'enabled' ||
        key == 'frequency' ||
        key == 'courseID' ||
        key == 'randomOrder') && storageChange.oldValue != storageChange.newValue) {
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
