var R = require('ramda');
var H = require('../lib/helpers');
var query = require('raptor-query');
var validator = require('validator');
var common = require('../lib/common');

var isMeasure = R.pipe(R.prop('measurement'), R.equals('measure'));
var isMemory = R.pipe(R.prop('measurement'), R.equals('memory'));
var isMeasureOrMemory = R.converge(R.or, [isMeasure, isMemory]);
var noContext = R.pipe(R.prop('context'), R.converge(R.or, [R.isNil, R.isEmpty]));
var noMetric = R.pipe(R.prop('metric'), R.converge(R.or, [R.isNil, R.isEmpty]));
var missingContext = R.converge(R.and, [isMeasureOrMemory, noContext]);
var missingMetric = R.converge(R.and, [isMeasureOrMemory, noMetric]);

var getTimeFilter = R.pipe(
  R.prop('time'),
  R.cond([
    [R.contains(' '), R.identity],
    [R.T, R.concat('time > now() - ')]
  ])
);

var formatTime = R.converge(R.merge, [
  R.pipe(getTimeFilter, R.objOf('timeFilter')),
  R.omit('time')
]);

var execute = (options) => {
  return query(options)
    .then(JSON.stringify)
    .then(console.log);
};

var callback = R.cond([
  [missingContext, H.errors('--context is required for measure or memory queries')],
  [missingMetric, H.errors('--metric is required for measure or memory queries')],
  [R.T, R.pipe(formatTime, execute)]
]);

module.exports = {
  name: 'query',
  help: 'Run a query against an InfluxDB data source',
  callback,
  options: {
    measurement: {
      help: 'InfluxDB measurement to query',
      abbr: 'm',
      metavar: '<measurement>',
      required: true,
      position: 1,
      choices: ['measure', 'memory', 'mtbf', 'power']
    },
    context: {
      help: 'Filter records to a particular application context; required for measure and memory measurements',
      metavar: '<origin>',
      callback: H.validate(validator.isFQDN)
    },
    metric: {
      help: 'Filter records to a particular metric; required for measure and memory measurements',
      metavar: '<name>'
    },
    branch: {
      help: 'Filter records to those run against a particular Gaia branch',
      metavar: '<name>',
      default: 'master'
    },
    device: {
      help: 'Filter records to those run against a particular device',
      metavar: '<identifier>',
      default: 'flame-kk'
    },
    memory: {
      help: 'Filter records to those run against a particular amount of memory for the targeted device',
      metavar: '<memoryMB>',
      default: 512
    },
    test: {
      help: 'Filter records to those run with a particular test',
      metavar: '<name>',
      default: 'cold-launch'
    },
    time: {
      help: 'Filter records to a particular InfluxDB time query',
      metavar: '<expression>',
      default: '7d'
    },
    host: H.required(common.host),
    port: H.required(common.port),
    username: H.required(common.username),
    password: H.required(common.password),
    database: H.required(common.database),
    protocol: H.required(common.protocol)
  }
};