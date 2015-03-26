'use strict';

var fs = require('fs');
var events = require('events');
var stream = require('stream');
var Wreck = require('wreck');
var csv = require('csv');
var config = require('./config');
var headers = config.outputFileHeaders;
var parser = csv.parse({delimiter:','});
var tracker = new events.EventEmitter();
var jobCounter = 0;
var delay = 0;
var errors = [];
var writeStream;
var readStream;
var verbose = config.verbose || false;

function createLookupString(columns, data) {
  var lookup = '';
  for (var i in columns) {
    lookup += data[columns[i]] + ' ';
  }
  return lookup;
}

function mkCsvRowFromArray(arr) {
  if (!Array.isArray(arr)) {
    return new Error('Invalid input. Expected an array.');
  } else {
    var a = arr.map(function(i) {
      return '"' + i + '"';
    });
    return a.join(',') + '\r\n';
  }
}

function doGeocode(address, callback) {
  var url = config.lookupService + address;
  Wreck.get(url, function(err, res, payload) {
    if (err) {
      return callback(err, null);
    } else {
      var json = JSON.parse(payload);
      if (json.status === 'OK') {
        var result = json.results[0];
        return callback(null, {
          lat: result.geometry.location.lat,
          lon: result.geometry.location.lng
        });
      } else {
        console.log(json);
        console.log(address);
        return callback(json, null);
      }
    }
  });
}

function doAllTheThings(data) {
  if (data) {
    var lookUpString = createLookupString(config.lookupColumns, data);
    doGeocode(lookUpString, function(err, geo) {
      if (err) {
        errors.push(err);
      } else {
        data.push(geo.lat);
        data.push(geo.lon);
        tracker.emit('row', data);
      }
    });
  }
}

writeStream = fs.createWriteStream(config.outputFileName);

readStream = stream.PassThrough();

readStream.pipe(writeStream);

readStream.push(mkCsvRowFromArray(headers));

tracker.on('row', function(row) {
  if (row.length > 0) {
    readStream.push(mkCsvRowFromArray(row));
  }
  jobCounter++;
  if (verbose) {
    console.log(jobCounter);
  }
  if (row === null) {
    tracker.emit('finished');
  }
});

tracker.on('finished', function() {
  console.log({message: 'Finished!', errors: errors});
});

parser.on('readable', function() {
  var data = parser.read();
  delay += 2000;
  setTimeout(function() {
    doAllTheThings(data);
  }, delay);
});

fs.createReadStream(config.inputFileName).pipe(parser);