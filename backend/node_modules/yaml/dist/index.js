'use strict';

var _rollupPluginBabelHelpers = require('./_rollupPluginBabelHelpers-eed30217.js');
var parseCst = require('./parse-3997f544.js');
require('./stringifyNumber-dea1120c.js');
require('./Schema-807430ba.js');
var Document = require('./Document-f89a2614.js');

/* global console, process, YAML_SILENCE_WARNINGS */
function warn(warning, type) {
  if (typeof YAML_SILENCE_WARNINGS !== 'undefined' && YAML_SILENCE_WARNINGS) return;

  if (typeof process !== 'undefined') {
    if (process.env.YAML_SILENCE_WARNINGS) return; // This will throw in Jest if `warning` is an Error instance due to
    // https://github.com/facebook/jest/issues/2549

    if (process.emitWarning) {
      process.emitWarning(warning, type);
      return;
    }
  } // eslint-disable-next-line no-console


  console.warn(type ? `${type}: ${warning}` : warning);
}

function parseAllDocuments(src, options) {
  const stream = [];
  let prev;

  for (const cstDoc of parseCst.parse(src)) {
    const doc = new Document.Document(undefined, null, options);
    doc.parse(cstDoc, prev);
    stream.push(doc);
    prev = doc;
  }

  return stream;
}
function parseDocument(src, options) {
  const cst = parseCst.parse(src);
  const doc = new Document.Document(cst[0], null, options);

  if (cst.length > 1) {
    const errMsg = 'Source contains multiple documents; please use YAML.parseAllDocuments()';
    doc.errors.unshift(new _rollupPluginBabelHelpers.YAMLSemanticError(cst[1], errMsg));
  }

  return doc;
}
function parse(src, reviver, options) {
  if (options === undefined && reviver && typeof reviver === 'object') {
    options = reviver;
    reviver = undefined;
  }

  const doc = parseDocument(src, options);
  doc.warnings.forEach(warning => warn(warning));
  if (doc.errors.length > 0) throw doc.errors[0];
  return doc.toJS({
    reviver
  });
}
function stringify(value, replacer, options) {
  if (typeof options === 'string') options = options.length;

  if (typeof options === 'number') {
    const indent = Math.round(options);
    options = indent < 1 ? undefined : indent > 8 ? {
      indent: 8
    } : {
      indent
    };
  }

  if (value === undefined) {
    const {
      keepUndefined
    } = options || replacer || {};
    if (!keepUndefined) return undefined;
  }

  return new Document.Document(value, replacer, options).toString();
}

exports.parseCST = parseCst.parse;
exports.Document = Document.Document;
exports.defaultOptions = Document.defaultOptions;
exports.scalarOptions = Document.scalarOptions;
exports.parse = parse;
exports.parseAllDocuments = parseAllDocuments;
exports.parseDocument = parseDocument;
exports.stringify = stringify;
