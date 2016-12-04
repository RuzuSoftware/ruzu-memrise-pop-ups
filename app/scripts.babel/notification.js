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
    //Add notification to array
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

function sendAnswer() {
  var data = jQuery.param({
    box_template: 'multiple_choice',
    column_a: 1,
    column_b: 2,
    course_id: 641893,
    num_things_seen: 1,
    points: 150,
    score: 3106997,
    thing_id: 59982962,
    time_paused: 0,
    time_spent: 10000, //10 secs
    update_scheduling: true,
  });

  var xhr = new XMLHttpRequest();
  xhr.withCredentials = true;

  xhr.onreadystatechange = function() {
    if (this.readyState === 4) {
      console.log(this.responseText);
    }
  };

  xhr.open('POST', 'http://www.memrise.com/api/garden/register/');
  xhr.setRequestHeader('accept', 'application/json, text/javascript, */*; q=0.01');
  //xhr.setRequestHeader('origin', 'http://www.memrise.com');
  xhr.setRequestHeader('x-requested-with', 'XMLHttpRequest');
  //xhr.setRequestHeader('user-agent', 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36');
  xhr.setRequestHeader('x-csrftoken', 'Y65wQUDbwdDwGFOYUvUXjdeMZXxvxsphHmqa21reg2if0HXyDlRNPOkeAYtUYt8i'); //Need to generate
  xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded');
  //xhr.setRequestHeader('referer', 'http://www.memrise.com/course/1187237/maeildaneo/garden/review/'); //Course URL
  //xhr.setRequestHeader('accept-encoding', 'gzip, deflate');
  //xhr.setRequestHeader('accept-language', 'en-US,en;q=0.8,en-GB;q=0.6');
  //xhr.setRequestHeader('cookie', 'memprize=true; __cfduid=d009c8f660cffb2d2879311e0d6669f5b1479389644; mp_super_properties=%7B%22all%22%3A%20%7B%22%24initial_referrer%22%3A%20%22http%3A//www.memrise.com/contact/%22%2C%22%24initial_referring_domain%22%3A%20%22www.memrise.com%22%7D%2C%22events%22%3A%20%7B%7D%2C%22funnels%22%3A%20%7B%7D%7D; sessionid=vht5dp3soetdf3qpg1ujz5kdjk7lj24y; _sm_au_c=ijVRQ25qv6ZvJ0Br0c; i18next=en; __utmt=1; csrftoken=lNGuIUzWDjMZIUIX0lfOHICA76KP1RTI4318U1nZn8rI2WRxJbcEdjI2I7GesSCJ; __utma=216705802.150408009.1470053884.1470053884.1479909571.2; __utmb=216705802.2.10.1480338064; __utmc=216705802; __utmz=216705802.1470053884.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); __utma=216705802.150408009.1470053884.1470053884.1479909571.2; __utmb=216705802.3.9.1480338077947; __utmc=216705802; __utmz=216705802.1470053884.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); _sp_id.7bc7=530cd4fbfa08ffbb.1470053885.75.1480338078.1480333872.8ef26705-d565-4724-944a-589cd4191041; _sp_ses.7bc7=*');
  xhr.setRequestHeader('cache-control', 'no-cache');

  xhr.send(data);
}

function checkAnswer(ques, correct_ans, answer_in) {

  var resultCorrect = (answer_in == correct_ans); //API call to get this
  var notmessage, noIconUrl;

  var score; // 1 - correct, 0 = wrong (can only get in between 0 and 1 for typed answers)
  var points; // 1 point if review not needed, around 50 points for normal review

  if (resultCorrect) {
    score = 1;
    if (resp.boxes[qnum].review_me) {
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

  var answer_data = {
    box_template: 'multiple_choice',
    column_a: resp.boxes[qnum].column_a,
    column_b: resp.boxes[qnum].column_b,
    course_id: 641893,
    num_things_seen: qnum,
    points: points,
    score: score,
    thing_id: resp.boxes[qnum].thing_id,
    time_paused: 0,
    time_spent: 10000, //10 secs
    update_scheduling: true,
  };

  console.log(answer_data);

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
  popUpTest(questions[qnum].question, questions[qnum].answer, questions[qnum].choice1, questions[qnum].choice2, questions[qnum].choice3, questions[qnum].choice4);
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
