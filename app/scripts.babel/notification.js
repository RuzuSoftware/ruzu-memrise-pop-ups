'use strict';

// Copyright (c) 2016 Ruzu. All rights reserved.
var not_list = [];
var questions = [];
var qnum = 0;
var totalQnums = 0;
var things_seen = 0;
var sendAnswers = false;
var error_not;
var course_id;
var resp;
var csrftoken;

function collectCSRF() {

  var xhr = new XMLHttpRequest();
  console.log('Collect csrf token...');
  xhr.open('GET', 'http://www.memrise.com/course/' + course_id + '/', true);

  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      var text = xhr.responseText;
      var regex = /csrftoken: "(.*?)\"/;
      csrftoken = text.match(regex)[1]; // id = 'Ahg6qcgoay4'
    }
  }
  xhr.send();

}

function prepQuestions(callback) {
  chrome.storage.sync.get({
    courseID: 0
  }, function(settings) {
    console.log('Got course ID: ' + settings.courseID);
    course_id = (settings.courseID ? settings.courseID : 0);
    var xhr = new XMLHttpRequest();
    console.log('Connect to course...');
    if (error_not) {
      chrome.notifications.clear(error_not);
    }
    xhr.open('GET', 'http://www.memrise.com/ajax/session/?course_id=' + course_id + '&session_slug=review_course', true);

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
            var thing_id = resp.boxes[i].thing_id;
            var column_a = resp.boxes[i].column_a;
            var column_b = resp.boxes[i].column_b;
            var choices_length = resp.things[thing_id].columns[column_a].choices.length;

            //Collect idx of 3 random choices
            var valueArr = []
            while (valueArr.length < 3) {
              var randomnumber = Math.ceil(Math.random() * choices_length) - 1
              if (valueArr.indexOf(randomnumber) > -1) continue;
              valueArr[valueArr.length] = randomnumber;
            }

            //Add question to global question list
            questions[i] = {
              course_id: course_id,
              thing_id: thing_id,
              column_a: column_a,
              column_b: column_b,
              question: resp.things[thing_id].columns[column_b].val,
              answer: resp.things[thing_id].columns[column_a].val,
              options: resp.things[thing_id].columns[column_a].choices
            }

            questions[i]['choice' + orderArr[0]] = resp.things[thing_id].columns[column_a].choices[valueArr[0]];
            questions[i]['choice' + orderArr[1]] = resp.things[thing_id].columns[column_a].choices[valueArr[1]];
            questions[i]['choice' + orderArr[2]] = resp.things[thing_id].columns[column_a].choices[valueArr[2]];
            questions[i]['choice' + orderArr[3]] = resp.things[thing_id].columns[column_a].val;

          }

          //Require for write mode
          collectCSRF();

          if (callback) {
            callback(null);
          }
        }
      }
    }
    xhr.send();
  });
}

function popUpTest(qnum_id) {

  var question = questions[qnum_id].question;
  var trueAnswer = questions[qnum_id].answer;
  var answer1 = questions[qnum_id].choice1;
  var answer2 = questions[qnum_id].choice2;
  var answer3 = questions[qnum_id].choice3;
  var answer4 = questions[qnum_id].choice4;

  //Prep notification details
  var options = {
    type: 'basic',
    title: question,
    message: '',
    contextMessage: (qnum_id + 1) + '/' + totalQnums,
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
    //Add notification to array
    not_list.push({
      notID: id,
      qnum_id: qnum_id,
      stage: 1
    });

    //console.log('notifications(' + not_list.length + ')');
    // for (var i = 0; i < not_list.length; i++) {
    //   console.log(not_list[i].notID);
    // }

    if (not_list.length > 2 /*TODO CONFIG VAR*/ ) {
      var removeNotID = not_list.shift().notID;
      //Clear overflow notification
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

function popUpTest2(btnIdx, notifId, qnum_id) {

  var question = questions[qnum_id].question;
  var answer1, answer2;

  if (btnIdx === 0) {
    var answer1 = questions[qnum_id].choice1;
    var answer2 = questions[qnum_id].choice2;
  } else {
    var answer1 = questions[qnum_id].choice3;
    var answer2 = questions[qnum_id].choice4;
  }

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
  // console.log('notifications: ' + not_list);
  chrome.notifications.update(notifId, options);
  // for (var i = 0; i < not_list.length; i++) {
  //   console.log(not_list[i].notID);
  // }

}

function sendAnswer(answer_data) {

  var data = jQuery.param(answer_data);

  var xhr = new XMLHttpRequest();
  xhr.withCredentials = true;

  xhr.onreadystatechange = function() {
    if (this.readyState === 4) {
      console.log(this.responseText);
    }
  };

  xhr.open('POST', 'http://www.memrise.com/api/garden/register/');
  xhr.setRequestHeader('accept', 'application/json, text/javascript, */*; q=0.01');
  xhr.setRequestHeader('x-requested-with', 'XMLHttpRequest');
  xhr.setRequestHeader('x-csrftoken', csrftoken);
  xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded');
  xhr.setRequestHeader('cache-control', 'no-cache');

  xhr.send(data);
}

function checkAnswer(qnum_id, answer_in) {
  var ques = questions[qnum_id].question;
  var correct_ans = questions[qnum_id].answer;
  var resultCorrect = (answer_in == correct_ans);
  var notmessage, noIconUrl;
  var score; // 1 - correct, 0 = wrong (can only get in between 0 and 1 for typed answers)
  var points; // 1 point if review not needed, around 50 points for normal review

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
    type: 'basic',
    title: ques,
    message: notmessage,
    contextMessage: 'You chose ' + answer_in,
    iconUrl: noIconUrl,
    isClickable: true
  };

  //Needs to be tracked seperateley since questions can be skipped.
  things_seen++;

  //Prepare data to send response via API
  var answer_data = {
    box_template: 'multiple_choice',
    column_a: questions[qnum_id].column_a,
    column_b: questions[qnum_id].column_b,
    course_id: 641893,
    num_things_seen: things_seen,
    points: points,
    score: score,
    thing_id: questions[qnum_id].thing_id,
    time_paused: 0,
    time_spent: 10000, //10 secs
    update_scheduling: true,
  };

  //Only send responses to memrise.com if settings allow
  if (sendAnswers) {
    console.log('Sending response to memrise via API...');
    sendAnswer(answer_data);
  } else {
    console.log('Response not sent to memrise as per settings.');
  }

  chrome.notifications.create('', options);

}

function errorNotifiction(error_type) {
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
        iconUrl: 'images/icon.png',
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

function checkAlarm(alarmName, callback) {
  chrome.alarms.getAll(function(alarms) {
    var hasAlarm = alarms.some(function(a) {
      return a.name == alarmName;
    });
    chrome.storage.sync.get({
      frequency: 5,
      enabled: true,
      send_answers: false
    }, function(settings) {
      callback(settings.enabled, hasAlarm, settings.send_answers);
    });
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
      prepQuestions(function() {
        chrome.alarms.create(alarmName, alarmOptions);
      });
    } else {
      cancelAlarm('Ruzu');
      console.log('Alarm cancelled / not created due to enabled flag being false.');
    }
  });
}

function initialSetUp(enabled, alarmExists, send_answers) {
  sendAnswers = send_answers;
  if (alarmExists) {
    if (enabled) {
      console.log('Alarm already exists, resetting alarm.');
      cancelAlarm('Ruzu');
      createAlarm('Ruzu');
    } else {
      console.log('Ruzu Memrise pop-ups disabled, disabling alarm.');
      cancelAlarm('Ruzu');
    }
  } else {
    if (enabled) {
      console.log('Alarm does not exist, creating alarm...');
      createAlarm('Ruzu');
    } else {
      console.log('Ruzu Memrise pop-ups disabled, no need to create alarm.');
    }
  }
}

function showNextQuestion2() {
  popUpTest(qnum);
  qnum++;
}

function showNextQuestion() {
  if (qnum >= questions.length && totalQnums != 0) {
    prepQuestions(showNextQuestion2);
  } else if (qnum == 0 && totalQnums == 0) {
    errorNotifiction('no_results');
  } else {
    showNextQuestion2();
  }
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

/* Respond to the user's clicking one of the buttons */
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
        checkAlarm('Ruzu', initialSetUp);
      }
    } else {
      console.log('Error: Something went wrong when dealing with this notification.');
    }
  });

});

//Add listener for checkAnswer notification so that click to remove is possible
chrome.notifications.onClicked.addListener(function(notifId) {
  validNotID(notifId, function(validNot) {
    if (notifId == error_not) {
      checkAlarm('Ruzu', initialSetUp);
    } else if (validNot) {
      //Do not clear valid questions on click
    } else {
      chrome.notifications.clear(notifId);
    }
  });
});

chrome.alarms.onAlarm.addListener(function(alarm) {
  console.log('Alarm elapsed:', alarm);
  if (alarm.name == 'Ruzu') {
    chrome.storage.sync.get({
      frequency: 5,
    }, function(settings) {
      var secs = (settings.frequency * 2) * 60
      chrome.idle.queryState(secs, function(state) {
        if (state == 'active') {
          showNextQuestion();
        } else {
          console.log('Question suppressed as PC is ' + state);
        }
      });
    });
  }
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
  for (var key in changes) {
    var storageChange = changes[key];
    console.log('Storage key ' + key + ' in namespace ' + namespace + ' changed. ' +
      'Old value was ' + storageChange.oldValue + ', new value is ' + storageChange.newValue + '.');
    if ((key == 'enabled' || key == 'frequency' || key == 'courseID' || key == 'send_answers') && storageChange.oldValue != storageChange.newValue) {
      console.log('Reset Alarm...');
      checkAlarm('Ruzu', initialSetUp);
      break;
    }
  }
});

chrome.extension.onRequest.addListener(function(request) {
  if (request && (request.id == 'refresh')) {
    checkAlarm('Ruzu', initialSetUp);
  }
});

checkAlarm('Ruzu', initialSetUp);
