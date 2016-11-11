'use strict';

// Saves options to chrome.storage.sync.
function save_options() {
  var frequencyVal = document.getElementById('frequency').value;
  var test_amtVal = document.getElementById('test_amt').value;
  var enabledVal = document.getElementById('enabled').checked;
  var syncVal = document.getElementById('sync').checked;
  chrome.storage.sync.set({
    frequency: frequencyVal,
    test_amt: test_amtVal,
    enabled: enabledVal,
    sync: syncVal
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default values if not set
  chrome.storage.sync.get({
    frequency: 5,
    test_amt: 1,
    enabled: true,
    sync: true
  }, function(items) {
    document.getElementById('frequency').value = items.frequency;
    document.getElementById('test_amt').value = items.test_amt;
    document.getElementById('enabled').checked = items.enabled;
    document.getElementById('sync').checked = items.sync;
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
