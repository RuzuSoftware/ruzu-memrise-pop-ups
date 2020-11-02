'use strict';

// Saves options to chrome.storage.sync.
function save_options() {
  $('#showNextQuestion').prop('disabled', true);
  var courseNameVal = $('#course option:selected').text();
  var courseIDVal = document.getElementById('course').value;
  var frequencyVal = document.getElementById('frequency').value;
  var reviewTypeVal = document.getElementById('review_type').value;
  var dueVal = document.getElementById('due').checked;
  var randomOrderVal = document.getElementById('random_order').checked;
  var enabledVal = document.getElementById('enabled').checked;
  var syncVal = document.getElementById('sync').checked;
  chrome.storage.sync.set({
    courseName: courseNameVal,
    courseID: courseIDVal,
    reviewType: reviewTypeVal,
    frequency: frequencyVal,
    due: dueVal,
    randomOrder: randomOrderVal,
    enabled: enabledVal,
    sync: syncVal
  }, function() {
    // Show message to let user know options were saved.
    showMessage('Options saved.');
    restore_options();
  });
}

function getCourses(callback) {

  var xhr = new XMLHttpRequest();
  xhr.open('GET', urlRoot + '/ajax/courses/dashboard/?courses_filter=most_recent&offset=0&limit=8&get_review_count=false', true);

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
            $('<option></option>').val(resp.courses[i].id).html(resp.courses[i].name + ' (' + ((resp.courses[i].review) ? resp.courses[i].review : 0) + '/' + ((resp.courses[i].num_things) ? resp.courses[i].num_things : 0) + ')')
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
    reviewType: defaultreviewType,
    frequency: defaultFrequency,
    due: defaultDue,
    randomOrder: defaultRandomOrder,
    enabled: defaultEnabled,
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
          setTimeout(function() {
            $('#showNextQuestion').prop('disabled', false);
          }, 1500);
        } else {
          $('#showNextQuestion').prop('disabled', true);
        }
      }

      document.getElementById('course').value = items.courseID;
      document.getElementById('frequency').value = items.frequency;
      document.getElementById('review_type').value = items.reviewType;
      document.getElementById('due').checked = items.due;
      document.getElementById('random_order').checked = items.randomOrder;
      document.getElementById('enabled').checked = items.enabled;
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
