# Ruzu Memrise Pop-ups

Ruzu Memrise Pop-ups is a Chrome extension that allows you to water your [Memrise](https://www.memrise.com/) plants whilst working on other important tasks by harnessing the power of desktop notifications! Questions from your chosen course will periodically pop up for you to answer.

Features include:
- Course select
- Set how often questions pop up (every 5 mins, 10 mins etc)
- Turn on and off with the flick of a switch
- Review options that allow you to review all, due, difficult or starred cards.
- Check the status of the app with a glance (pop-ups enabled/disabled, not logged in to Memrise etc)
- Shortcuts to to enable / disable pop-ups or show the next question early
- Support for image questions

## Requirements
In order to use this chrome extension, a free [Memrise](https://www.memrise.com/) account is required.

## Chrome Web Store
The extension can be installed for free by visiting the Chrome Web Store via this [link](https://chrome.google.com/webstore/detail/ruzu-memrise-pop-ups/eoepijkdcdnafobigopfohlobdhnegkm)

## Development

### Getting Started
Ruzu Memrise Pop-ups can was developed using [Chrome Extension generator (v0.6.1)](https://github.com/yeoman/generator-chrome-extension/tree/v0.6.1) and can be built locally using glup and loaded into Chrome web browser as an 'unpacked extension' for local testing.

### Initial setup
- This project uses gulp v3.9.1, which is compatible with node v10 or lower:
`https://nodejs.org/dist/v10.9.0/`

- Ensure `gulp` and `bower` are installed on your system
`npm install --global gulp bower`

- Install local requirements
`npm install && bower install`

### Build extension
To build the extension locally as an 'unpacked extension' in the `dist` directory, use the following command:
`gulp` or `gulp build`

Use watch command to update source continuously
`gulp watch`

Package code into a zip, ready for publishing
`gulp package`
