import { b as _classCallCheck, l as _inherits, m as _createSuper, a as _createClass, _ as _typeof, d as defaultTagPrefix, c as _defineProperty, p as _assertThisInitialized, q as _toArray, T as Type, h as _createForOfIteratorHelper, n as _get, o as _getPrototypeOf, j as YAMLReferenceError } from './errors-2634d01a.js';

function addCommentBefore(str, indent, comment) {
  if (!comment) return str;
  var cc = comment.replace(/[\s\S]^/gm, "$&".concat(indent, "#"));
  return "#".concat(cc, "\n").concat(indent).concat(str);
}
function addComment(str, indent, comment) {
  return !comment ? str : comment.indexOf('\n') === -1 ? "".concat(str, " #").concat(comment) : "".concat(str, "\n") + comment.replace(/^/gm, "".concat(indent || '', "#"));
}

var Node = function Node() {
  _classCallCheck(this, Node);
};

/**
 * Recursively convert any node or its contents to native JavaScript
 *
 * @param value - The input value
 * @param {string|null} arg - If `value` defines a `toJSON()` method, use this
 *   as its first argument
 * @param ctx - Conversion context, originally set in Document#toJS(). If
 *   `{ keep: true }` is not set, output should be suitable for JSON
 *   stringification.
 */
function toJS(value, arg, ctx) {
  if (Array.isArray(value)) return value.map(function (v, i) {
    return toJS(v, String(i), ctx);
  });

  if (value && typeof value.toJSON === 'function') {
    var anchor = ctx && ctx.anchors && ctx.anchors.get(value);
    if (anchor) ctx.onCreate = function (res) {
      anchor.res = res;
      delete ctx.onCreate;
    };
    var res = value.toJSON(arg, ctx);
    if (anchor && ctx.onCreate) ctx.onCreate(res);
    return res;
  }

  if (!(ctx && ctx.keep) && typeof value === 'bigint') return Number(value);
  return value;
}

var isScalarValue = function isScalarValue(value) {
  return !value || typeof value !== 'function' && _typeof(value) !== 'object';
};
var Scalar = /*#__PURE__*/function (_Node) {
  _inherits(Scalar, _Node);

  var _super = _createSuper(Scalar);

  function Scalar(value) {
    var _this;

    _classCallCheck(this, Scalar);

    _this = _super.call(this);
    _this.value = value;
    return _this;
  }

  _createClass(Scalar, [{
    key: "toJSON",
    value: function toJSON(arg, ctx) {
      return ctx && ctx.keep ? this.value : toJS(this.value, arg, ctx);
    }
  }, {
    key: "toString",
    value: function toString() {
      return String(this.value);
    }
  }]);

  return Scalar;
}(Node);

function findTagObject(value, tagName, tags) {
  if (tagName) {
    var match = tags.filter(function (t) {
      return t.tag === tagName;
    });
    var tagObj = match.find(function (t) {
      return !t.format;
    }) || match[0];
    if (!tagObj) throw new Error("Tag ".concat(tagName, " not found"));
    return tagObj;
  }

  return tags.find(function (t) {
    return t.identify && t.identify(value) && !t.format;
  });
}

function createNode(value, tagName, ctx) {
  if (value instanceof Node) return value;
  var onAlias = ctx.onAlias,
      onTagObj = ctx.onTagObj,
      prevObjects = ctx.prevObjects,
      wrapScalars = ctx.wrapScalars;
  var _ctx$schema = ctx.schema,
      map = _ctx$schema.map,
      seq = _ctx$schema.seq,
      tags = _ctx$schema.tags;
  if (tagName && tagName.startsWith('!!')) tagName = defaultTagPrefix + tagName.slice(2);
  var tagObj = findTagObject(value, tagName, tags);

  if (!tagObj) {
    if (typeof value.toJSON === 'function') value = value.toJSON();
    if (!value || _typeof(value) !== 'object') return wrapScalars ? new Scalar(value) : value;
    tagObj = value instanceof Map ? map : value[Symbol.iterator] ? seq : map;
  }

  if (onTagObj) {
    onTagObj(tagObj);
    delete ctx.onTagObj;
  } // Detect duplicate references to the same object & use Alias nodes for all
  // after first. The `obj` wrapper allows for circular references to resolve.


  var obj = {
    value: undefined,
    node: undefined
  };

  if (value && _typeof(value) === 'object') {
    var prev = prevObjects.get(value);
    if (prev) return onAlias(prev);
    obj.value = value;
    prevObjects.set(value, obj);
  }

  obj.node = tagObj.createNode ? tagObj.createNode(ctx.schema, value, ctx) : wrapScalars ? new Scalar(value) : value;
  if (tagName && obj.node instanceof Node) obj.node.tag = tagName;
  return obj.node;
}

function collectionFromPath(schema, path, value) {
  var v = value;

  for (var i = path.length - 1; i >= 0; --i) {
    var k = path[i];

    if (Number.isInteger(k) && k >= 0) {
      var a = [];
      a[k] = v;
      v = a;
    } else {
      var o = {};
      Object.defineProperty(o, k, {
        value: v,
        writable: true,
        enumerable: true,
        configurable: true
      });
      v = o;
    }
  }

  return createNode(v, null, {
    onAlias: function onAlias() {
      throw new Error('Repeated objects are not supported here');
    },
    prevObjects: new Map(),
    schema: schema,
    wrapScalars: false
  });
} // null, undefined, or an empty non-string iterable (e.g. [])

var isEmptyPath = function isEmptyPath(path) {
  return path == null || _typeof(path) === 'object' && path[Symbol.iterator]().next().done;
};
var Collection = /*#__PURE__*/function (_Node) {
  _inherits(Collection, _Node);

  var _super = _createSuper(Collection);

  function Collection(schema) {
    var _this;

    _classCallCheck(this, Collection);

    _this = _super.call(this);

    _defineProperty(_assertThisInitialized(_this), "items", []);

    _this.schema = schema;
    return _this;
  }

  _createClass(Collection, [{
    key: "addIn",
    value: function addIn(path, value) {
      if (isEmptyPath(path)) this.add(value);else {
        var _path = _toArray(path),
            key = _path[0],
            rest = _path.slice(1);

        var node = this.get(key, true);
        if (node instanceof Collection) node.addIn(rest, value);else if (node === undefined && this.schema) this.set(key, collectionFromPath(this.schema, rest, value));else throw new Error("Expected YAML collection at ".concat(key, ". Remaining path: ").concat(rest));
      }
    }
  }, {
    key: "deleteIn",
    value: function deleteIn(_ref) {
      var _ref2 = _toArray(_ref),
          key = _ref2[0],
          rest = _ref2.slice(1);

      if (rest.length === 0) return this.delete(key);
      var node = this.get(key, true);
      if (node instanceof Collection) return node.deleteIn(rest);else throw new Error("Expected YAML collection at ".concat(key, ". Remaining path: ").concat(rest));
    }
  }, {
    key: "getIn",
    value: function getIn(_ref3, keepScalar) {
      var _ref4 = _toArray(_ref3),
          key = _ref4[0],
          rest = _ref4.slice(1);

      var node = this.get(key, true);
      if (rest.length === 0) return !keepScalar && node instanceof Scalar ? node.value : node;else return node instanceof Collection ? node.getIn(rest, keepScalar) : undefined;
    }
  }, {
    key: "hasAllNullValues",
    value: function hasAllNullValues() {
      return this.items.every(function (node) {
        if (!node || node.type !== 'PAIR') return false;
        var n = node.value;
        return n == null || n instanceof Scalar && n.value == null && !n.commentBefore && !n.comment && !n.tag;
      });
    }
  }, {
    key: "hasIn",
    value: function hasIn(_ref5) {
      var _ref6 = _toArray(_ref5),
          key = _ref6[0],
          rest = _ref6.slice(1);

      if (rest.length === 0) return this.has(key);
      var node = this.get(key, true);
      return node instanceof Collection ? node.hasIn(rest) : false;
    }
  }, {
    key: "setIn",
    value: function setIn(_ref7, value) {
      var _ref8 = _toArray(_ref7),
          key = _ref8[0],
          rest = _ref8.slice(1);

      if (rest.length === 0) {
        this.set(key, value);
      } else {
        var node = this.get(key, true);
        if (node instanceof Collection) node.setIn(rest, value);else if (node === undefined && this.schema) this.set(key, collectionFromPath(this.schema, rest, value));else throw new Error("Expected YAML collection at ".concat(key, ". Remaining path: ").concat(rest));
      }
    }
    /* istanbul ignore next: overridden in implementations */

  }, {
    key: "toJSON",
    value: function toJSON() {
      return null;
    }
  }, {
    key: "toString",
    value: function toString(ctx, _ref9, onComment, onChompKeep) {
      var _this2 = this;

      var blockItem = _ref9.blockItem,
          flowChars = _ref9.flowChars,
          isMap = _ref9.isMap,
          itemIndent = _ref9.itemIndent;
      var _ctx = ctx,
          indent = _ctx.indent,
          indentStep = _ctx.indentStep,
          stringify = _ctx.stringify;
      var inFlow = this.type === Type.FLOW_MAP || this.type === Type.FLOW_SEQ || ctx.inFlow;
      if (inFlow) itemIndent += indentStep;
      var allNullValues = isMap && this.hasAllNullValues();
      ctx = Object.assign({}, ctx, {
        allNullValues: allNullValues,
        indent: itemIndent,
        inFlow: inFlow,
        type: null
      });
      var chompKeep = false;
      var hasItemWithNewLine = false;
      var nodes = this.items.reduce(function (nodes, item, i) {
        var comment;

        if (item) {
          if (!chompKeep && item.spaceBefore) nodes.push({
            type: 'comment',
            str: ''
          });
          if (item.commentBefore) item.commentBefore.match(/^.*$/gm).forEach(function (line) {
            nodes.push({
              type: 'comment',
              str: "#".concat(line)
            });
          });
          if (item.comment) comment = item.comment;
          if (inFlow && (!chompKeep && item.spaceBefore || item.commentBefore || item.comment || item.key && (item.key.commentBefore || item.key.comment) || item.value && (item.value.commentBefore || item.value.comment))) hasItemWithNewLine = true;
        }

        chompKeep = false;
        var str = stringify(item, ctx, function () {
          return comment = null;
        }, function () {
          return chompKeep = true;
        });
        if (inFlow && !hasItemWithNewLine && str.includes('\n')) hasItemWithNewLine = true;
        if (inFlow && i < _this2.items.length - 1) str += ',';
        str = addComment(str, itemIndent, comment);
        if (chompKeep && (comment || inFlow)) chompKeep = false;
        nodes.push({
          type: 'item',
          str: str
        });
        return nodes;
      }, []);
      var str;

      if (nodes.length === 0) {
        str = flowChars.start + flowChars.end;
      } else if (inFlow) {
        var start = flowChars.start,
            end = flowChars.end;
        var strings = nodes.map(function (n) {
          return n.str;
        });

        if (hasItemWithNewLine || strings.reduce(function (sum, str) {
          return sum + str.length + 2;
        }, 2) > Collection.maxFlowStringSingleLineLength) {
          str = start;

          var _iterator = _createForOfIteratorHelper(strings),
              _step;

          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              var s = _step.value;
              str += s ? "\n".concat(indentStep).concat(indent).concat(s) : '\n';
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }

          str += "\n".concat(indent).concat(end);
        } else {
          str = "".concat(start, " ").concat(strings.join(' '), " ").concat(end);
        }
      } else {
        var _strings = nodes.map(blockItem);

        str = _strings.shift();

        var _iterator2 = _createForOfIteratorHelper(_strings),
            _step2;

        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var _s = _step2.value;
            str += _s ? "\n".concat(indent).concat(_s) : '\n';
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }
      }

      if (this.comment) {
        str += '\n' + this.comment.replace(/^/gm, "".concat(indent, "#"));
        if (onComment) onComment();
      } else if (chompKeep && onChompKeep) onChompKeep();

      return str;
    }
  }]);

  return Collection;
}(Node);

_defineProperty(Collection, "maxFlowStringSingleLineLength", 60);

function asItemIndex(key) {
  var idx = key instanceof Scalar ? key.value : key;
  if (idx && typeof idx === 'string') idx = Number(idx);
  return Number.isInteger(idx) && idx >= 0 ? idx : null;
}

var YAMLSeq = /*#__PURE__*/function (_Collection) {
  _inherits(YAMLSeq, _Collection);

  var _super = _createSuper(YAMLSeq);

  function YAMLSeq() {
    _classCallCheck(this, YAMLSeq);

    return _super.apply(this, arguments);
  }

  _createClass(YAMLSeq, [{
    key: "add",
    value: function add(value) {
      this.items.push(value);
    }
  }, {
    key: "delete",
    value: function _delete(key) {
      var idx = asItemIndex(key);
      if (typeof idx !== 'number') return false;
      var del = this.items.splice(idx, 1);
      return del.length > 0;
    }
  }, {
    key: "get",
    value: function get(key, keepScalar) {
      var idx = asItemIndex(key);
      if (typeof idx !== 'number') return undefined;
      var it = this.items[idx];
      return !keepScalar && it instanceof Scalar ? it.value : it;
    }
  }, {
    key: "has",
    value: function has(key) {
      var idx = asItemIndex(key);
      return typeof idx === 'number' && idx < this.items.length;
    }
  }, {
    key: "set",
    value: function set(key, value) {
      var idx = asItemIndex(key);
      if (typeof idx !== 'number') throw new Error("Expected a valid index, not ".concat(key, "."));
      var prev = this.items[idx];
      if (prev instanceof Scalar && isScalarValue(value)) prev.value = value;else this.items[idx] = value;
    }
  }, {
    key: "toJSON",
    value: function toJSON(_, ctx) {
      var seq = [];
      if (ctx && ctx.onCreate) ctx.onCreate(seq);
      var i = 0;

      var _iterator = _createForOfIteratorHelper(this.items),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var item = _step.value;
          seq.push(toJS(item, String(i++), ctx));
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      return seq;
    }
  }, {
    key: "toString",
    value: function toString(ctx, onComment, onChompKeep) {
      if (!ctx) return JSON.stringify(this);
      return _get(_getPrototypeOf(YAMLSeq.prototype), "toString", this).call(this, ctx, {
        blockItem: function blockItem(n) {
          return n.type === 'comment' ? n.str : "- ".concat(n.str);
        },
        flowChars: {
          start: '[',
          end: ']'
        },
        isMap: false,
        itemIndent: (ctx.indent || '') + '  '
      }, onComment, onChompKeep);
    }
  }]);

  return YAMLSeq;
}(Collection);

var stringifyKey = function stringifyKey(key, jsKey, ctx) {
  if (jsKey === null) return '';
  if (_typeof(jsKey) !== 'object') return String(jsKey);
  if (key instanceof Node && ctx && ctx.doc) return key.toString({
    anchors: Object.create(null),
    doc: ctx.doc,
    indent: '',
    indentStep: ctx.indentStep,
    inFlow: true,
    inStringifyKey: true,
    stringify: ctx.stringify
  });
  return JSON.stringify(jsKey);
};

function createPair(key, value, ctx) {
  var k = createNode(key, null, ctx);
  var v = createNode(value, null, ctx);
  return new Pair(k, v);
}
var Pair = /*#__PURE__*/function (_Node) {
  _inherits(Pair, _Node);

  var _super = _createSuper(Pair);

  function Pair(key) {
    var _this;

    var value = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

    _classCallCheck(this, Pair);

    _this = _super.call(this);
    _this.key = key;
    _this.value = value;
    _this.type = Pair.Type.PAIR;
    return _this;
  }

  _createClass(Pair, [{
    key: "addToJSMap",
    value: function addToJSMap(ctx, map) {
      var key = toJS(this.key, '', ctx);

      if (map instanceof Map) {
        var value = toJS(this.value, key, ctx);
        map.set(key, value);
      } else if (map instanceof Set) {
        map.add(key);
      } else {
        var stringKey = stringifyKey(this.key, key, ctx);

        var _value = toJS(this.value, stringKey, ctx);

        if (stringKey in map) Object.defineProperty(map, stringKey, {
          value: _value,
          writable: true,
          enumerable: true,
          configurable: true
        });else map[stringKey] = _value;
      }

      return map;
    }
  }, {
    key: "toJSON",
    value: function toJSON(_, ctx) {
      var pair = ctx && ctx.mapAsMap ? new Map() : {};
      return this.addToJSMap(ctx, pair);
    }
  }, {
    key: "toString",
    value: function toString(ctx, onComment, onChompKeep) {
      if (!ctx || !ctx.doc) return JSON.stringify(this);
      var _ctx$doc$options = ctx.doc.options,
          indentSize = _ctx$doc$options.indent,
          indentSeq = _ctx$doc$options.indentSeq,
          simpleKeys = _ctx$doc$options.simpleKeys;
      var key = this.key,
          value = this.value;
      var keyComment = key instanceof Node && key.comment;

      if (simpleKeys) {
        if (keyComment) {
          throw new Error('With simple keys, key nodes cannot have comments');
        }

        if (key instanceof Collection) {
          var msg = 'With simple keys, collection cannot be used as a key value';
          throw new Error(msg);
        }
      }

      var explicitKey = !simpleKeys && (!key || keyComment || key instanceof Collection || key.type === Type.BLOCK_FOLDED || key.type === Type.BLOCK_LITERAL);
      var _ctx = ctx,
          allNullValues = _ctx.allNullValues,
          doc = _ctx.doc,
          indent = _ctx.indent,
          indentStep = _ctx.indentStep,
          stringify = _ctx.stringify;
      ctx = Object.assign({}, ctx, {
        implicitKey: !explicitKey && (simpleKeys || !allNullValues),
        indent: indent + indentStep
      });
      var chompKeep = false;
      var str = stringify(key, ctx, function () {
        return keyComment = null;
      }, function () {
        return chompKeep = true;
      });
      str = addComment(str, ctx.indent, keyComment);

      if (allNullValues && !simpleKeys) {
        if (this.comment) {
          str = addComment(str, ctx.indent, this.comment);
          if (onComment) onComment();
        } else if (chompKeep && !keyComment && onChompKeep) onChompKeep();

        return ctx.inFlow ? str : "? ".concat(str);
      }

      if (!explicitKey && str.length > 1024) {
        if (!simpleKeys) {
          explicitKey = true;
        } else {
          var _msg = 'With simple keys, single line scalar must not span more than 1024 characters';
          throw new Error(_msg);
        }
      }

      str = explicitKey ? "? ".concat(str, "\n").concat(indent, ":") : "".concat(str, ":");

      if (this.comment) {
        // expected (but not strictly required) to be a single-line comment
        str = addComment(str, ctx.indent, this.comment);
        if (onComment) onComment();
      }

      var vcb = '';
      var valueComment = null;

      if (value instanceof Node) {
        if (value.spaceBefore) vcb = '\n';

        if (value.commentBefore) {
          var cs = value.commentBefore.replace(/^/gm, "".concat(ctx.indent, "#"));
          vcb += "\n".concat(cs);
        }

        valueComment = value.comment;
      } else if (value && _typeof(value) === 'object') {
        value = doc.createNode(value);
      }

      ctx.implicitKey = false;
      if (!explicitKey && !this.comment && value instanceof Scalar) ctx.indentAtStart = str.length + 1;
      chompKeep = false;

      if (!indentSeq && indentSize >= 2 && !ctx.inFlow && !explicitKey && value instanceof YAMLSeq && value.type !== Type.FLOW_SEQ && !value.tag && !doc.anchors.getName(value)) {
        // If indentSeq === false, consider '- ' as part of indentation where possible
        ctx.indent = ctx.indent.substr(2);
      }

      var valueStr = stringify(value, ctx, function () {
        return valueComment = null;
      }, function () {
        return chompKeep = true;
      });
      var ws = ' ';

      if (vcb || this.comment) {
        ws = "".concat(vcb, "\n").concat(ctx.indent);
      } else if (!explicitKey && value instanceof Collection) {
        var flow = valueStr[0] === '[' || valueStr[0] === '{';
        if (!flow || valueStr.includes('\n')) ws = "\n".concat(ctx.indent);
      } else if (valueStr[0] === '\n') ws = '';

      if (chompKeep && !valueComment && onChompKeep) onChompKeep();
      return addComment(str + ws + valueStr, ctx.indent, valueComment);
    }
  }, {
    key: "commentBefore",
    get: function get() {
      return this.key instanceof Node ? this.key.commentBefore : undefined;
    },
    set: function set(cb) {
      if (this.key == null) this.key = new Scalar(null);
      if (this.key instanceof Node) this.key.commentBefore = cb;else {
        var msg = 'Pair.commentBefore is an alias for Pair.key.commentBefore. To set it, the key must be a Node.';
        throw new Error(msg);
      }
    }
  }]);

  return Pair;
}(Node);

_defineProperty(Pair, "Type", {
  PAIR: 'PAIR',
  MERGE_PAIR: 'MERGE_PAIR'
});

var getAliasCount = function getAliasCount(node, anchors) {
  if (node instanceof Alias) {
    var anchor = anchors.get(node.source);
    return anchor.count * anchor.aliasCount;
  } else if (node instanceof Collection) {
    var count = 0;

    var _iterator = _createForOfIteratorHelper(node.items),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var item = _step.value;
        var c = getAliasCount(item, anchors);
        if (c > count) count = c;
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    return count;
  } else if (node instanceof Pair) {
    var kc = getAliasCount(node.key, anchors);
    var vc = getAliasCount(node.value, anchors);
    return Math.max(kc, vc);
  }

  return 1;
};

var Alias = /*#__PURE__*/function (_Node) {
  _inherits(Alias, _Node);

  var _super = _createSuper(Alias);

  _createClass(Alias, null, [{
    key: "stringify",
    value: function stringify(_ref, _ref2) {
      var range = _ref.range,
          source = _ref.source;
      var anchors = _ref2.anchors,
          doc = _ref2.doc,
          implicitKey = _ref2.implicitKey,
          inStringifyKey = _ref2.inStringifyKey;
      var anchor = Object.keys(anchors).find(function (a) {
        return anchors[a] === source;
      });
      if (!anchor && inStringifyKey) anchor = doc.anchors.getName(source) || doc.anchors.newName();
      if (anchor) return "*".concat(anchor).concat(implicitKey ? ' ' : '');
      var msg = doc.anchors.getName(source) ? 'Alias node must be after source node' : 'Source node not found for alias node';
      throw new Error("".concat(msg, " [").concat(range, "]"));
    }
  }]);

  function Alias(source) {
    var _this;

    _classCallCheck(this, Alias);

    _this = _super.call(this);
    _this.source = source;
    _this.type = Type.ALIAS;
    return _this;
  }

  _createClass(Alias, [{
    key: "toJSON",
    value: function toJSON(arg, ctx) {
      if (!ctx) return toJS(this.source, arg, ctx);
      var anchors = ctx.anchors,
          maxAliasCount = ctx.maxAliasCount;
      var anchor = anchors.get(this.source);
      /* istanbul ignore if */

      if (!anchor || anchor.res === undefined) {
        var msg = 'This should not happen: Alias anchor was not resolved?';
        if (this.cstNode) throw new YAMLReferenceError(this.cstNode, msg);else throw new ReferenceError(msg);
      }

      if (maxAliasCount >= 0) {
        anchor.count += 1;
        if (anchor.aliasCount === 0) anchor.aliasCount = getAliasCount(this.source, anchors);

        if (anchor.count * anchor.aliasCount > maxAliasCount) {
          var _msg = 'Excessive alias count indicates a resource exhaustion attack';
          if (this.cstNode) throw new YAMLReferenceError(this.cstNode, _msg);else throw new ReferenceError(_msg);
        }
      }

      return anchor.res;
    } // Only called when stringifying an alias mapping key while constructing
    // Object output.

  }, {
    key: "toString",
    value: function toString(ctx) {
      return Alias.stringify(this, ctx);
    }
  }, {
    key: "tag",
    set: function set(t) {
      throw new Error('Alias nodes cannot have tags');
    }
  }]);

  return Alias;
}(Node);

_defineProperty(Alias, "default", true);

function findPair(items, key) {
  var k = key instanceof Scalar ? key.value : key;

  var _iterator = _createForOfIteratorHelper(items),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var it = _step.value;

      if (it instanceof Pair) {
        if (it.key === key || it.key === k) return it;
        if (it.key && it.key.value === k) return it;
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return undefined;
}
var YAMLMap = /*#__PURE__*/function (_Collection) {
  _inherits(YAMLMap, _Collection);

  var _super = _createSuper(YAMLMap);

  function YAMLMap() {
    _classCallCheck(this, YAMLMap);

    return _super.apply(this, arguments);
  }

  _createClass(YAMLMap, [{
    key: "add",
    value: function add(pair, overwrite) {
      if (!pair) pair = new Pair(pair);else if (!(pair instanceof Pair)) pair = new Pair(pair.key || pair, pair.value);
      var prev = findPair(this.items, pair.key);
      var sortEntries = this.schema && this.schema.sortMapEntries;

      if (prev) {
        if (!overwrite) throw new Error("Key ".concat(pair.key, " already set")); // For scalars, keep the old node & its comments and anchors

        if (prev.value instanceof Scalar && isScalarValue(pair.value)) prev.value.value = pair.value;else prev.value = pair.value;
      } else if (sortEntries) {
        var i = this.items.findIndex(function (item) {
          return sortEntries(pair, item) < 0;
        });
        if (i === -1) this.items.push(pair);else this.items.splice(i, 0, pair);
      } else {
        this.items.push(pair);
      }
    }
  }, {
    key: "delete",
    value: function _delete(key) {
      var it = findPair(this.items, key);
      if (!it) return false;
      var del = this.items.splice(this.items.indexOf(it), 1);
      return del.length > 0;
    }
  }, {
    key: "get",
    value: function get(key, keepScalar) {
      var it = findPair(this.items, key);
      var node = it && it.value;
      return !keepScalar && node instanceof Scalar ? node.value : node;
    }
  }, {
    key: "has",
    value: function has(key) {
      return !!findPair(this.items, key);
    }
  }, {
    key: "set",
    value: function set(key, value) {
      this.add(new Pair(key, value), true);
    }
    /**
     * @param ctx - Conversion context, originally set in Document#toJS()
     * @param {Class} Type - If set, forces the returned collection type
     * @returns Instance of Type, Map, or Object
     */

  }, {
    key: "toJSON",
    value: function toJSON(_, ctx, Type) {
      var map = Type ? new Type() : ctx && ctx.mapAsMap ? new Map() : {};
      if (ctx && ctx.onCreate) ctx.onCreate(map);

      var _iterator2 = _createForOfIteratorHelper(this.items),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var item = _step2.value;
          item.addToJSMap(ctx, map);
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }

      return map;
    }
  }, {
    key: "toString",
    value: function toString(ctx, onComment, onChompKeep) {
      if (!ctx) return JSON.stringify(this);

      var _iterator3 = _createForOfIteratorHelper(this.items),
          _step3;

      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          var item = _step3.value;
          if (!(item instanceof Pair)) throw new Error("Map items must all be pairs; found ".concat(JSON.stringify(item), " instead"));
        }
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }

      return _get(_getPrototypeOf(YAMLMap.prototype), "toString", this).call(this, ctx, {
        blockItem: function blockItem(n) {
          return n.str;
        },
        flowChars: {
          start: '{',
          end: '}'
        },
        isMap: true,
        itemIndent: ctx.indent || ''
      }, onComment, onChompKeep);
    }
  }]);

  return YAMLMap;
}(Collection);

var binaryOptions = {
  defaultType: Type.BLOCK_LITERAL,
  lineWidth: 76
};
var boolOptions = {
  trueStr: 'true',
  falseStr: 'false'
};
var intOptions = {
  asBigInt: false
};
var nullOptions = {
  nullStr: 'null'
};
var strOptions = {
  defaultType: Type.PLAIN,
  defaultKeyType: Type.PLAIN,
  defaultQuoteSingle: false,
  doubleQuoted: {
    jsonEncoding: false,
    minMultiLineLength: 40
  },
  fold: {
    lineWidth: 80,
    minContentWidth: 20
  }
};

function resolveScalar(str, tags) {
  var _iterator = _createForOfIteratorHelper(tags),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _step$value = _step.value,
          format = _step$value.format,
          test = _step$value.test,
          resolve = _step$value.resolve;

      if (test && test.test(str)) {
        var res = resolve(str);
        if (!(res instanceof Scalar)) res = new Scalar(res);
        if (format) res.format = format;
        return res;
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return new Scalar(str); // fallback to string
}

var FOLD_FLOW = 'flow';
var FOLD_BLOCK = 'block';
var FOLD_QUOTED = 'quoted'; // presumes i+1 is at the start of a line
// returns index of last newline in more-indented block

var consumeMoreIndentedLines = function consumeMoreIndentedLines(text, i) {
  var ch = text[i + 1];

  while (ch === ' ' || ch === '\t') {
    do {
      ch = text[i += 1];
    } while (ch && ch !== '\n');

    ch = text[i + 1];
  }

  return i;
};
/**
 * Tries to keep input at up to `lineWidth` characters, splitting only on spaces
 * not followed by newlines or spaces unless `mode` is `'quoted'`. Lines are
 * terminated with `\n` and started with `indent`.
 *
 * @param {string} text
 * @param {string} indent
 * @param {string} [mode='flow'] `'block'` prevents more-indented lines
 *   from being folded; `'quoted'` allows for `\` escapes, including escaped
 *   newlines
 * @param {Object} options
 * @param {number} [options.indentAtStart] Accounts for leading contents on
 *   the first line, defaulting to `indent.length`
 * @param {number} [options.lineWidth=80]
 * @param {number} [options.minContentWidth=20] Allow highly indented lines to
 *   stretch the line width or indent content from the start
 * @param {function} options.onFold Called once if the text is folded
 * @param {function} options.onFold Called once if any line of text exceeds
 *   lineWidth characters
 */


function foldFlowLines(text, indent, mode, _ref) {
  var indentAtStart = _ref.indentAtStart,
      _ref$lineWidth = _ref.lineWidth,
      lineWidth = _ref$lineWidth === void 0 ? 80 : _ref$lineWidth,
      _ref$minContentWidth = _ref.minContentWidth,
      minContentWidth = _ref$minContentWidth === void 0 ? 20 : _ref$minContentWidth,
      onFold = _ref.onFold,
      onOverflow = _ref.onOverflow;
  if (!lineWidth || lineWidth < 0) return text;
  var endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
  if (text.length <= endStep) return text;
  var folds = [];
  var escapedFolds = {};
  var end = lineWidth - indent.length;

  if (typeof indentAtStart === 'number') {
    if (indentAtStart > lineWidth - Math.max(2, minContentWidth)) folds.push(0);else end = lineWidth - indentAtStart;
  }

  var split = undefined;
  var prev = undefined;
  var overflow = false;
  var i = -1;

  if (mode === FOLD_BLOCK) {
    i = consumeMoreIndentedLines(text, i);
    if (i !== -1) end = i + endStep;
  }

  for (var ch; ch = text[i += 1];) {
    if (mode === FOLD_QUOTED && ch === '\\') {
      switch (text[i + 1]) {
        case 'x':
          i += 3;
          break;

        case 'u':
          i += 5;
          break;

        case 'U':
          i += 9;
          break;

        default:
          i += 1;
      }
    }

    if (ch === '\n') {
      if (mode === FOLD_BLOCK) i = consumeMoreIndentedLines(text, i);
      end = i + endStep;
      split = undefined;
    } else {
      if (ch === ' ' && prev && prev !== ' ' && prev !== '\n' && prev !== '\t') {
        // space surrounded by non-space can be replaced with newline + indent
        var next = text[i + 1];
        if (next && next !== ' ' && next !== '\n' && next !== '\t') split = i;
      }

      if (i >= end) {
        if (split) {
          folds.push(split);
          end = split + endStep;
          split = undefined;
        } else if (mode === FOLD_QUOTED) {
          // white-space collected at end may stretch past lineWidth
          while (prev === ' ' || prev === '\t') {
            prev = ch;
            ch = text[i += 1];
            overflow = true;
          } // i - 2 accounts for not-dropped last char + newline-escaping \


          folds.push(i - 2);
          escapedFolds[i - 2] = true;
          end = i - 2 + endStep;
          split = undefined;
        } else {
          overflow = true;
        }
      }
    }

    prev = ch;
  }

  if (overflow && onOverflow) onOverflow();
  if (folds.length === 0) return text;
  if (onFold) onFold();
  var res = text.slice(0, folds[0]);

  for (var _i = 0; _i < folds.length; ++_i) {
    var fold = folds[_i];

    var _end = folds[_i + 1] || text.length;

    if (fold === 0) res = "\n".concat(indent).concat(text.slice(0, _end));else {
      if (mode === FOLD_QUOTED && escapedFolds[fold]) res += "".concat(text[fold], "\\");
      res += "\n".concat(indent).concat(text.slice(fold + 1, _end));
    }
  }

  return res;
}

var getFoldOptions = function getFoldOptions(_ref) {
  var indentAtStart = _ref.indentAtStart;
  return indentAtStart ? Object.assign({
    indentAtStart: indentAtStart
  }, strOptions.fold) : strOptions.fold;
}; // Also checks for lines starting with %, as parsing the output as YAML 1.1 will
// presume that's starting a new document.


var containsDocumentMarker = function containsDocumentMarker(str) {
  return /^(%|---|\.\.\.)/m.test(str);
};

function lineLengthOverLimit(str, limit) {
  var strLen = str.length;
  if (strLen <= limit) return false;

  for (var i = 0, start = 0; i < strLen; ++i) {
    if (str[i] === '\n') {
      if (i - start > limit) return true;
      start = i + 1;
      if (strLen - start <= limit) return false;
    }
  }

  return true;
}

function doubleQuotedString(value, ctx) {
  var implicitKey = ctx.implicitKey;
  var _strOptions$doubleQuo = strOptions.doubleQuoted,
      jsonEncoding = _strOptions$doubleQuo.jsonEncoding,
      minMultiLineLength = _strOptions$doubleQuo.minMultiLineLength;
  var json = JSON.stringify(value);
  if (jsonEncoding) return json;
  var indent = ctx.indent || (containsDocumentMarker(value) ? '  ' : '');
  var str = '';
  var start = 0;

  for (var i = 0, ch = json[i]; ch; ch = json[++i]) {
    if (ch === ' ' && json[i + 1] === '\\' && json[i + 2] === 'n') {
      // space before newline needs to be escaped to not be folded
      str += json.slice(start, i) + '\\ ';
      i += 1;
      start = i;
      ch = '\\';
    }

    if (ch === '\\') switch (json[i + 1]) {
      case 'u':
        {
          str += json.slice(start, i);
          var code = json.substr(i + 2, 4);

          switch (code) {
            case '0000':
              str += '\\0';
              break;

            case '0007':
              str += '\\a';
              break;

            case '000b':
              str += '\\v';
              break;

            case '001b':
              str += '\\e';
              break;

            case '0085':
              str += '\\N';
              break;

            case '00a0':
              str += '\\_';
              break;

            case '2028':
              str += '\\L';
              break;

            case '2029':
              str += '\\P';
              break;

            default:
              if (code.substr(0, 2) === '00') str += '\\x' + code.substr(2);else str += json.substr(i, 6);
          }

          i += 5;
          start = i + 1;
        }
        break;

      case 'n':
        if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
          i += 1;
        } else {
          // folding will eat first newline
          str += json.slice(start, i) + '\n\n';

          while (json[i + 2] === '\\' && json[i + 3] === 'n' && json[i + 4] !== '"') {
            str += '\n';
            i += 2;
          }

          str += indent; // space after newline needs to be escaped to not be folded

          if (json[i + 2] === ' ') str += '\\';
          i += 1;
          start = i + 1;
        }

        break;

      default:
        i += 1;
    }
  }

  str = start ? str + json.slice(start) : json;
  return implicitKey ? str : foldFlowLines(str, indent, FOLD_QUOTED, getFoldOptions(ctx));
}

function singleQuotedString(value, ctx) {
  if (ctx.implicitKey) {
    if (/\n/.test(value)) return doubleQuotedString(value, ctx);
  } else {
    // single quoted string can't have leading or trailing whitespace around newline
    if (/[ \t]\n|\n[ \t]/.test(value)) return doubleQuotedString(value, ctx);
  }

  var indent = ctx.indent || (containsDocumentMarker(value) ? '  ' : '');
  var res = "'" + value.replace(/'/g, "''").replace(/\n+/g, "$&\n".concat(indent)) + "'";
  return ctx.implicitKey ? res : foldFlowLines(res, indent, FOLD_FLOW, getFoldOptions(ctx));
}

function blockString(_ref2, ctx, onComment, onChompKeep) {
  var comment = _ref2.comment,
      type = _ref2.type,
      value = _ref2.value;

  // 1. Block can't end in whitespace unless the last line is non-empty.
  // 2. Strings consisting of only whitespace are best rendered explicitly.
  if (/\n[\t ]+$/.test(value) || /^\s*$/.test(value)) {
    return doubleQuotedString(value, ctx);
  }

  var indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? '  ' : '');
  var indentSize = indent ? '2' : '1'; // root is at -1

  var literal = type === Type.BLOCK_FOLDED ? false : type === Type.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, strOptions.fold.lineWidth - indent.length);
  var header = literal ? '|' : '>';
  if (!value) return header + '\n';
  var wsStart = '';
  var wsEnd = '';
  value = value.replace(/[\n\t ]*$/, function (ws) {
    var n = ws.indexOf('\n');

    if (n === -1) {
      header += '-'; // strip
    } else if (value === ws || n !== ws.length - 1) {
      header += '+'; // keep

      if (onChompKeep) onChompKeep();
    }

    wsEnd = ws.replace(/\n$/, '');
    return '';
  }).replace(/^[\n ]*/, function (ws) {
    if (ws.indexOf(' ') !== -1) header += indentSize;
    var m = ws.match(/ +$/);

    if (m) {
      wsStart = ws.slice(0, -m[0].length);
      return m[0];
    } else {
      wsStart = ws;
      return '';
    }
  });
  if (wsEnd) wsEnd = wsEnd.replace(/\n+(?!\n|$)/g, "$&".concat(indent));
  if (wsStart) wsStart = wsStart.replace(/\n+/g, "$&".concat(indent));

  if (comment) {
    header += ' #' + comment.replace(/ ?[\r\n]+/g, ' ');
    if (onComment) onComment();
  }

  if (!value) return "".concat(header).concat(indentSize, "\n").concat(indent).concat(wsEnd);

  if (literal) {
    value = value.replace(/\n+/g, "$&".concat(indent));
    return "".concat(header, "\n").concat(indent).concat(wsStart).concat(value).concat(wsEnd);
  }

  value = value.replace(/\n+/g, '\n$&').replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, '$1$2') // more-indented lines aren't folded
  //         ^ ind.line  ^ empty     ^ capture next empty lines only at end of indent
  .replace(/\n+/g, "$&".concat(indent));
  var body = foldFlowLines("".concat(wsStart).concat(value).concat(wsEnd), indent, FOLD_BLOCK, strOptions.fold);
  return "".concat(header, "\n").concat(indent).concat(body);
}

function plainString(item, ctx, onComment, onChompKeep) {
  var comment = item.comment,
      type = item.type,
      value = item.value;
  var actualString = ctx.actualString,
      implicitKey = ctx.implicitKey,
      indent = ctx.indent,
      inFlow = ctx.inFlow;

  if (implicitKey && /[\n[\]{},]/.test(value) || inFlow && /[[\]{},]/.test(value)) {
    return doubleQuotedString(value, ctx);
  }

  if (!value || /^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
    var hasDouble = value.indexOf('"') !== -1;
    var hasSingle = value.indexOf("'") !== -1;
    var quotedString;

    if (hasDouble && !hasSingle) {
      quotedString = singleQuotedString;
    } else if (hasSingle && !hasDouble) {
      quotedString = doubleQuotedString;
    } else if (strOptions.defaultQuoteSingle) {
      quotedString = singleQuotedString;
    } else {
      quotedString = doubleQuotedString;
    } // not allowed:
    // - empty string, '-' or '?'
    // - start with an indicator character (except [?:-]) or /[?-] /
    // - '\n ', ': ' or ' \n' anywhere
    // - '#' not preceded by a non-space char
    // - end with ' ' or ':'


    return implicitKey || inFlow || value.indexOf('\n') === -1 ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
  }

  if (!implicitKey && !inFlow && type !== Type.PLAIN && value.indexOf('\n') !== -1) {
    // Where allowed & type not set explicitly, prefer block style for multiline strings
    return blockString(item, ctx, onComment, onChompKeep);
  }

  if (indent === '' && containsDocumentMarker(value)) {
    ctx.forceBlockIndent = true;
    return blockString(item, ctx, onComment, onChompKeep);
  }

  var str = value.replace(/\n+/g, "$&\n".concat(indent)); // Verify that output will be parsed as a string, as e.g. plain numbers and
  // booleans get parsed with those types in v1.2 (e.g. '42', 'true' & '0.9e-3'),
  // and others in v1.1.

  if (actualString) {
    var tags = ctx.doc.schema.tags;
    var resolved = resolveScalar(str, tags).value;
    if (typeof resolved !== 'string') return doubleQuotedString(value, ctx);
  }

  var body = implicitKey ? str : foldFlowLines(str, indent, FOLD_FLOW, getFoldOptions(ctx));

  if (comment && !inFlow && (body.indexOf('\n') !== -1 || comment.indexOf('\n') !== -1)) {
    if (onComment) onComment();
    return addCommentBefore(body, indent, comment);
  }

  return body;
}

function stringifyString(item, ctx, onComment, onChompKeep) {
  var defaultKeyType = strOptions.defaultKeyType,
      defaultType = strOptions.defaultType;
  var implicitKey = ctx.implicitKey,
      inFlow = ctx.inFlow;
  var _item = item,
      type = _item.type,
      value = _item.value;

  if (typeof value !== 'string') {
    value = String(value);
    item = Object.assign({}, item, {
      value: value
    });
  }

  if (type !== Type.QUOTE_DOUBLE) {
    // force double quotes on control characters & unpaired surrogates
    if (/(?:[\0-\x08\x0B-\x1F\x7F-\x9F]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])/.test(value)) type = Type.QUOTE_DOUBLE;
  }

  var _stringify = function _stringify(_type) {
    switch (_type) {
      case Type.BLOCK_FOLDED:
      case Type.BLOCK_LITERAL:
        return implicitKey || inFlow ? doubleQuotedString(value, ctx) // blocks are not valid inside flow containers
        : blockString(item, ctx, onComment, onChompKeep);

      case Type.QUOTE_DOUBLE:
        return doubleQuotedString(value, ctx);

      case Type.QUOTE_SINGLE:
        return singleQuotedString(value, ctx);

      case Type.PLAIN:
        return plainString(item, ctx, onComment, onChompKeep);

      default:
        return null;
    }
  };

  var res = _stringify(type);

  if (res === null) {
    var t = implicitKey ? defaultKeyType : defaultType;
    res = _stringify(t);
    if (res === null) throw new Error("Unsupported default string type ".concat(t));
  }

  return res;
}

function stringifyNumber(_ref) {
  var format = _ref.format,
      minFractionDigits = _ref.minFractionDigits,
      tag = _ref.tag,
      value = _ref.value;
  if (typeof value === 'bigint') return String(value);
  if (!isFinite(value)) return isNaN(value) ? '.nan' : value < 0 ? '-.inf' : '.inf';
  var n = JSON.stringify(value);

  if (!format && minFractionDigits && (!tag || tag === 'tag:yaml.org,2002:float') && /^\d/.test(n)) {
    var i = n.indexOf('.');

    if (i < 0) {
      i = n.length;
      n += '.';
    }

    var d = minFractionDigits - (n.length - i - 1);

    while (d-- > 0) {
      n += '0';
    }
  }

  return n;
}

export { Alias as A, Collection as C, Node as N, Pair as P, Scalar as S, YAMLSeq as Y, boolOptions as a, binaryOptions as b, stringifyString as c, YAMLMap as d, createNode as e, isEmptyPath as f, collectionFromPath as g, addComment as h, intOptions as i, createPair as j, stringifyNumber as k, findPair as l, nullOptions as n, resolveScalar as r, strOptions as s, toJS as t };
