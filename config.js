'use strict';

var config = {
  inputFileName: 'skoler.csv',
  outputFileName: 'skoler_geocoded.csv',
  outputFileHeaders: [
    'school',
    'address',
    'zip',
    'city',
    'municipality',
    'phone',
    'category',
    'lat',
    'lon'
  ],
  lookupColumns: [0,1,2,3],
  lookupService: 'https://api.t-fk.no/geocode/',
  verbose:true
};

module.exports = config;
