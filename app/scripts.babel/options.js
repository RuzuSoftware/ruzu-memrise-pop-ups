'use strict';

// Saves options to chrome.storage.sync.
function save_options() {
  var courseNameVal = $('#course option:selected').text();
  var courseIDVal = document.getElementById('course').value;
  var frequencyVal = document.getElementById('frequency').value;
  var test_amtVal = document.getElementById('test_amt').value;
  var enabledVal = document.getElementById('enabled').checked;
  var send_answersVal = document.getElementById('send_answers').checked;
  var syncVal = document.getElementById('sync').checked;
  chrome.storage.sync.set({
    courseName: courseNameVal,
    courseID: courseIDVal,
    frequency: frequencyVal,
    test_amt: test_amtVal,
    enabled: enabledVal,
    send_answers: send_answersVal,
    sync: syncVal
  }, function() {
    // Show message to let user know options were saved.
    showMessage('Options saved.');
    restore_options();
  });
}

function getCourses(callback) {

  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'https://www.memrise.com/ajax/courses/dashboard/?courses_filter=most_recent&offset=0&limit=20&get_review_count=false', true);

  xhr.onreadystatechange = function() {

    if (xhr.readyState == 4) {
      var jsonOk = false;
      // JSON.parse does not evaluate the attacker's scripts.
      try {
        var resp = JSON.parse(xhr.responseText);
        jsonOk = true;
      } catch (e) {
        console.log('Error connecting to memrise.');
        console.log(e);
        //errorNotifiction();
      }
      if (jsonOk) {
        var courseSelect = $('#course');
        courseSelect.empty();
        for (var i = 0; i < resp.courses.length; i++) {
          courseSelect.append(
            $('<option></option>').val(resp.courses[i].id).html(resp.courses[i].name+' ('+((resp.courses[i].review) ? resp.courses[i].review : 0)+')')
          );
        }
        if (callback) {
          callback(true);
        }
      } else {
        if (callback) {
          callback(false);
        }
      }
    }
  }
  xhr.send();
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default values if not set
  chrome.storage.sync.get({
    courseName: '(Please select a course)',
    courseID: defaultCourseID,
    frequency: defaultFrequency,
    test_amt: defaultTest_amt,
    enabled: defaultEnabled,
    send_answers: defaultSend_answers,
    sync: defaultSync
  }, function(items) {

    getCourses(function(success) {
      if (!success) {
        var courseSelect = $('#course');
        courseSelect.empty().append(
          $('<option></option>').val('0').html('Error, please log into memrise.com')
        );
        $('#course_wrap').hide();
        $('#course_error').show();

      } else {
        $('#course_wrap').show();
        $('#course_error').hide();
        if (items.enabled && items.courseID != 0) {
          $('#showNextQuestion').prop('disabled', false);
        } else {
          $('#showNextQuestion').prop('disabled', true);
        }
      }

      document.getElementById('course').value = items.courseID;
      document.getElementById('frequency').value = items.frequency;
      document.getElementById('test_amt').value = items.test_amt;
      document.getElementById('enabled').checked = items.enabled;
      document.getElementById('send_answers').checked = false;//items.send_answers;
      document.getElementById('sync').checked = items.sync;
    });
  });

}

function showMessage(msg) {
  $('#status').text(msg);
  $('#status').fadeTo('slow', 1);
  setTimeout(function() {
    $('#status').fadeTo('slow', 0);
  }, 3000);
}

function showNextQuestion() {
  chrome.runtime.sendMessage({
    id: 'showNextQuestion'
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
document.getElementById('tryAgain').addEventListener('click', restore_options);
document.getElementById('showNextQuestion').addEventListener('click', showNextQuestion);
