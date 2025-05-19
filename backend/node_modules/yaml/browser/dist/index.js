import { d as defaultTagPrefix, _ as _typeof, a as _createClass, b as _classCallCheck, c as _defineProperty, e as _slicedToArray, Y as YAMLSemanticError, T as Type, f as defaultTags, g as YAMLWarning, h as _createForOfIteratorHelper, i as YAMLSyntaxError, C as Char, j as YAMLReferenceError, k as YAMLError } from './errors-2634d01a.js';
import { P as PlainValue, D as Document$1, p as parse$1 } from './parse-d1ba890f.js';
export { p as parseCST } from './parse-d1ba890f.js';
import { b as binaryOptions, a as boolOptions, i as intOptions, n as nullOptions, s as strOptions, N as Node, P as Pair, S as Scalar, c as stringifyString, A as Alias, Y as YAMLSeq, d as YAMLMap, C as Collection, r as resolveScalar, e as createNode, f as isEmptyPath, g as collectionFromPath, t as toJS, h as addComment } from './stringifyNumber-d8af95b1.js';
import { M as Merge, a as MERGE_KEY, S as Schema } from './Schema-ea978338.js';

var defaultOptions = {
  anchorPrefix: 'a',
  customTags: null,
  indent: 2,
  indentSeq: true,
  keepCstNodes: false,
  keepNodeTypes: true,
  keepUndefined: false,
  mapAsMap: false,
  maxAliasCount: 100,
  prettyErrors: true,
  simpleKeys: false,
  version: '1.2'
};
var scalarOptions = {
  get binary() {
    return binaryOptions;
  },

  set binary(opt) {
    Object.assign(binaryOptions, opt);
  },

  get bool() {
    return boolOptions;
  },

  set bool(opt) {
    Object.assign(boolOptions, opt);
  },

  get int() {
    return intOptions;
  },

  set int(opt) {
    Object.assign(intOptions, opt);
  },

  get null() {
    return nullOptions;
  },

  set null(opt) {
    Object.assign(nullOptions, opt);
  },

  get str() {
    return strOptions;
  },

  set str(opt) {
    Object.assign(strOptions, opt);
  }

};
var documentOptions = {
  '1.0': {
    schema: 'yaml-1.1',
    merge: true,
    tagPrefixes: [{
      handle: '!',
      prefix: defaultTagPrefix
    }, {
      handle: '!!',
      prefix: 'tag:private.yaml.org,2002:'
    }]
  },
  '1.1': {
    schema: 'yaml-1.1',
    merge: true,
    tagPrefixes: [{
      handle: '!',
      prefix: '!'
    }, {
      handle: '!!',
      prefix: defaultTagPrefix
    }]
  },
  '1.2': {
    schema: 'core',
    merge: false,
    resolveKnownTags: true,
    tagPrefixes: [{
      handle: '!',
      prefix: '!'
    }, {
      handle: '!!',
      prefix: defaultTagPrefix
    }]
  }
};

function stringifyTag(doc, tag) {
  if ((doc.version || doc.options.version) === '1.0') {
    var priv = tag.match(/^tag:private\.yaml\.org,2002:([^:/]+)$/);
    if (priv) return '!' + priv[1];
    var vocab = tag.match(/^tag:([a-zA-Z0-9-]+)\.yaml\.org,2002:(.*)/);
    return vocab ? "!".concat(vocab[1], "/").concat(vocab[2]) : "!".concat(tag.replace(/^tag:/, ''));
  }

  var p = doc.tagPrefixes.find(function (p) {
    return tag.indexOf(p.prefix) === 0;
  });

  if (!p) {
    var dtp = doc.getDefaults().tagPrefixes;
    p = dtp && dtp.find(function (p) {
      return tag.indexOf(p.prefix) === 0;
    });
  }

  if (!p) return tag[0] === '!' ? tag : "!<".concat(tag, ">");
  var suffix = tag.substr(p.prefix.length).replace(/[!,[\]{}]/g, function (ch) {
    return {
      '!': '%21',
      ',': '%2C',
      '[': '%5B',
      ']': '%5D',
      '{': '%7B',
      '}': '%7D'
    }[ch];
  });
  return p.handle + suffix;
}

function getTagObject(tags, item) {
  if (item instanceof Alias) return Alias;

  if (item.tag) {
    var match = tags.filter(function (t) {
      return t.tag === item.tag;
    });
    if (match.length > 0) return match.find(function (t) {
      return t.format === item.format;
    }) || match[0];
  }

  var tagObj, obj;

  if (item instanceof Scalar) {
    obj = item.value;

    var _match = tags.filter(function (t) {
      return t.identify && t.identify(obj);
    });

    tagObj = _match.find(function (t) {
      return t.format === item.format;
    }) || _match.find(function (t) {
      return !t.format;
    });
  } else {
    obj = item;
    tagObj = tags.find(function (t) {
      return t.nodeClass && obj instanceof t.nodeClass;
    });
  }

  if (!tagObj) {
    var name = obj && obj.constructor ? obj.constructor.name : _typeof(obj);
    throw new Error("Tag not resolved for ".concat(name, " value"));
  }

  return tagObj;
} // needs to be called before value stringifier to allow for circular anchor refs


function stringifyProps(node, tagObj, _ref) {
  var anchors = _ref.anchors,
      doc = _ref.doc;
  var props = [];
  var anchor = doc.anchors.getName(node);

  if (anchor) {
    anchors[anchor] = node;
    props.push("&".concat(anchor));
  }

  if (node.tag) {
    props.push(stringifyTag(doc, node.tag));
  } else if (!tagObj.default) {
    props.push(stringifyTag(doc, tagObj.tag));
  }

  return props.join(' ');
}

function stringify(item, ctx, onComment, onChompKeep) {
  var schema = ctx.doc.schema;
  var tagObj;

  if (!(item instanceof Node)) {
    item = ctx.doc.createNode(item, {
      onTagObj: function onTagObj(o) {
        return tagObj = o;
      },
      wrapScalars: true
    });
  }

  if (item instanceof Pair) return item.toString(ctx, onComment, onChompKeep);
  if (!tagObj) tagObj = getTagObject(schema.tags, item);
  var props = stringifyProps(item, tagObj, ctx);
  if (props.length > 0) ctx.indentAtStart = (ctx.indentAtStart || 0) + props.length + 1;
  var str = typeof tagObj.stringify === 'function' ? tagObj.stringify(item, ctx, onComment, onChompKeep) : item instanceof Scalar ? stringifyString(item, ctx, onComment, onChompKeep) : item.toString(ctx, onComment, onChompKeep);
  if (!props) return str;
  return item instanceof Scalar || str[0] === '{' || str[0] === '[' ? "".concat(props, " ").concat(str) : "".concat(props, "\n").concat(ctx.indent).concat(str);
}

var Anchors = /*#__PURE__*/function () {
  _createClass(Anchors, null, [{
    key: "validAnchorNode",
    value: function validAnchorNode(node) {
      return node instanceof Scalar || node instanceof YAMLSeq || node instanceof YAMLMap;
    }
  }]);

  function Anchors(prefix) {
    _classCallCheck(this, Anchors);

    _defineProperty(this, "map", Object.create(null));

    this.prefix = prefix;
  }

  _createClass(Anchors, [{
    key: "createAlias",
    value: function createAlias(node, name) {
      this.setAnchor(node, name);
      return new Alias(node);
    }
  }, {
    key: "createMergePair",
    value: function createMergePair() {
      var _this = this;

      var merge = new Merge();

      for (var _len = arguments.length, sources = new Array(_len), _key = 0; _key < _len; _key++) {
        sources[_key] = arguments[_key];
      }

      merge.value.items = sources.map(function (s) {
        if (s instanceof Alias) {
          if (s.source instanceof YAMLMap) return s;
        } else if (s instanceof YAMLMap) {
          return _this.createAlias(s);
        }

        throw new Error('Merge sources must be Map nodes or their Aliases');
      });
      return merge;
    }
  }, {
    key: "getName",
    value: function getName(node) {
      var map = this.map;
      return Object.keys(map).find(function (a) {
        return map[a] === node;
      });
    }
  }, {
    key: "getNames",
    value: function getNames() {
      return Object.keys(this.map);
    }
  }, {
    key: "getNode",
    value: function getNode(name) {
      return this.map[name];
    }
  }, {
    key: "newName",
    value: function newName(prefix) {
      if (!prefix) prefix = this.prefix;
      var names = Object.keys(this.map);

      for (var i = 1; true; ++i) {
        var name = "".concat(prefix).concat(i);
        if (!names.includes(name)) return name;
      }
    } // During parsing, map & aliases contain CST nodes

  }, {
    key: "resolveNodes",
    value: function resolveNodes() {
      var map = this.map,
          _cstAliases = this._cstAliases;
      Object.keys(map).forEach(function (a) {
        map[a] = map[a].resolved;
      });

      _cstAliases.forEach(function (a) {
        a.source = a.source.resolved;
      });

      delete this._cstAliases;
    }
  }, {
    key: "setAnchor",
    value: function setAnchor(node, name) {
      if (node != null && !Anchors.validAnchorNode(node)) {
        throw new Error('Anchors may only be set for Scalar, Seq and Map nodes');
      }

      if (name && /[\x00-\x19\s,[\]{}]/.test(name)) {
        throw new Error('Anchor names must not contain whitespace or control characters');
      }

      var map = this.map;
      var prev = node && Object.keys(map).find(function (a) {
        return map[a] === node;
      });

      if (prev) {
        if (!name) {
          return prev;
        } else if (prev !== name) {
          delete map[prev];
          map[name] = node;
        }
      } else {
        if (!name) {
          if (!node) return null;
          name = this.newName();
        }

        map[name] = node;
      }

      return name;
    }
  }]);

  return Anchors;
}();

/**
 * Applies the JSON.parse reviver algorithm as defined in the ECMA-262 spec,
 * in section 24.5.1.1 "Runtime Semantics: InternalizeJSONProperty" of the
 * 2021 edition: https://tc39.es/ecma262/#sec-json.parse
 *
 * Includes extensions for handling Map and Set objects.
 */
function applyReviver(reviver, obj, key, val) {
  if (val && _typeof(val) === 'object') {
    if (Array.isArray(val)) {
      for (var i = 0, len = val.length; i < len; ++i) {
        var v0 = val[i];
        var v1 = applyReviver(reviver, val, String(i), v0);
        if (v1 === undefined) delete val[i];else if (v1 !== v0) val[i] = v1;
      }
    } else if (val instanceof Map) {
      for (var _i = 0, _Array$from = Array.from(val.keys()); _i < _Array$from.length; _i++) {
        var k = _Array$from[_i];

        var _v = val.get(k);

        var _v2 = applyReviver(reviver, val, k, _v);

        if (_v2 === undefined) val.delete(k);else if (_v2 !== _v) val.set(k, _v2);
      }
    } else if (val instanceof Set) {
      for (var _i2 = 0, _Array$from2 = Array.from(val); _i2 < _Array$from2.length; _i2++) {
        var _v3 = _Array$from2[_i2];

        var _v4 = applyReviver(reviver, val, _v3, _v3);

        if (_v4 === undefined) val.delete(_v3);else if (_v4 !== _v3) {
          val.delete(_v3);
          val.add(_v4);
        }
      }
    } else {
      for (var _i3 = 0, _Object$entries = Object.entries(val); _i3 < _Object$entries.length; _i3++) {
        var _Object$entries$_i = _slicedToArray(_Object$entries[_i3], 2),
            _k = _Object$entries$_i[0],
            _v5 = _Object$entries$_i[1];

        var _v6 = applyReviver(reviver, val, _k, _v5);

        if (_v6 === undefined) delete val[_k];else if (_v6 !== _v5) val[_k] = _v6;
      }
    }
  }

  return reviver.call(obj, key, val);
}

var visit = function visit(node, tags) {
  if (node && _typeof(node) === 'object') {
    var tag = node.tag;

    if (node instanceof Collection) {
      if (tag) tags[tag] = true;
      node.items.forEach(function (n) {
        return visit(n, tags);
      });
    } else if (node instanceof Pair) {
      visit(node.key, tags);
      visit(node.value, tags);
    } else if (node instanceof Scalar) {
      if (tag) tags[tag] = true;
    }
  }

  return tags;
};

var listTagNames = function listTagNames(node) {
  return Object.keys(visit(node, {}));
};

function resolveTagHandle(doc, node) {
  var _node$tag = node.tag,
      handle = _node$tag.handle,
      suffix = _node$tag.suffix;
  var prefix = doc.tagPrefixes.find(function (p) {
    return p.handle === handle;
  });

  if (!prefix) {
    var dtp = doc.getDefaults().tagPrefixes;
    if (dtp) prefix = dtp.find(function (p) {
      return p.handle === handle;
    });
    if (!prefix) throw new YAMLSemanticError(node, "The ".concat(handle, " tag handle is non-default and was not declared."));
  }

  if (!suffix) throw new YAMLSemanticError(node, "The ".concat(handle, " tag has no suffix."));

  if (handle === '!' && (doc.version || doc.options.version) === '1.0') {
    if (suffix[0] === '^') {
      doc.warnings.push(new YAMLWarning(node, 'YAML 1.0 ^ tag expansion is not supported'));
      return suffix;
    }

    if (/[:/]/.test(suffix)) {
      // word/foo -> tag:word.yaml.org,2002:foo
      var vocab = suffix.match(/^([a-z0-9-]+)\/(.*)/i);
      return vocab ? "tag:".concat(vocab[1], ".yaml.org,2002:").concat(vocab[2]) : "tag:".concat(suffix);
    }
  }

  return prefix.prefix + decodeURIComponent(suffix);
}

function resolveTagName(doc, node) {
  var tag = node.tag,
      type = node.type;
  var nonSpecific = false;

  if (tag) {
    var handle = tag.handle,
        suffix = tag.suffix,
        verbatim = tag.verbatim;

    if (verbatim) {
      if (verbatim !== '!' && verbatim !== '!!') return verbatim;
      var msg = "Verbatim tags aren't resolved, so ".concat(verbatim, " is invalid.");
      doc.errors.push(new YAMLSemanticError(node, msg));
    } else if (handle === '!' && !suffix) {
      nonSpecific = true;
    } else {
      try {
        return resolveTagHandle(doc, node);
      } catch (error) {
        doc.errors.push(error);
      }
    }
  }

  switch (type) {
    case Type.BLOCK_FOLDED:
    case Type.BLOCK_LITERAL:
    case Type.QUOTE_DOUBLE:
    case Type.QUOTE_SINGLE:
      return defaultTags.STR;

    case Type.FLOW_MAP:
    case Type.MAP:
      return defaultTags.MAP;

    case Type.FLOW_SEQ:
    case Type.SEQ:
      return defaultTags.SEQ;

    case Type.PLAIN:
      return nonSpecific ? defaultTags.STR : null;

    default:
      return null;
  }
}

function checkFlowCollectionEnd(errors, cst) {
  var char, name;

  switch (cst.type) {
    case Type.FLOW_MAP:
      char = '}';
      name = 'flow map';
      break;

    case Type.FLOW_SEQ:
      char = ']';
      name = 'flow sequence';
      break;

    default:
      errors.push(new YAMLSemanticError(cst, 'Not a flow collection!?'));
      return;
  }

  var lastItem;

  for (var i = cst.items.length - 1; i >= 0; --i) {
    var item = cst.items[i];

    if (!item || item.type !== Type.COMMENT) {
      lastItem = item;
      break;
    }
  }

  if (lastItem && lastItem.char !== char) {
    var msg = "Expected ".concat(name, " to end with ").concat(char);
    var err;

    if (typeof lastItem.offset === 'number') {
      err = new YAMLSemanticError(cst, msg);
      err.offset = lastItem.offset + 1;
    } else {
      err = new YAMLSemanticError(lastItem, msg);
      if (lastItem.range && lastItem.range.end) err.offset = lastItem.range.end - lastItem.range.start;
    }

    errors.push(err);
  }
}
function checkFlowCommentSpace(errors, comment) {
  var prev = comment.context.src[comment.range.start - 1];

  if (prev !== '\n' && prev !== '\t' && prev !== ' ') {
    var msg = 'Comments must be separated from other tokens by white space characters';
    errors.push(new YAMLSemanticError(comment, msg));
  }
}
function getLongKeyError(source, key) {
  var sk = String(key);
  var k = sk.substr(0, 8) + '...' + sk.substr(-8);
  return new YAMLSemanticError(source, "The \"".concat(k, "\" key is too long"));
}
function resolveComments(collection, comments) {
  var _iterator = _createForOfIteratorHelper(comments),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _step$value = _step.value,
          afterKey = _step$value.afterKey,
          before = _step$value.before,
          comment = _step$value.comment;
      var item = collection.items[before];

      if (!item) {
        if (comment !== undefined) {
          if (collection.comment) collection.comment += '\n' + comment;else collection.comment = comment;
        }
      } else {
        if (afterKey && item.value) item = item.value;

        if (comment === undefined) {
          if (afterKey || !item.commentBefore) item.spaceBefore = true;
        } else {
          if (item.commentBefore) item.commentBefore += '\n' + comment;else item.commentBefore = comment;
        }
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
}

function resolveMap(doc, cst) {
  var _ref = cst.type === Type.FLOW_MAP ? resolveFlowMapItems(doc, cst) : resolveBlockMapItems(doc, cst),
      comments = _ref.comments,
      items = _ref.items;

  var map = new YAMLMap(doc.schema);
  map.items = items;
  resolveComments(map, comments);
  var hasCollectionKey = false;

  for (var i = 0; i < items.length; ++i) {
    var iKey = items[i].key;
    if (iKey instanceof Collection) hasCollectionKey = true;

    if (doc.schema.merge && iKey && iKey.value === MERGE_KEY) {
      items[i] = new Merge(items[i]);
      var sources = items[i].value.items;
      var error = null;
      sources.some(function (node) {
        if (node instanceof Alias) {
          // During parsing, alias sources are CST nodes; to account for
          // circular references their resolved values can't be used here.
          var type = node.source.type;
          if (type === Type.MAP || type === Type.FLOW_MAP) return false;
          return error = 'Merge nodes aliases can only point to maps';
        }

        return error = 'Merge nodes can only have Alias nodes as values';
      });
      if (error) doc.errors.push(new YAMLSemanticError(cst, error));
    } else {
      for (var j = i + 1; j < items.length; ++j) {
        var jKey = items[j].key;

        if (iKey === jKey || iKey && jKey && Object.prototype.hasOwnProperty.call(iKey, 'value') && iKey.value === jKey.value) {
          var msg = "Map keys must be unique; \"".concat(iKey, "\" is repeated");
          doc.errors.push(new YAMLSemanticError(cst, msg));
          break;
        }
      }
    }
  }

  if (hasCollectionKey && !doc.options.mapAsMap) {
    var warn = 'Keys with collection values will be stringified as YAML due to JS Object restrictions. Use mapAsMap: true to avoid this.';
    doc.warnings.push(new YAMLWarning(cst, warn));
  }

  cst.resolved = map;
  return map;
}

var valueHasPairComment = function valueHasPairComment(_ref2) {
  var _ref2$context = _ref2.context,
      lineStart = _ref2$context.lineStart,
      node = _ref2$context.node,
      src = _ref2$context.src,
      props = _ref2.props;
  if (props.length === 0) return false;
  var start = props[0].start;
  if (node && start > node.valueRange.start) return false;
  if (src[start] !== Char.COMMENT) return false;

  for (var i = lineStart; i < start; ++i) {
    if (src[i] === '\n') return false;
  }

  return true;
};

function resolvePairComment(item, pair) {
  if (!valueHasPairComment(item)) return;
  var comment = item.getPropValue(0, Char.COMMENT, true);
  var found = false;
  var cb = pair.value.commentBefore;

  if (cb && cb.startsWith(comment)) {
    pair.value.commentBefore = cb.substr(comment.length + 1);
    found = true;
  } else {
    var cc = pair.value.comment;

    if (!item.node && cc && cc.startsWith(comment)) {
      pair.value.comment = cc.substr(comment.length + 1);
      found = true;
    }
  }

  if (found) pair.comment = comment;
}

function resolveBlockMapItems(doc, cst) {
  var comments = [];
  var items = [];
  var key = undefined;
  var keyStart = null;

  for (var i = 0; i < cst.items.length; ++i) {
    var item = cst.items[i];

    switch (item.type) {
      case Type.BLANK_LINE:
        comments.push({
          afterKey: !!key,
          before: items.length
        });
        break;

      case Type.COMMENT:
        comments.push({
          afterKey: !!key,
          before: items.length,
          comment: item.comment
        });
        break;

      case Type.MAP_KEY:
        if (key !== undefined) items.push(new Pair(key));
        if (item.error) doc.errors.push(item.error);
        key = resolveNode(doc, item.node);
        keyStart = null;
        break;

      case Type.MAP_VALUE:
        {
          if (key === undefined) key = null;
          if (item.error) doc.errors.push(item.error);

          if (!item.context.atLineStart && item.node && item.node.type === Type.MAP && !item.node.context.atLineStart) {
            var msg = 'Nested mappings are not allowed in compact mappings';
            doc.errors.push(new YAMLSemanticError(item.node, msg));
          }

          var valueNode = item.node;

          if (!valueNode && item.props.length > 0) {
            // Comments on an empty mapping value need to be preserved, so we
            // need to construct a minimal empty node here to use instead of the
            // missing `item.node`. -- eemeli/yaml#19
            valueNode = new PlainValue(Type.PLAIN, []);
            valueNode.context = {
              parent: item,
              src: item.context.src
            };
            var pos = item.range.start + 1;
            valueNode.range = {
              start: pos,
              end: pos
            };
            valueNode.valueRange = {
              start: pos,
              end: pos
            };

            if (typeof item.range.origStart === 'number') {
              var origPos = item.range.origStart + 1;
              valueNode.range.origStart = valueNode.range.origEnd = origPos;
              valueNode.valueRange.origStart = valueNode.valueRange.origEnd = origPos;
            }
          }

          var pair = new Pair(key, resolveNode(doc, valueNode));
          resolvePairComment(item, pair);
          items.push(pair);

          if (key && typeof keyStart === 'number') {
            if (item.range.start > keyStart + 1024) doc.errors.push(getLongKeyError(cst, key));
          }

          key = undefined;
          keyStart = null;
        }
        break;

      default:
        if (key !== undefined) items.push(new Pair(key));
        key = resolveNode(doc, item);
        keyStart = item.range.start;
        if (item.error) doc.errors.push(item.error);

        next: for (var j = i + 1;; ++j) {
          var nextItem = cst.items[j];

          switch (nextItem && nextItem.type) {
            case Type.BLANK_LINE:
            case Type.COMMENT:
              continue next;

            case Type.MAP_VALUE:
              break next;

            default:
              {
                var _msg = 'Implicit map keys need to be followed by map values';
                doc.errors.push(new YAMLSemanticError(item, _msg));
                break next;
              }
          }
        }

        if (item.valueRangeContainsNewline) {
          var _msg2 = 'Implicit map keys need to be on a single line';
          doc.errors.push(new YAMLSemanticError(item, _msg2));
        }

    }
  }

  if (key !== undefined) items.push(new Pair(key));
  return {
    comments: comments,
    items: items
  };
}

function resolveFlowMapItems(doc, cst) {
  var comments = [];
  var items = [];
  var key = undefined;
  var explicitKey = false;
  var next = '{';

  for (var i = 0; i < cst.items.length; ++i) {
    var item = cst.items[i];

    if (typeof item.char === 'string') {
      var char = item.char,
          offset = item.offset;

      if (char === '?' && key === undefined && !explicitKey) {
        explicitKey = true;
        next = ':';
        continue;
      }

      if (char === ':') {
        if (key === undefined) key = null;

        if (next === ':') {
          next = ',';
          continue;
        }
      } else {
        if (explicitKey) {
          if (key === undefined && char !== ',') key = null;
          explicitKey = false;
        }

        if (key !== undefined) {
          items.push(new Pair(key));
          key = undefined;

          if (char === ',') {
            next = ':';
            continue;
          }
        }
      }

      if (char === '}') {
        if (i === cst.items.length - 1) continue;
      } else if (char === next) {
        next = ':';
        continue;
      }

      var msg = "Flow map contains an unexpected ".concat(char);
      var err = new YAMLSyntaxError(cst, msg);
      err.offset = offset;
      doc.errors.push(err);
    } else if (item.type === Type.BLANK_LINE) {
      comments.push({
        afterKey: !!key,
        before: items.length
      });
    } else if (item.type === Type.COMMENT) {
      checkFlowCommentSpace(doc.errors, item);
      comments.push({
        afterKey: !!key,
        before: items.length,
        comment: item.comment
      });
    } else if (key === undefined) {
      if (next === ',') doc.errors.push(new YAMLSemanticError(item, 'Separator , missing in flow map'));
      key = resolveNode(doc, item);
    } else {
      if (next !== ',') doc.errors.push(new YAMLSemanticError(item, 'Indicator : missing in flow map entry'));
      items.push(new Pair(key, resolveNode(doc, item)));
      key = undefined;
      explicitKey = false;
    }
  }

  checkFlowCollectionEnd(doc.errors, cst);
  if (key !== undefined) items.push(new Pair(key));
  return {
    comments: comments,
    items: items
  };
}

function resolveSeq(doc, cst) {
  var _ref = cst.type === Type.FLOW_SEQ ? resolveFlowSeqItems(doc, cst) : resolveBlockSeqItems(doc, cst),
      comments = _ref.comments,
      items = _ref.items;

  var seq = new YAMLSeq(doc.schema);
  seq.items = items;
  resolveComments(seq, comments);

  if (!doc.options.mapAsMap && items.some(function (it) {
    return it instanceof Pair && it.key instanceof Collection;
  })) {
    var warn = 'Keys with collection values will be stringified as YAML due to JS Object restrictions. Use mapAsMap: true to avoid this.';
    doc.warnings.push(new YAMLWarning(cst, warn));
  }

  cst.resolved = seq;
  return seq;
}

function resolveBlockSeqItems(doc, cst) {
  var comments = [];
  var items = [];

  for (var i = 0; i < cst.items.length; ++i) {
    var item = cst.items[i];

    switch (item.type) {
      case Type.BLANK_LINE:
        comments.push({
          before: items.length
        });
        break;

      case Type.COMMENT:
        comments.push({
          comment: item.comment,
          before: items.length
        });
        break;

      case Type.SEQ_ITEM:
        if (item.error) doc.errors.push(item.error);
        items.push(resolveNode(doc, item.node));

        if (item.hasProps) {
          var msg = 'Sequence items cannot have tags or anchors before the - indicator';
          doc.errors.push(new YAMLSemanticError(item, msg));
        }

        break;

      default:
        if (item.error) doc.errors.push(item.error);
        doc.errors.push(new YAMLSyntaxError(item, "Unexpected ".concat(item.type, " node in sequence")));
    }
  }

  return {
    comments: comments,
    items: items
  };
}

function resolveFlowSeqItems(doc, cst) {
  var comments = [];
  var items = [];
  var explicitKey = false;
  var key = undefined;
  var keyStart = null;
  var next = '[';
  var prevItem = null;

  for (var i = 0; i < cst.items.length; ++i) {
    var item = cst.items[i];

    if (typeof item.char === 'string') {
      var char = item.char,
          offset = item.offset;

      if (char !== ':' && (explicitKey || key !== undefined)) {
        if (explicitKey && key === undefined) key = next ? items.pop() : null;
        items.push(new Pair(key));
        explicitKey = false;
        key = undefined;
        keyStart = null;
      }

      if (char === next) {
        next = null;
      } else if (!next && char === '?') {
        explicitKey = true;
      } else if (next !== '[' && char === ':' && key === undefined) {
        if (next === ',') {
          key = items.pop();

          if (key instanceof Pair) {
            var msg = 'Chaining flow sequence pairs is invalid';
            var err = new YAMLSemanticError(cst, msg);
            err.offset = offset;
            doc.errors.push(err);
          }

          if (!explicitKey && typeof keyStart === 'number') {
            var keyEnd = item.range ? item.range.start : item.offset;
            if (keyEnd > keyStart + 1024) doc.errors.push(getLongKeyError(cst, key));
            var src = prevItem.context.src;

            for (var _i = keyStart; _i < keyEnd; ++_i) {
              if (src[_i] === '\n') {
                var _msg = 'Implicit keys of flow sequence pairs need to be on a single line';
                doc.errors.push(new YAMLSemanticError(prevItem, _msg));
                break;
              }
            }
          }
        } else {
          key = null;
        }

        keyStart = null;
        explicitKey = false;
        next = null;
      } else if (next === '[' || char !== ']' || i < cst.items.length - 1) {
        var _msg2 = "Flow sequence contains an unexpected ".concat(char);

        var _err = new YAMLSyntaxError(cst, _msg2);

        _err.offset = offset;
        doc.errors.push(_err);
      }
    } else if (item.type === Type.BLANK_LINE) {
      comments.push({
        before: items.length
      });
    } else if (item.type === Type.COMMENT) {
      checkFlowCommentSpace(doc.errors, item);
      comments.push({
        comment: item.comment,
        before: items.length
      });
    } else {
      if (next) {
        var _msg3 = "Expected a ".concat(next, " in flow sequence");

        doc.errors.push(new YAMLSemanticError(item, _msg3));
      }

      var value = resolveNode(doc, item);

      if (key === undefined) {
        items.push(value);
        prevItem = item;
      } else {
        items.push(new Pair(key, value));
        key = undefined;
      }

      keyStart = item.range.start;
      next = ',';
    }
  }

  checkFlowCollectionEnd(doc.errors, cst);
  if (key !== undefined) items.push(new Pair(key));
  return {
    comments: comments,
    items: items
  };
}

function resolveByTagName(_ref, tagName, value, onError) {
  var knownTags = _ref.knownTags,
      tags = _ref.tags;
  var matchWithTest = [];

  var _iterator = _createForOfIteratorHelper(tags),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var tag = _step.value;

      if (tag.tag === tagName) {
        if (tag.test) {
          if (typeof value === 'string') matchWithTest.push(tag);else onError("The tag ".concat(tagName, " cannot be applied to a collection"));
        } else {
          var _res = tag.resolve(value, onError);

          return _res instanceof Collection ? _res : new Scalar(_res);
        }
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  if (matchWithTest.length > 0) return resolveScalar(value, matchWithTest);
  var kt = knownTags[tagName];

  if (kt) {
    tags.push(Object.assign({}, kt, {
      default: false,
      test: undefined
    }));
    var res = kt.resolve(value, onError);
    return res instanceof Collection ? res : new Scalar(res);
  }

  return null;
}

function resolveTag(doc, node, tagName) {
  var MAP = defaultTags.MAP,
      SEQ = defaultTags.SEQ,
      STR = defaultTags.STR;
  var value, fallback;

  var onError = function onError(message) {
    return doc.errors.push(new YAMLSemanticError(node, message));
  };

  try {
    switch (node.type) {
      case Type.FLOW_MAP:
      case Type.MAP:
        value = resolveMap(doc, node);
        fallback = MAP;
        if (tagName === SEQ || tagName === STR) onError("The tag ".concat(tagName, " cannot be applied to a mapping"));
        break;

      case Type.FLOW_SEQ:
      case Type.SEQ:
        value = resolveSeq(doc, node);
        fallback = SEQ;
        if (tagName === MAP || tagName === STR) onError("The tag ".concat(tagName, " cannot be applied to a sequence"));
        break;

      default:
        value = node.strValue || '';

        if (typeof value !== 'string') {
          value.errors.forEach(function (error) {
            return doc.errors.push(error);
          });
          value = value.str;
        }

        if (tagName === MAP || tagName === SEQ) onError("The tag ".concat(tagName, " cannot be applied to a scalar"));
        fallback = STR;
    }

    var res = resolveByTagName(doc.schema, tagName, value, onError);

    if (res) {
      if (tagName && node.tag) res.tag = tagName;
      return res;
    }
  } catch (error) {
    /* istanbul ignore if */
    if (!error.source) error.source = node;
    doc.errors.push(error);
    return null;
  }

  try {
    if (!fallback) throw new Error("The tag ".concat(tagName, " is unavailable"));
    var msg = "The tag ".concat(tagName, " is unavailable, falling back to ").concat(fallback);
    doc.warnings.push(new YAMLWarning(node, msg));

    var _res2 = resolveByTagName(doc.schema, fallback, value, onError);

    _res2.tag = tagName;
    return _res2;
  } catch (error) {
    var refError = new YAMLReferenceError(node, error.message);
    refError.stack = error.stack;
    doc.errors.push(refError);
    return null;
  }
}

var isCollectionItem = function isCollectionItem(node) {
  if (!node) return false;
  var type = node.type;
  return type === Type.MAP_KEY || type === Type.MAP_VALUE || type === Type.SEQ_ITEM;
};

function resolveNodeProps(errors, node) {
  var comments = {
    before: [],
    after: []
  };
  var hasAnchor = false;
  var hasTag = false;
  var props = isCollectionItem(node.context.parent) ? node.context.parent.props.concat(node.props) : node.props;

  var _iterator = _createForOfIteratorHelper(props),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _step$value = _step.value,
          start = _step$value.start,
          end = _step$value.end;

      switch (node.context.src[start]) {
        case Char.COMMENT:
          {
            if (!node.commentHasRequiredWhitespace(start)) {
              var msg = 'Comments must be separated from other tokens by white space characters';
              errors.push(new YAMLSemanticError(node, msg));
            }

            var header = node.header,
                valueRange = node.valueRange;
            var cc = valueRange && (start > valueRange.start || header && start > header.start) ? comments.after : comments.before;
            cc.push(node.context.src.slice(start + 1, end));
            break;
          }
        // Actual anchor & tag resolution is handled by schema, here we just complain

        case Char.ANCHOR:
          if (hasAnchor) {
            var _msg = 'A node can have at most one anchor';
            errors.push(new YAMLSemanticError(node, _msg));
          }

          hasAnchor = true;
          break;

        case Char.TAG:
          if (hasTag) {
            var _msg2 = 'A node can have at most one tag';
            errors.push(new YAMLSemanticError(node, _msg2));
          }

          hasTag = true;
          break;
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return {
    comments: comments,
    hasAnchor: hasAnchor,
    hasTag: hasTag
  };
}

function resolveNodeValue(doc, node) {
  var anchors = doc.anchors,
      errors = doc.errors,
      schema = doc.schema;

  if (node.type === Type.ALIAS) {
    var name = node.rawValue;
    var src = anchors.getNode(name);

    if (!src) {
      var msg = "Aliased anchor not found: ".concat(name);
      errors.push(new YAMLReferenceError(node, msg));
      return null;
    } // Lazy resolution for circular references


    var res = new Alias(src);

    anchors._cstAliases.push(res);

    return res;
  }

  var tagName = resolveTagName(doc, node);
  if (tagName) return resolveTag(doc, node, tagName);

  if (node.type !== Type.PLAIN) {
    var _msg3 = "Failed to resolve ".concat(node.type, " node here");

    errors.push(new YAMLSyntaxError(node, _msg3));
    return null;
  }

  try {
    var str = node.strValue || '';

    if (typeof str !== 'string') {
      str.errors.forEach(function (error) {
        return doc.errors.push(error);
      });
      str = str.str;
    }

    return resolveScalar(str, schema.tags);
  } catch (error) {
    if (!error.source) error.source = node;
    errors.push(error);
    return null;
  }
} // sets node.resolved on success


function resolveNode(doc, node) {
  if (!node) return null;
  if (node.error) doc.errors.push(node.error);

  var _resolveNodeProps = resolveNodeProps(doc.errors, node),
      comments = _resolveNodeProps.comments,
      hasAnchor = _resolveNodeProps.hasAnchor,
      hasTag = _resolveNodeProps.hasTag;

  if (hasAnchor) {
    var anchors = doc.anchors;
    var name = node.anchor;
    var prev = anchors.getNode(name); // At this point, aliases for any preceding node with the same anchor
    // name have already been resolved, so it may safely be renamed.

    if (prev) anchors.map[anchors.newName(name)] = prev; // During parsing, we need to store the CST node in anchors.map as
    // anchors need to be available during resolution to allow for
    // circular references.

    anchors.map[name] = node;
  }

  if (node.type === Type.ALIAS && (hasAnchor || hasTag)) {
    var msg = 'An alias node must not specify any properties';
    doc.errors.push(new YAMLSemanticError(node, msg));
  }

  var res = resolveNodeValue(doc, node);

  if (res) {
    res.range = [node.range.start, node.range.end];
    if (doc.options.keepCstNodes) res.cstNode = node;
    if (doc.options.keepNodeTypes) res.type = node.type;
    var cb = comments.before.join('\n');

    if (cb) {
      res.commentBefore = res.commentBefore ? "".concat(res.commentBefore, "\n").concat(cb) : cb;
    }

    var ca = comments.after.join('\n');
    if (ca) res.comment = res.comment ? "".concat(res.comment, "\n").concat(ca) : ca;
  }

  return node.resolved = res;
}

function parseContents(doc, contents) {
  var comments = {
    before: [],
    after: []
  };
  var body = undefined;
  var spaceBefore = false;

  var _iterator = _createForOfIteratorHelper(contents),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var node = _step.value;

      if (node.valueRange) {
        if (body !== undefined) {
          var msg = 'Document contains trailing content not separated by a ... or --- line';
          doc.errors.push(new YAMLSyntaxError(node, msg));
          break;
        }

        var res = resolveNode(doc, node);

        if (spaceBefore) {
          res.spaceBefore = true;
          spaceBefore = false;
        }

        body = res;
      } else if (node.comment !== null) {
        var cc = body === undefined ? comments.before : comments.after;
        cc.push(node.comment);
      } else if (node.type === Type.BLANK_LINE) {
        spaceBefore = true;

        if (body === undefined && comments.before.length > 0 && !doc.commentBefore) {
          // space-separated comments at start are parsed as document comments
          doc.commentBefore = comments.before.join('\n');
          comments.before = [];
        }
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  doc.contents = body || null;

  if (!body) {
    doc.comment = comments.before.concat(comments.after).join('\n') || null;
  } else {
    var cb = comments.before.join('\n');

    if (cb) {
      var cbNode = body instanceof Collection && body.items[0] ? body.items[0] : body;
      cbNode.commentBefore = cbNode.commentBefore ? "".concat(cb, "\n").concat(cbNode.commentBefore) : cb;
    }

    doc.comment = comments.after.join('\n') || null;
  }
}

function resolveTagDirective(_ref, directive) {
  var tagPrefixes = _ref.tagPrefixes;

  var _directive$parameters = _slicedToArray(directive.parameters, 2),
      handle = _directive$parameters[0],
      prefix = _directive$parameters[1];

  if (!handle || !prefix) {
    var msg = 'Insufficient parameters given for %TAG directive';
    throw new YAMLSemanticError(directive, msg);
  }

  if (tagPrefixes.some(function (p) {
    return p.handle === handle;
  })) {
    var _msg = 'The %TAG directive must only be given at most once per handle in the same document.';
    throw new YAMLSemanticError(directive, _msg);
  }

  return {
    handle: handle,
    prefix: prefix
  };
}

function resolveYamlDirective(doc, directive) {
  var _directive$parameters2 = _slicedToArray(directive.parameters, 1),
      version = _directive$parameters2[0];

  if (directive.name === 'YAML:1.0') version = '1.0';

  if (!version) {
    var msg = 'Insufficient parameters given for %YAML directive';
    throw new YAMLSemanticError(directive, msg);
  }

  if (!documentOptions[version]) {
    var v0 = doc.version || doc.options.version;

    var _msg2 = "Document will be parsed as YAML ".concat(v0, " rather than YAML ").concat(version);

    doc.warnings.push(new YAMLWarning(directive, _msg2));
  }

  return version;
}

function parseDirectives(doc, directives, prevDoc) {
  var directiveComments = [];
  var hasDirectives = false;

  var _iterator = _createForOfIteratorHelper(directives),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var directive = _step.value;
      var comment = directive.comment,
          name = directive.name;

      switch (name) {
        case 'TAG':
          try {
            doc.tagPrefixes.push(resolveTagDirective(doc, directive));
          } catch (error) {
            doc.errors.push(error);
          }

          hasDirectives = true;
          break;

        case 'YAML':
        case 'YAML:1.0':
          if (doc.version) {
            var msg = 'The %YAML directive must only be given at most once per document.';
            doc.errors.push(new YAMLSemanticError(directive, msg));
          }

          try {
            doc.version = resolveYamlDirective(doc, directive);
          } catch (error) {
            doc.errors.push(error);
          }

          hasDirectives = true;
          break;

        default:
          if (name) {
            var _msg3 = "YAML only supports %TAG and %YAML directives, and not %".concat(name);

            doc.warnings.push(new YAMLWarning(directive, _msg3));
          }

      }

      if (comment) directiveComments.push(comment);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  if (prevDoc && !hasDirectives && '1.1' === (doc.version || prevDoc.version || doc.options.version)) {
    var copyTagPrefix = function copyTagPrefix(_ref2) {
      var handle = _ref2.handle,
          prefix = _ref2.prefix;
      return {
        handle: handle,
        prefix: prefix
      };
    };

    doc.tagPrefixes = prevDoc.tagPrefixes.map(copyTagPrefix);
    doc.version = prevDoc.version;
  }

  doc.commentBefore = directiveComments.join('\n') || null;
}

function assertCollection(contents) {
  if (contents instanceof Collection) return true;
  throw new Error('Expected a YAML collection as document contents');
}

var Document = /*#__PURE__*/function () {
  function Document(value, replacer, options) {
    _classCallCheck(this, Document);

    if (options === undefined && replacer && _typeof(replacer) === 'object' && !Array.isArray(replacer)) {
      options = replacer;
      replacer = undefined;
    }

    this.options = Object.assign({}, defaultOptions, options);
    this.anchors = new Anchors(this.options.anchorPrefix);
    this.commentBefore = null;
    this.comment = null;
    this.directivesEndMarker = null;
    this.errors = [];
    this.schema = null;
    this.tagPrefixes = [];
    this.version = null;
    this.warnings = [];

    if (value === undefined) {
      // note that this.schema is left as null here
      this.contents = null;
    } else if (value instanceof Document$1) {
      this.parse(value);
    } else {
      this.contents = this.createNode(value, {
        replacer: replacer
      });
    }
  }

  _createClass(Document, [{
    key: "add",
    value: function add(value) {
      assertCollection(this.contents);
      return this.contents.add(value);
    }
  }, {
    key: "addIn",
    value: function addIn(path, value) {
      assertCollection(this.contents);
      this.contents.addIn(path, value);
    }
  }, {
    key: "createNode",
    value: function createNode$1(value) {
      var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          keepUndefined = _ref.keepUndefined,
          onTagObj = _ref.onTagObj,
          replacer = _ref.replacer,
          tag = _ref.tag,
          wrapScalars = _ref.wrapScalars;

      this.setSchema();
      if (typeof replacer === 'function') value = replacer.call({
        '': value
      }, '', value);else if (Array.isArray(replacer)) {
        var keyToStr = function keyToStr(v) {
          return typeof v === 'number' || v instanceof String || v instanceof Number;
        };

        var asStr = replacer.filter(keyToStr).map(String);
        if (asStr.length > 0) replacer = replacer.concat(asStr);
      }
      if (typeof keepUndefined !== 'boolean') keepUndefined = !!this.options.keepUndefined;
      var aliasNodes = [];
      var ctx = {
        keepUndefined: keepUndefined,
        onAlias: function onAlias(source) {
          var alias = new Alias(source);
          aliasNodes.push(alias);
          return alias;
        },
        onTagObj: onTagObj,
        prevObjects: new Map(),
        replacer: replacer,
        schema: this.schema,
        wrapScalars: wrapScalars !== false
      };

      var node = createNode(value, tag, ctx);

      for (var _i = 0, _aliasNodes = aliasNodes; _i < _aliasNodes.length; _i++) {
        var alias = _aliasNodes[_i];
        // With circular references, the source node is only resolved after all of
        // its child nodes are. This is why anchors are set only after all of the
        // nodes have been created.
        alias.source = alias.source.node;
        var name = this.anchors.getName(alias.source);

        if (!name) {
          name = this.anchors.newName();
          this.anchors.map[name] = alias.source;
        }
      }

      return node;
    }
  }, {
    key: "createPair",
    value: function createPair(key, value) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      var k = this.createNode(key, options);
      var v = this.createNode(value, options);
      return new Pair(k, v);
    }
  }, {
    key: "delete",
    value: function _delete(key) {
      assertCollection(this.contents);
      return this.contents.delete(key);
    }
  }, {
    key: "deleteIn",
    value: function deleteIn(path) {
      if (isEmptyPath(path)) {
        if (this.contents == null) return false;
        this.contents = null;
        return true;
      }

      assertCollection(this.contents);
      return this.contents.deleteIn(path);
    }
  }, {
    key: "getDefaults",
    value: function getDefaults() {
      return Document.defaults[this.version] || Document.defaults[this.options.version] || {};
    }
  }, {
    key: "get",
    value: function get(key, keepScalar) {
      return this.contents instanceof Collection ? this.contents.get(key, keepScalar) : undefined;
    }
  }, {
    key: "getIn",
    value: function getIn(path, keepScalar) {
      if (isEmptyPath(path)) return !keepScalar && this.contents instanceof Scalar ? this.contents.value : this.contents;
      return this.contents instanceof Collection ? this.contents.getIn(path, keepScalar) : undefined;
    }
  }, {
    key: "has",
    value: function has(key) {
      return this.contents instanceof Collection ? this.contents.has(key) : false;
    }
  }, {
    key: "hasIn",
    value: function hasIn(path) {
      if (isEmptyPath(path)) return this.contents !== undefined;
      return this.contents instanceof Collection ? this.contents.hasIn(path) : false;
    }
  }, {
    key: "set",
    value: function set(key, value) {
      if (this.contents == null) {
        this.setSchema();
        this.contents = collectionFromPath(this.schema, [key], value);
      } else {
        assertCollection(this.contents);
        this.contents.set(key, value);
      }
    }
  }, {
    key: "setIn",
    value: function setIn(path, value) {
      if (isEmptyPath(path)) this.contents = value;else if (this.contents == null) {
        this.setSchema();
        this.contents = collectionFromPath(this.schema, path, value);
      } else {
        assertCollection(this.contents);
        this.contents.setIn(path, value);
      }
    }
  }, {
    key: "setSchema",
    value: function setSchema(id, customTags) {
      if (!id && !customTags && this.schema) return;
      if (typeof id === 'number') id = id.toFixed(1);

      if (id === '1.0' || id === '1.1' || id === '1.2') {
        if (this.version) this.version = id;else this.options.version = id;
        delete this.options.schema;
      } else if (id && typeof id === 'string') {
        this.options.schema = id;
      }

      if (Array.isArray(customTags)) this.options.customTags = customTags;
      var opt = Object.assign({}, this.getDefaults(), this.options);
      this.schema = new Schema(opt);
    }
  }, {
    key: "parse",
    value: function parse(node, prevDoc) {
      if (this.options.keepCstNodes) this.cstNode = node;
      if (this.options.keepNodeTypes) this.type = 'DOCUMENT';
      var _node$directives = node.directives,
          directives = _node$directives === void 0 ? [] : _node$directives,
          _node$contents = node.contents,
          contents = _node$contents === void 0 ? [] : _node$contents,
          directivesEndMarker = node.directivesEndMarker,
          error = node.error,
          valueRange = node.valueRange;

      if (error) {
        if (!error.source) error.source = this;
        this.errors.push(error);
      }

      parseDirectives(this, directives, prevDoc);
      if (directivesEndMarker) this.directivesEndMarker = true;
      this.range = valueRange ? [valueRange.start, valueRange.end] : null;
      this.setSchema();
      this.anchors._cstAliases = [];
      parseContents(this, contents);
      this.anchors.resolveNodes();

      if (this.options.prettyErrors) {
        var _iterator = _createForOfIteratorHelper(this.errors),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var _error = _step.value;
            if (_error instanceof YAMLError) _error.makePretty();
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }

        var _iterator2 = _createForOfIteratorHelper(this.warnings),
            _step2;

        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var warn = _step2.value;
            if (warn instanceof YAMLError) warn.makePretty();
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }
      }

      return this;
    }
  }, {
    key: "listNonDefaultTags",
    value: function listNonDefaultTags() {
      return listTagNames(this.contents).filter(function (t) {
        return t.indexOf(defaultTagPrefix) !== 0;
      });
    }
  }, {
    key: "setTagPrefix",
    value: function setTagPrefix(handle, prefix) {
      if (handle[0] !== '!' || handle[handle.length - 1] !== '!') throw new Error('Handle must start and end with !');

      if (prefix) {
        var prev = this.tagPrefixes.find(function (p) {
          return p.handle === handle;
        });
        if (prev) prev.prefix = prefix;else this.tagPrefixes.push({
          handle: handle,
          prefix: prefix
        });
      } else {
        this.tagPrefixes = this.tagPrefixes.filter(function (p) {
          return p.handle !== handle;
        });
      }
    }
  }, {
    key: "toJS",
    value: function toJS$1() {
      var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
          json = _ref2.json,
          jsonArg = _ref2.jsonArg,
          mapAsMap = _ref2.mapAsMap,
          onAnchor = _ref2.onAnchor,
          reviver = _ref2.reviver;

      var anchorNodes = Object.values(this.anchors.map).map(function (node) {
        return [node, {
          alias: [],
          aliasCount: 0,
          count: 1
        }];
      });
      var anchors = anchorNodes.length > 0 ? new Map(anchorNodes) : null;
      var ctx = {
        anchors: anchors,
        doc: this,
        indentStep: '  ',
        keep: !json,
        mapAsMap: typeof mapAsMap === 'boolean' ? mapAsMap : !!this.options.mapAsMap,
        maxAliasCount: this.options.maxAliasCount,
        stringify: stringify // Requiring directly in Pair would create circular dependencies

      };

      var res = toJS(this.contents, jsonArg || '', ctx);

      if (typeof onAnchor === 'function' && anchors) {
        var _iterator3 = _createForOfIteratorHelper(anchors.values()),
            _step3;

        try {
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
            var _step3$value = _step3.value,
                count = _step3$value.count,
                _res = _step3$value.res;
            onAnchor(_res, count);
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }
      }

      return typeof reviver === 'function' ? applyReviver(reviver, {
        '': res
      }, '', res) : res;
    }
  }, {
    key: "toJSON",
    value: function toJSON(jsonArg, onAnchor) {
      return this.toJS({
        json: true,
        jsonArg: jsonArg,
        mapAsMap: false,
        onAnchor: onAnchor
      });
    }
  }, {
    key: "toString",
    value: function toString() {
      if (this.errors.length > 0) throw new Error('Document with errors cannot be stringified');
      var indentSize = this.options.indent;

      if (!Number.isInteger(indentSize) || indentSize <= 0) {
        var s = JSON.stringify(indentSize);
        throw new Error("\"indent\" option must be a positive integer, not ".concat(s));
      }

      this.setSchema();
      var lines = [];
      var hasDirectives = false;

      if (this.version) {
        var vd = '%YAML 1.2';

        if (this.schema.name === 'yaml-1.1') {
          if (this.version === '1.0') vd = '%YAML:1.0';else if (this.version === '1.1') vd = '%YAML 1.1';
        }

        lines.push(vd);
        hasDirectives = true;
      }

      var tagNames = this.listNonDefaultTags();
      this.tagPrefixes.forEach(function (_ref3) {
        var handle = _ref3.handle,
            prefix = _ref3.prefix;

        if (tagNames.some(function (t) {
          return t.indexOf(prefix) === 0;
        })) {
          lines.push("%TAG ".concat(handle, " ").concat(prefix));
          hasDirectives = true;
        }
      });
      if (hasDirectives || this.directivesEndMarker) lines.push('---');

      if (this.commentBefore) {
        if (hasDirectives || !this.directivesEndMarker) lines.unshift('');
        lines.unshift(this.commentBefore.replace(/^/gm, '#'));
      }

      var ctx = {
        anchors: Object.create(null),
        doc: this,
        indent: '',
        indentStep: ' '.repeat(indentSize),
        stringify: stringify // Requiring directly in nodes would create circular dependencies

      };
      var chompKeep = false;
      var contentComment = null;

      if (this.contents) {
        if (this.contents instanceof Node) {
          if (this.contents.spaceBefore && (hasDirectives || this.directivesEndMarker)) lines.push('');
          if (this.contents.commentBefore) lines.push(this.contents.commentBefore.replace(/^/gm, '#')); // top-level block scalars need to be indented if followed by a comment

          ctx.forceBlockIndent = !!this.comment;
          contentComment = this.contents.comment;
        }

        var onChompKeep = contentComment ? null : function () {
          return chompKeep = true;
        };
        var body = stringify(this.contents, ctx, function () {
          return contentComment = null;
        }, onChompKeep);
        lines.push(addComment(body, '', contentComment));
      } else {
        lines.push(stringify(this.contents, ctx));
      }

      if (this.comment) {
        if ((!chompKeep || contentComment) && lines[lines.length - 1] !== '') lines.push('');
        lines.push(this.comment.replace(/^/gm, '#'));
      }

      return lines.join('\n') + '\n';
    }
  }]);

  return Document;
}();

_defineProperty(Document, "defaults", documentOptions);

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


  console.warn(type ? "".concat(type, ": ").concat(warning) : warning);
}

function parseAllDocuments(src, options) {
  var stream = [];
  var prev;

  var _iterator = _createForOfIteratorHelper(parse$1(src)),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var cstDoc = _step.value;
      var doc = new Document(undefined, null, options);
      doc.parse(cstDoc, prev);
      stream.push(doc);
      prev = doc;
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return stream;
}
function parseDocument(src, options) {
  var cst = parse$1(src);
  var doc = new Document(cst[0], null, options);

  if (cst.length > 1) {
    var errMsg = 'Source contains multiple documents; please use YAML.parseAllDocuments()';
    doc.errors.unshift(new YAMLSemanticError(cst[1], errMsg));
  }

  return doc;
}
function parse(src, reviver, options) {
  if (options === undefined && reviver && _typeof(reviver) === 'object') {
    options = reviver;
    reviver = undefined;
  }

  var doc = parseDocument(src, options);
  doc.warnings.forEach(function (warning) {
    return warn(warning);
  });
  if (doc.errors.length > 0) throw doc.errors[0];
  return doc.toJS({
    reviver: reviver
  });
}
function stringify$1(value, replacer, options) {
  if (typeof options === 'string') options = options.length;

  if (typeof options === 'number') {
    var indent = Math.round(options);
    options = indent < 1 ? undefined : indent > 8 ? {
      indent: 8
    } : {
      indent: indent
    };
  }

  if (value === undefined) {
    var _ref = options || replacer || {},
        keepUndefined = _ref.keepUndefined;

    if (!keepUndefined) return undefined;
  }

  return new Document(value, replacer, options).toString();
}

export { Document, defaultOptions, parse, parseAllDocuments, parseDocument, scalarOptions, stringify$1 as stringify };
