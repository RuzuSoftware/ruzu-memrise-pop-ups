// Copyright (c) 2016 Ruzu. All rights reserved.
var id;
var options = {
  type: "basic",
  title: "Ruzu Notification",
  message: "Ruzu Notification message",
  iconUrl: "icon.png"
};

chrome.notifications.create(id, options, creationCallback);

function creationCallback() {
  console.log("Called creationCallback, notification id: " + id);
}
