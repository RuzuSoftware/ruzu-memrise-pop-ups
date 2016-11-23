'use strict';

// Copyright (c) 2016 Ruzu. All rights reserved.
var not_list = [];
var questions = [];
var qnum = 0;
var totalQnums = 0;
var error_not;
var course_id;
var resp;

function prepQuestions(callback) {
  chrome.storage.sync.get({
    courseID: 0
  }, function(settings) {
    console.log('Got course ID:' + settings.courseID);
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
            var orderArr = []
            while (orderArr.length < 4) {
              var randomnumber = Math.ceil(Math.random() * 4)
              if (orderArr.indexOf(randomnumber) > -1) continue;
              orderArr[orderArr.length] = randomnumber;
            }

            var valueArr = []
            while (valueArr.length < 3) {
              var randomnumber = Math.ceil(Math.random() * resp.things[resp.boxes[i].thing_id].columns[resp.boxes[i].column_a].choices.length) - 1
              if (valueArr.indexOf(randomnumber) > -1) continue;
              valueArr[valueArr.length] = randomnumber;
            }

            questions[i] = {
              question: resp.things[resp.boxes[i].thing_id].columns[resp.boxes[i].column_b].val,
              answer: resp.things[resp.boxes[i].thing_id].columns[resp.boxes[i].column_a].val,
              options: resp.things[resp.boxes[i].thing_id].columns[resp.boxes[i].column_a].choices
            }
            questions[i]['choice' + orderArr[0]] = resp.things[resp.boxes[i].thing_id].columns[resp.boxes[i].column_a].choices[valueArr[0]];
            questions[i]['choice' + orderArr[1]] = resp.things[resp.boxes[i].thing_id].columns[resp.boxes[i].column_a].choices[valueArr[1]];
            questions[i]['choice' + orderArr[2]] = resp.things[resp.boxes[i].thing_id].columns[resp.boxes[i].column_a].choices[valueArr[2]];
            questions[i]['choice' + orderArr[3]] = resp.things[resp.boxes[i].thing_id].columns[resp.boxes[i].column_a].val;

          }
          if (callback) {
            callback(null);
          }
        }
      }
    }
    xhr.send();
  });
}

function popUpTest(question, trueAnswer, answer1, answer2, answer3, answer4) {
  console.log('popUpTest');
  //Prep notification details
  var options = {
    type: 'basic',
    title: question,
    message: '',
    contextMessage: (qnum + 1) + '/' + totalQnums,
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
    //console.log('Add notification to array: ' + id);
    not_list.push({
      notID: id,
      ques: question,
      ans: trueAnswer,
      a1: answer1,
      a2: answer2,
      a3: answer3,
      a4: answer4,
      stage: 1
    });

    //console.log('notifications(' + not_list.length + ')');
    // for (var i = 0; i < not_list.length; i++) {
    //   console.log(not_list[i].notID);
    // }

    if (not_list.length > 2 /*TODO CONFIG VAR*/ ) {
      var removeNotID = not_list.shift().notID;
      //console.log('clear overflow notification ' + removeNotID);
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
  // console.log('notifications: ' + not_list);
  chrome.notifications.update(notifId, options);
  // for (var i = 0; i < not_list.length; i++) {
  //   console.log(not_list[i].notID);
  // }

}

function checkAnswer(ques, correct_ans, answer_in) {
  console.log('Send ' + answer_in);

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
      enabled: true
    }, function(settings) {
      callback(settings.enabled, hasAlarm);
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

function initialSetUp(enabled, alarmExists) {
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
  console.log('showNextQuestion2');
  popUpTest(questions[qnum].question, questions[qnum].answer, questions[qnum].choice1, questions[qnum].choice2, questions[qnum].choice3, questions[qnum].choice4);
  qnum++;
}

function showNextQuestion() {
  console.log('showNextQuestion');
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
      if (btnIdx === 0) {
        popUpTest2(notifId, validNot.ques, validNot.a1, validNot.a2);
      } else if (btnIdx === 1) {
        popUpTest2(notifId, validNot.ques, validNot.a3, validNot.a4);
      }
    } else if (validNot && validNot.stage == 2) {
      chrome.notifications.clear(notifId);
      if (btnIdx === 0) {
        checkAnswer(validNot.ques, validNot.ans, validNot.f1);
        console.log('Check answer final ' + validNot.f1);
      } else if (btnIdx === 1) {
        checkAnswer(validNot.ques, validNot.ans, validNot.f2);
        console.log('Check answer final ' + validNot.f2);
      }
    } else if (notifId == error_not) {
      if (btnIdx === 0) {
        openOptions();
      } else if (btnIdx === 1) {
        checkAlarm('Ruzu', initialSetUp);
      }
    } else {
      console.log('fail if');
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
  console.log('Got an alarm!', alarm);
  if (alarm.name == 'Ruzu') {
    showNextQuestion();
  }
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
  for (var key in changes) {
    var storageChange = changes[key];
    console.log('Storage key ' + key + ' in namespace ' + namespace + ' changed. ' +
      'Old value was ' + storageChange.oldValue + ', new value is ' + storageChange.newValue + '.');
    if ((key == 'enabled' || key == 'frequency' || key == 'courseID') && storageChange.oldValue != storageChange.newValue) {
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
