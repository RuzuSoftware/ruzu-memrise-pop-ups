// Copyright (c) 2016 Ruzu. All rights reserved.
var notificationID, options, ques, a1, a2, a3, a4, finalA1, finalA2, final = false;

function popUpTest(question, answer1, answer2, answer3, answer4) {
  ques = question;
  a1 = answer1;
  a2 = answer2;
  a3 = answer3;
  a4 = answer4;
  options = {
    type: "basic",
    title: question,
    message: "",
    iconUrl: "icon.png",
    buttons: [{
        title: answer1 + " | " + answer2,
    }, {
        title: answer3 + " | " + answer4,
    }]
  };

  chrome.notifications.create("", options, creationCallback);

}

function creationCallback(id) {
  console.log("Called creationCallback, notification id: " + id);
  notificationID = id;
}

function popUpTest2(question, answer1, answer2) {
  finalA1 = answer1;
  finalA2 = answer2;
  options = {
    type: "basic",
    title: question,
    message: "Choose the correct answer.",
    iconUrl: "icon.png",
    buttons: [{
        title: finalA1,
    }, {
        title: finalA2,
    }]
  };

  chrome.notifications.update(notificationID, options);

}

function checkAnswer(answer_in){
  console.log("Send "+ answer_in);
  var correct_ans = 'Hello';
  if (answer_in == correct_ans){
    options = {
      type: "basic",
      title: ques,
      message: "Correct!",
      contextMessage: "You chose "+ answer_in,
      iconUrl: "correct.png",
    };
  } else {
    options = {
      type: "basic",
      title: ques,
      message: "Incorrect, answer is "+ correct_ans,
      contextMessage: "You chose "+ answer_in,
      iconUrl: "incorrect.png",
    };
  }


  chrome.notifications.create("", options, creationCallback);
}

/* Respond to the user's clicking one of the buttons */
chrome.notifications.onButtonClicked.addListener(function(notifId, btnIdx) {
    if (notifId === notificationID && !final) {
        final = true;
        if (btnIdx === 0) {
          popUpTest2('\uC548\uB155', a1, a2);
        } else if (btnIdx === 1) {
          popUpTest2('\uC548\uB155', a3, a4);
        }
    } else if (notifId === notificationID && final) {
      chrome.notifications.clear(notificationID);
      if (btnIdx === 0) {
        checkAnswer(finalA1);
      } else if (btnIdx === 1) {
        checkAnswer(finalA2);
      }
    } else {
      console.log("fail "+ final);
    }
});

popUpTest('\uC548\uB155', 'Hello', 'Goodbye', 'Cat', 'Dog');
