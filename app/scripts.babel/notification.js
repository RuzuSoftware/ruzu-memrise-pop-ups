'use strict';

// Copyright (c) 2016 Ruzu. All rights reserved.
var not_list = [];
var questions = [];
var qnum = 0;

function prepQuestions(callback) {
  console.log('prepQuestions');
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'http://www.memrise.com/ajax/session/?course_id=479047&session_slug=review_course', true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      // JSON.parse does not evaluate the attacker's scripts.
      var resp = JSON.parse(xhr.responseText);
      qnum = 0;

      for (var i = 0; i < resp.boxes.length; i++) {
        var orderArr = []
        while (orderArr.length < 4) {
          var randomnumber = Math.ceil(Math.random() * 4)
          if (orderArr.indexOf(randomnumber) > -1) continue;
          orderArr[orderArr.length] = randomnumber;
        }

        var valueArr = []
        while (valueArr.length < 3) {
          var randomnumber = Math.ceil(Math.random() * resp.things[resp.boxes[i].thing_id].columns[resp.boxes[i].column_b].choices.length) - 1
          if (valueArr.indexOf(randomnumber) > -1) continue;
          valueArr[valueArr.length] = randomnumber;
        }

        questions[i] = {
          question: resp.things[resp.boxes[i].thing_id].columns[resp.boxes[i].column_a].val,
          answer: resp.things[resp.boxes[i].thing_id].columns[resp.boxes[i].column_b].val,
          options: resp.things[resp.boxes[i].thing_id].columns[resp.boxes[i].column_b].choices
        }
        questions[i]['choice' + orderArr[0]] = resp.things[resp.boxes[i].thing_id].columns[resp.boxes[i].column_b].choices[valueArr[0]];
        questions[i]['choice' + orderArr[1]] = resp.things[resp.boxes[i].thing_id].columns[resp.boxes[i].column_b].choices[valueArr[1]];
        questions[i]['choice' + orderArr[2]] = resp.things[resp.boxes[i].thing_id].columns[resp.boxes[i].column_b].choices[valueArr[2]];
        questions[i]['choice' + orderArr[3]] = resp.things[resp.boxes[i].thing_id].columns[resp.boxes[i].column_b].val;

      }
      if (callback) {
        callback(null);
      }
    }
  }
  xhr.send();
}

function popUpTest(question, trueAnswer, answer1, answer2, answer3, answer4) {
  console.log('popUpTest');
  //Prep notification details
  var options = {
    type: 'basic',
    title: question,
    message: '',
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
  console.log('notifications: ' + not_list);
  chrome.notifications.update(notifId, options);
  for (var i = 0; i < not_list.length; i++) {
    console.log(not_list[i].notID);
  }

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
        checkAnswer(validNot.ques, validNot.ans, validNot.f1);
        console.log('Check answer final ' + validNot.f1);
      } else if (btnIdx === 1) {
        checkAnswer(validNot.ques, validNot.ans, validNot.f2);
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
    showNextQuestion();
  }
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
  for (var key in changes) {
    var storageChange = changes[key];
    console.log('Storage key ' + key + ' in namespace ' + namespace + ' changed. ' +
      'Old value was ' + storageChange.oldValue + ', new value is ' + storageChange.newValue + '.');
    if ((key == 'enabled' || key == 'frequency') && storageChange.oldValue != storageChange.newValue) {
      console.log('Reset Alarm...');
      checkAlarm('Ruzu', initialSetUp);
      break;
    }
  }
});

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
  if (qnum >= questions.length) {
    prepQuestions(showNextQuestion2);
  } else {
    showNextQuestion2();
  }
}

checkAlarm('Ruzu', initialSetUp);
