'use strict';

var _rollupPluginBabelHelpers = require('./_rollupPluginBabelHelpers-eed30217.js');
var parseCst = require('./parse-3997f544.js');
var stringifyNumber = require('./stringifyNumber-dea1120c.js');
var Schema = require('./Schema-807430ba.js');

const defaultOptions = {
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
const scalarOptions = {
  get binary() {
    return stringifyNumber.binaryOptions;
  },

  set binary(opt) {
    Object.assign(stringifyNumber.binaryOptions, opt);
  },

  get bool() {
    return stringifyNumber.boolOptions;
  },

  set bool(opt) {
    Object.assign(stringifyNumber.boolOptions, opt);
  },

  get int() {
    return stringifyNumber.intOptions;
  },

  set int(opt) {
    Object.assign(stringifyNumber.intOptions, opt);
  },

  get null() {
    return stringifyNumber.nullOptions;
  },

  set null(opt) {
    Object.assign(stringifyNumber.nullOptions, opt);
  },

  get str() {
    return stringifyNumber.strOptions;
  },

  set str(opt) {
    Object.assign(stringifyNumber.strOptions, opt);
  }

};
const documentOptions = {
  '1.0': {
    schema: 'yaml-1.1',
    merge: true,
    tagPrefixes: [{
      handle: '!',
      prefix: _rollupPluginBabelHelpers.defaultTagPrefix
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
      prefix: _rollupPluginBabelHelpers.defaultTagPrefix
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
      prefix: _rollupPluginBabelHelpers.defaultTagPrefix
    }]
  }
};

function stringifyTag(doc, tag) {
  if ((doc.version || doc.options.version) === '1.0') {
    const priv = tag.match(/^tag:private\.yaml\.org,2002:([^:/]+)$/);
    if (priv) return '!' + priv[1];
    const vocab = tag.match(/^tag:([a-zA-Z0-9-]+)\.yaml\.org,2002:(.*)/);
    return vocab ? `!${vocab[1]}/${vocab[2]}` : `!${tag.replace(/^tag:/, '')}`;
  }

  let p = doc.tagPrefixes.find(p => tag.indexOf(p.prefix) === 0);

  if (!p) {
    const dtp = doc.getDefaults().tagPrefixes;
    p = dtp && dtp.find(p => tag.indexOf(p.prefix) === 0);
  }

  if (!p) return tag[0] === '!' ? tag : `!<${tag}>`;
  const suffix = tag.substr(p.prefix.length).replace(/[!,[\]{}]/g, ch => ({
    '!': '%21',
    ',': '%2C',
    '[': '%5B',
    ']': '%5D',
    '{': '%7B',
    '}': '%7D'
  })[ch]);
  return p.handle + suffix;
}

function getTagObject(tags, item) {
  if (item instanceof stringifyNumber.Alias) return stringifyNumber.Alias;

  if (item.tag) {
    const match = tags.filter(t => t.tag === item.tag);
    if (match.length > 0) return match.find(t => t.format === item.format) || match[0];
  }

  let tagObj, obj;

  if (item instanceof stringifyNumber.Scalar) {
    obj = item.value;
    const match = tags.filter(t => t.identify && t.identify(obj));
    tagObj = match.find(t => t.format === item.format) || match.find(t => !t.format);
  } else {
    obj = item;
    tagObj = tags.find(t => t.nodeClass && obj instanceof t.nodeClass);
  }

  if (!tagObj) {
    const name = obj && obj.constructor ? obj.constructor.name : typeof obj;
    throw new Error(`Tag not resolved for ${name} value`);
  }

  return tagObj;
} // needs to be called before value stringifier to allow for circular anchor refs


function stringifyProps(node, tagObj, {
  anchors,
  doc
}) {
  const props = [];
  const anchor = doc.anchors.getName(node);

  if (anchor) {
    anchors[anchor] = node;
    props.push(`&${anchor}`);
  }

  if (node.tag) {
    props.push(stringifyTag(doc, node.tag));
  } else if (!tagObj.default) {
    props.push(stringifyTag(doc, tagObj.tag));
  }

  return props.join(' ');
}

function stringify(item, ctx, onComment, onChompKeep) {
  const {
    schema
  } = ctx.doc;
  let tagObj;

  if (!(item instanceof stringifyNumber.Node)) {
    item = ctx.doc.createNode(item, {
      onTagObj: o => tagObj = o,
      wrapScalars: true
    });
  }

  if (item instanceof stringifyNumber.Pair) return item.toString(ctx, onComment, onChompKeep);
  if (!tagObj) tagObj = getTagObject(schema.tags, item);
  const props = stringifyProps(item, tagObj, ctx);
  if (props.length > 0) ctx.indentAtStart = (ctx.indentAtStart || 0) + props.length + 1;
  const str = typeof tagObj.stringify === 'function' ? tagObj.stringify(item, ctx, onComment, onChompKeep) : item instanceof stringifyNumber.Scalar ? stringifyNumber.stringifyString(item, ctx, onComment, onChompKeep) : item.toString(ctx, onComment, onChompKeep);
  if (!props) return str;
  return item instanceof stringifyNumber.Scalar || str[0] === '{' || str[0] === '[' ? `${props} ${str}` : `${props}\n${ctx.indent}${str}`;
}

class Anchors {
  static validAnchorNode(node) {
    return node instanceof stringifyNumber.Scalar || node instanceof stringifyNumber.YAMLSeq || node instanceof stringifyNumber.YAMLMap;
  }

  constructor(prefix) {
    _rollupPluginBabelHelpers._defineProperty(this, "map", Object.create(null));

    this.prefix = prefix;
  }

  createAlias(node, name) {
    this.setAnchor(node, name);
    return new stringifyNumber.Alias(node);
  }

  createMergePair(...sources) {
    const merge = new Schema.Merge();
    merge.value.items = sources.map(s => {
      if (s instanceof stringifyNumber.Alias) {
        if (s.source instanceof stringifyNumber.YAMLMap) return s;
      } else if (s instanceof stringifyNumber.YAMLMap) {
        return this.createAlias(s);
      }

      throw new Error('Merge sources must be Map nodes or their Aliases');
    });
    return merge;
  }

  getName(node) {
    const {
      map
    } = this;
    return Object.keys(map).find(a => map[a] === node);
  }

  getNames() {
    return Object.keys(this.map);
  }

  getNode(name) {
    return this.map[name];
  }

  newName(prefix) {
    if (!prefix) prefix = this.prefix;
    const names = Object.keys(this.map);

    for (let i = 1; true; ++i) {
      const name = `${prefix}${i}`;
      if (!names.includes(name)) return name;
    }
  } // During parsing, map & aliases contain CST nodes


  resolveNodes() {
    const {
      map,
      _cstAliases
    } = this;
    Object.keys(map).forEach(a => {
      map[a] = map[a].resolved;
    });

    _cstAliases.forEach(a => {
      a.source = a.source.resolved;
    });

    delete this._cstAliases;
  }

  setAnchor(node, name) {
    if (node != null && !Anchors.validAnchorNode(node)) {
      throw new Error('Anchors may only be set for Scalar, Seq and Map nodes');
    }

    if (name && /[\x00-\x19\s,[\]{}]/.test(name)) {
      throw new Error('Anchor names must not contain whitespace or control characters');
    }

    const {
      map
    } = this;
    const prev = node && Object.keys(map).find(a => map[a] === node);

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

}

/**
 * Applies the JSON.parse reviver algorithm as defined in the ECMA-262 spec,
 * in section 24.5.1.1 "Runtime Semantics: InternalizeJSONProperty" of the
 * 2021 edition: https://tc39.es/ecma262/#sec-json.parse
 *
 * Includes extensions for handling Map and Set objects.
 */
function applyReviver(reviver, obj, key, val) {
  if (val && typeof val === 'object') {
    if (Array.isArray(val)) {
      for (let i = 0, len = val.length; i < len; ++i) {
        const v0 = val[i];
        const v1 = applyReviver(reviver, val, String(i), v0);
        if (v1 === undefined) delete val[i];else if (v1 !== v0) val[i] = v1;
      }
    } else if (val instanceof Map) {
      for (const k of Array.from(val.keys())) {
        const v0 = val.get(k);
        const v1 = applyReviver(reviver, val, k, v0);
        if (v1 === undefined) val.delete(k);else if (v1 !== v0) val.set(k, v1);
      }
    } else if (val instanceof Set) {
      for (const v0 of Array.from(val)) {
        const v1 = applyReviver(reviver, val, v0, v0);
        if (v1 === undefined) val.delete(v0);else if (v1 !== v0) {
          val.delete(v0);
          val.add(v1);
        }
      }
    } else {
      for (const [k, v0] of Object.entries(val)) {
        const v1 = applyReviver(reviver, val, k, v0);
        if (v1 === undefined) delete val[k];else if (v1 !== v0) val[k] = v1;
      }
    }
  }

  return reviver.call(obj, key, val);
}

const visit = (node, tags) => {
  if (node && typeof node === 'object') {
    const {
      tag
    } = node;

    if (node instanceof stringifyNumber.Collection) {
      if (tag) tags[tag] = true;
      node.items.forEach(n => visit(n, tags));
    } else if (node instanceof stringifyNumber.Pair) {
      visit(node.key, tags);
      visit(node.value, tags);
    } else if (node instanceof stringifyNumber.Scalar) {
      if (tag) tags[tag] = true;
    }
  }

  return tags;
};

const listTagNames = node => Object.keys(visit(node, {}));

function resolveTagHandle(doc, node) {
  const {
    handle,
    suffix
  } = node.tag;
  let prefix = doc.tagPrefixes.find(p => p.handle === handle);

  if (!prefix) {
    const dtp = doc.getDefaults().tagPrefixes;
    if (dtp) prefix = dtp.find(p => p.handle === handle);
    if (!prefix) throw new _rollupPluginBabelHelpers.YAMLSemanticError(node, `The ${handle} tag handle is non-default and was not declared.`);
  }

  if (!suffix) throw new _rollupPluginBabelHelpers.YAMLSemanticError(node, `The ${handle} tag has no suffix.`);

  if (handle === '!' && (doc.version || doc.options.version) === '1.0') {
    if (suffix[0] === '^') {
      doc.warnings.push(new _rollupPluginBabelHelpers.YAMLWarning(node, 'YAML 1.0 ^ tag expansion is not supported'));
      return suffix;
    }

    if (/[:/]/.test(suffix)) {
      // word/foo -> tag:word.yaml.org,2002:foo
      const vocab = suffix.match(/^([a-z0-9-]+)\/(.*)/i);
      return vocab ? `tag:${vocab[1]}.yaml.org,2002:${vocab[2]}` : `tag:${suffix}`;
    }
  }

  return prefix.prefix + decodeURIComponent(suffix);
}

function resolveTagName(doc, node) {
  const {
    tag,
    type
  } = node;
  let nonSpecific = false;

  if (tag) {
    const {
      handle,
      suffix,
      verbatim
    } = tag;

    if (verbatim) {
      if (verbatim !== '!' && verbatim !== '!!') return verbatim;
      const msg = `Verbatim tags aren't resolved, so ${verbatim} is invalid.`;
      doc.errors.push(new _rollupPluginBabelHelpers.YAMLSemanticError(node, msg));
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
    case _rollupPluginBabelHelpers.Type.BLOCK_FOLDED:
    case _rollupPluginBabelHelpers.Type.BLOCK_LITERAL:
    case _rollupPluginBabelHelpers.Type.QUOTE_DOUBLE:
    case _rollupPluginBabelHelpers.Type.QUOTE_SINGLE:
      return _rollupPluginBabelHelpers.defaultTags.STR;

    case _rollupPluginBabelHelpers.Type.FLOW_MAP:
    case _rollupPluginBabelHelpers.Type.MAP:
      return _rollupPluginBabelHelpers.defaultTags.MAP;

    case _rollupPluginBabelHelpers.Type.FLOW_SEQ:
    case _rollupPluginBabelHelpers.Type.SEQ:
      return _rollupPluginBabelHelpers.defaultTags.SEQ;

    case _rollupPluginBabelHelpers.Type.PLAIN:
      return nonSpecific ? _rollupPluginBabelHelpers.defaultTags.STR : null;

    default:
      return null;
  }
}

function checkFlowCollectionEnd(errors, cst) {
  let char, name;

  switch (cst.type) {
    case _rollupPluginBabelHelpers.Type.FLOW_MAP:
      char = '}';
      name = 'flow map';
      break;

    case _rollupPluginBabelHelpers.Type.FLOW_SEQ:
      char = ']';
      name = 'flow sequence';
      break;

    default:
      errors.push(new _rollupPluginBabelHelpers.YAMLSemanticError(cst, 'Not a flow collection!?'));
      return;
  }

  let lastItem;

  for (let i = cst.items.length - 1; i >= 0; --i) {
    const item = cst.items[i];

    if (!item || item.type !== _rollupPluginBabelHelpers.Type.COMMENT) {
      lastItem = item;
      break;
    }
  }

  if (lastItem && lastItem.char !== char) {
    const msg = `Expected ${name} to end with ${char}`;
    let err;

    if (typeof lastItem.offset === 'number') {
      err = new _rollupPluginBabelHelpers.YAMLSemanticError(cst, msg);
      err.offset = lastItem.offset + 1;
    } else {
      err = new _rollupPluginBabelHelpers.YAMLSemanticError(lastItem, msg);
      if (lastItem.range && lastItem.range.end) err.offset = lastItem.range.end - lastItem.range.start;
    }

    errors.push(err);
  }
}
function checkFlowCommentSpace(errors, comment) {
  const prev = comment.context.src[comment.range.start - 1];

  if (prev !== '\n' && prev !== '\t' && prev !== ' ') {
    const msg = 'Comments must be separated from other tokens by white space characters';
    errors.push(new _rollupPluginBabelHelpers.YAMLSemanticError(comment, msg));
  }
}
function getLongKeyError(source, key) {
  const sk = String(key);
  const k = sk.substr(0, 8) + '...' + sk.substr(-8);
  return new _rollupPluginBabelHelpers.YAMLSemanticError(source, `The "${k}" key is too long`);
}
function resolveComments(collection, comments) {
  for (const {
    afterKey,
    before,
    comment
  } of comments) {
    let item = collection.items[before];

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
}

function resolveMap(doc, cst) {
  const {
    comments,
    items
  } = cst.type === _rollupPluginBabelHelpers.Type.FLOW_MAP ? resolveFlowMapItems(doc, cst) : resolveBlockMapItems(doc, cst);
  const map = new stringifyNumber.YAMLMap(doc.schema);
  map.items = items;
  resolveComments(map, comments);
  let hasCollectionKey = false;

  for (let i = 0; i < items.length; ++i) {
    const {
      key: iKey
    } = items[i];
    if (iKey instanceof stringifyNumber.Collection) hasCollectionKey = true;

    if (doc.schema.merge && iKey && iKey.value === Schema.MERGE_KEY) {
      items[i] = new Schema.Merge(items[i]);
      const sources = items[i].value.items;
      let error = null;
      sources.some(node => {
        if (node instanceof stringifyNumber.Alias) {
          // During parsing, alias sources are CST nodes; to account for
          // circular references their resolved values can't be used here.
          const {
            type
          } = node.source;
          if (type === _rollupPluginBabelHelpers.Type.MAP || type === _rollupPluginBabelHelpers.Type.FLOW_MAP) return false;
          return error = 'Merge nodes aliases can only point to maps';
        }

        return error = 'Merge nodes can only have Alias nodes as values';
      });
      if (error) doc.errors.push(new _rollupPluginBabelHelpers.YAMLSemanticError(cst, error));
    } else {
      for (let j = i + 1; j < items.length; ++j) {
        const {
          key: jKey
        } = items[j];

        if (iKey === jKey || iKey && jKey && Object.prototype.hasOwnProperty.call(iKey, 'value') && iKey.value === jKey.value) {
          const msg = `Map keys must be unique; "${iKey}" is repeated`;
          doc.errors.push(new _rollupPluginBabelHelpers.YAMLSemanticError(cst, msg));
          break;
        }
      }
    }
  }

  if (hasCollectionKey && !doc.options.mapAsMap) {
    const warn = 'Keys with collection values will be stringified as YAML due to JS Object restrictions. Use mapAsMap: true to avoid this.';
    doc.warnings.push(new _rollupPluginBabelHelpers.YAMLWarning(cst, warn));
  }

  cst.resolved = map;
  return map;
}

const valueHasPairComment = ({
  context: {
    lineStart,
    node,
    src
  },
  props
}) => {
  if (props.length === 0) return false;
  const {
    start
  } = props[0];
  if (node && start > node.valueRange.start) return false;
  if (src[start] !== _rollupPluginBabelHelpers.Char.COMMENT) return false;

  for (let i = lineStart; i < start; ++i) if (src[i] === '\n') return false;

  return true;
};

function resolvePairComment(item, pair) {
  if (!valueHasPairComment(item)) return;
  const comment = item.getPropValue(0, _rollupPluginBabelHelpers.Char.COMMENT, true);
  let found = false;
  const cb = pair.value.commentBefore;

  if (cb && cb.startsWith(comment)) {
    pair.value.commentBefore = cb.substr(comment.length + 1);
    found = true;
  } else {
    const cc = pair.value.comment;

    if (!item.node && cc && cc.startsWith(comment)) {
      pair.value.comment = cc.substr(comment.length + 1);
      found = true;
    }
  }

  if (found) pair.comment = comment;
}

function resolveBlockMapItems(doc, cst) {
  const comments = [];
  const items = [];
  let key = undefined;
  let keyStart = null;

  for (let i = 0; i < cst.items.length; ++i) {
    const item = cst.items[i];

    switch (item.type) {
      case _rollupPluginBabelHelpers.Type.BLANK_LINE:
        comments.push({
          afterKey: !!key,
          before: items.length
        });
        break;

      case _rollupPluginBabelHelpers.Type.COMMENT:
        comments.push({
          afterKey: !!key,
          before: items.length,
          comment: item.comment
        });
        break;

      case _rollupPluginBabelHelpers.Type.MAP_KEY:
        if (key !== undefined) items.push(new stringifyNumber.Pair(key));
        if (item.error) doc.errors.push(item.error);
        key = resolveNode(doc, item.node);
        keyStart = null;
        break;

      case _rollupPluginBabelHelpers.Type.MAP_VALUE:
        {
          if (key === undefined) key = null;
          if (item.error) doc.errors.push(item.error);

          if (!item.context.atLineStart && item.node && item.node.type === _rollupPluginBabelHelpers.Type.MAP && !item.node.context.atLineStart) {
            const msg = 'Nested mappings are not allowed in compact mappings';
            doc.errors.push(new _rollupPluginBabelHelpers.YAMLSemanticError(item.node, msg));
          }

          let valueNode = item.node;

          if (!valueNode && item.props.length > 0) {
            // Comments on an empty mapping value need to be preserved, so we
            // need to construct a minimal empty node here to use instead of the
            // missing `item.node`. -- eemeli/yaml#19
            valueNode = new parseCst.PlainValue(_rollupPluginBabelHelpers.Type.PLAIN, []);
            valueNode.context = {
              parent: item,
              src: item.context.src
            };
            const pos = item.range.start + 1;
            valueNode.range = {
              start: pos,
              end: pos
            };
            valueNode.valueRange = {
              start: pos,
              end: pos
            };

            if (typeof item.range.origStart === 'number') {
              const origPos = item.range.origStart + 1;
              valueNode.range.origStart = valueNode.range.origEnd = origPos;
              valueNode.valueRange.origStart = valueNode.valueRange.origEnd = origPos;
            }
          }

          const pair = new stringifyNumber.Pair(key, resolveNode(doc, valueNode));
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
        if (key !== undefined) items.push(new stringifyNumber.Pair(key));
        key = resolveNode(doc, item);
        keyStart = item.range.start;
        if (item.error) doc.errors.push(item.error);

        next: for (let j = i + 1;; ++j) {
          const nextItem = cst.items[j];

          switch (nextItem && nextItem.type) {
            case _rollupPluginBabelHelpers.Type.BLANK_LINE:
            case _rollupPluginBabelHelpers.Type.COMMENT:
              continue next;

            case _rollupPluginBabelHelpers.Type.MAP_VALUE:
              break next;

            default:
              {
                const msg = 'Implicit map keys need to be followed by map values';
                doc.errors.push(new _rollupPluginBabelHelpers.YAMLSemanticError(item, msg));
                break next;
              }
          }
        }

        if (item.valueRangeContainsNewline) {
          const msg = 'Implicit map keys need to be on a single line';
          doc.errors.push(new _rollupPluginBabelHelpers.YAMLSemanticError(item, msg));
        }

    }
  }

  if (key !== undefined) items.push(new stringifyNumber.Pair(key));
  return {
    comments,
    items
  };
}

function resolveFlowMapItems(doc, cst) {
  const comments = [];
  const items = [];
  let key = undefined;
  let explicitKey = false;
  let next = '{';

  for (let i = 0; i < cst.items.length; ++i) {
    const item = cst.items[i];

    if (typeof item.char === 'string') {
      const {
        char,
        offset
      } = item;

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
          items.push(new stringifyNumber.Pair(key));
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

      const msg = `Flow map contains an unexpected ${char}`;
      const err = new _rollupPluginBabelHelpers.YAMLSyntaxError(cst, msg);
      err.offset = offset;
      doc.errors.push(err);
    } else if (item.type === _rollupPluginBabelHelpers.Type.BLANK_LINE) {
      comments.push({
        afterKey: !!key,
        before: items.length
      });
    } else if (item.type === _rollupPluginBabelHelpers.Type.COMMENT) {
      checkFlowCommentSpace(doc.errors, item);
      comments.push({
        afterKey: !!key,
        before: items.length,
        comment: item.comment
      });
    } else if (key === undefined) {
      if (next === ',') doc.errors.push(new _rollupPluginBabelHelpers.YAMLSemanticError(item, 'Separator , missing in flow map'));
      key = resolveNode(doc, item);
    } else {
      if (next !== ',') doc.errors.push(new _rollupPluginBabelHelpers.YAMLSemanticError(item, 'Indicator : missing in flow map entry'));
      items.push(new stringifyNumber.Pair(key, resolveNode(doc, item)));
      key = undefined;
      explicitKey = false;
    }
  }

  checkFlowCollectionEnd(doc.errors, cst);
  if (key !== undefined) items.push(new stringifyNumber.Pair(key));
  return {
    comments,
    items
  };
}

function resolveSeq(doc, cst) {
  const {
    comments,
    items
  } = cst.type === _rollupPluginBabelHelpers.Type.FLOW_SEQ ? resolveFlowSeqItems(doc, cst) : resolveBlockSeqItems(doc, cst);
  const seq = new stringifyNumber.YAMLSeq(doc.schema);
  seq.items = items;
  resolveComments(seq, comments);

  if (!doc.options.mapAsMap && items.some(it => it instanceof stringifyNumber.Pair && it.key instanceof stringifyNumber.Collection)) {
    const warn = 'Keys with collection values will be stringified as YAML due to JS Object restrictions. Use mapAsMap: true to avoid this.';
    doc.warnings.push(new _rollupPluginBabelHelpers.YAMLWarning(cst, warn));
  }

  cst.resolved = seq;
  return seq;
}

function resolveBlockSeqItems(doc, cst) {
  const comments = [];
  const items = [];

  for (let i = 0; i < cst.items.length; ++i) {
    const item = cst.items[i];

    switch (item.type) {
      case _rollupPluginBabelHelpers.Type.BLANK_LINE:
        comments.push({
          before: items.length
        });
        break;

      case _rollupPluginBabelHelpers.Type.COMMENT:
        comments.push({
          comment: item.comment,
          before: items.length
        });
        break;

      case _rollupPluginBabelHelpers.Type.SEQ_ITEM:
        if (item.error) doc.errors.push(item.error);
        items.push(resolveNode(doc, item.node));

        if (item.hasProps) {
          const msg = 'Sequence items cannot have tags or anchors before the - indicator';
          doc.errors.push(new _rollupPluginBabelHelpers.YAMLSemanticError(item, msg));
        }

        break;

      default:
        if (item.error) doc.errors.push(item.error);
        doc.errors.push(new _rollupPluginBabelHelpers.YAMLSyntaxError(item, `Unexpected ${item.type} node in sequence`));
    }
  }

  return {
    comments,
    items
  };
}

function resolveFlowSeqItems(doc, cst) {
  const comments = [];
  const items = [];
  let explicitKey = false;
  let key = undefined;
  let keyStart = null;
  let next = '[';
  let prevItem = null;

  for (let i = 0; i < cst.items.length; ++i) {
    const item = cst.items[i];

    if (typeof item.char === 'string') {
      const {
        char,
        offset
      } = item;

      if (char !== ':' && (explicitKey || key !== undefined)) {
        if (explicitKey && key === undefined) key = next ? items.pop() : null;
        items.push(new stringifyNumber.Pair(key));
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

          if (key instanceof stringifyNumber.Pair) {
            const msg = 'Chaining flow sequence pairs is invalid';
            const err = new _rollupPluginBabelHelpers.YAMLSemanticError(cst, msg);
            err.offset = offset;
            doc.errors.push(err);
          }

          if (!explicitKey && typeof keyStart === 'number') {
            const keyEnd = item.range ? item.range.start : item.offset;
            if (keyEnd > keyStart + 1024) doc.errors.push(getLongKeyError(cst, key));
            const {
              src
            } = prevItem.context;

            for (let i = keyStart; i < keyEnd; ++i) if (src[i] === '\n') {
              const msg = 'Implicit keys of flow sequence pairs need to be on a single line';
              doc.errors.push(new _rollupPluginBabelHelpers.YAMLSemanticError(prevItem, msg));
              break;
            }
          }
        } else {
          key = null;
        }

        keyStart = null;
        explicitKey = false;
        next = null;
      } else if (next === '[' || char !== ']' || i < cst.items.length - 1) {
        const msg = `Flow sequence contains an unexpected ${char}`;
        const err = new _rollupPluginBabelHelpers.YAMLSyntaxError(cst, msg);
        err.offset = offset;
        doc.errors.push(err);
      }
    } else if (item.type === _rollupPluginBabelHelpers.Type.BLANK_LINE) {
      comments.push({
        before: items.length
      });
    } else if (item.type === _rollupPluginBabelHelpers.Type.COMMENT) {
      checkFlowCommentSpace(doc.errors, item);
      comments.push({
        comment: item.comment,
        before: items.length
      });
    } else {
      if (next) {
        const msg = `Expected a ${next} in flow sequence`;
        doc.errors.push(new _rollupPluginBabelHelpers.YAMLSemanticError(item, msg));
      }

      const value = resolveNode(doc, item);

      if (key === undefined) {
        items.push(value);
        prevItem = item;
      } else {
        items.push(new stringifyNumber.Pair(key, value));
        key = undefined;
      }

      keyStart = item.range.start;
      next = ',';
    }
  }

  checkFlowCollectionEnd(doc.errors, cst);
  if (key !== undefined) items.push(new stringifyNumber.Pair(key));
  return {
    comments,
    items
  };
}

function resolveByTagName({
  knownTags,
  tags
}, tagName, value, onError) {
  const matchWithTest = [];

  for (const tag of tags) {
    if (tag.tag === tagName) {
      if (tag.test) {
        if (typeof value === 'string') matchWithTest.push(tag);else onError(`The tag ${tagName} cannot be applied to a collection`);
      } else {
        const res = tag.resolve(value, onError);
        return res instanceof stringifyNumber.Collection ? res : new stringifyNumber.Scalar(res);
      }
    }
  }

  if (matchWithTest.length > 0) return stringifyNumber.resolveScalar(value, matchWithTest);
  const kt = knownTags[tagName];

  if (kt) {
    tags.push(Object.assign({}, kt, {
      default: false,
      test: undefined
    }));
    const res = kt.resolve(value, onError);
    return res instanceof stringifyNumber.Collection ? res : new stringifyNumber.Scalar(res);
  }

  return null;
}

function resolveTag(doc, node, tagName) {
  const {
    MAP,
    SEQ,
    STR
  } = _rollupPluginBabelHelpers.defaultTags;
  let value, fallback;

  const onError = message => doc.errors.push(new _rollupPluginBabelHelpers.YAMLSemanticError(node, message));

  try {
    switch (node.type) {
      case _rollupPluginBabelHelpers.Type.FLOW_MAP:
      case _rollupPluginBabelHelpers.Type.MAP:
        value = resolveMap(doc, node);
        fallback = MAP;
        if (tagName === SEQ || tagName === STR) onError(`The tag ${tagName} cannot be applied to a mapping`);
        break;

      case _rollupPluginBabelHelpers.Type.FLOW_SEQ:
      case _rollupPluginBabelHelpers.Type.SEQ:
        value = resolveSeq(doc, node);
        fallback = SEQ;
        if (tagName === MAP || tagName === STR) onError(`The tag ${tagName} cannot be applied to a sequence`);
        break;

      default:
        value = node.strValue || '';

        if (typeof value !== 'string') {
          value.errors.forEach(error => doc.errors.push(error));
          value = value.str;
        }

        if (tagName === MAP || tagName === SEQ) onError(`The tag ${tagName} cannot be applied to a scalar`);
        fallback = STR;
    }

    const res = resolveByTagName(doc.schema, tagName, value, onError);

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
    if (!fallback) throw new Error(`The tag ${tagName} is unavailable`);
    const msg = `The tag ${tagName} is unavailable, falling back to ${fallback}`;
    doc.warnings.push(new _rollupPluginBabelHelpers.YAMLWarning(node, msg));
    const res = resolveByTagName(doc.schema, fallback, value, onError);
    res.tag = tagName;
    return res;
  } catch (error) {
    const refError = new _rollupPluginBabelHelpers.YAMLReferenceError(node, error.message);
    refError.stack = error.stack;
    doc.errors.push(refError);
    return null;
  }
}

const isCollectionItem = node => {
  if (!node) return false;
  const {
    type
  } = node;
  return type === _rollupPluginBabelHelpers.Type.MAP_KEY || type === _rollupPluginBabelHelpers.Type.MAP_VALUE || type === _rollupPluginBabelHelpers.Type.SEQ_ITEM;
};

function resolveNodeProps(errors, node) {
  const comments = {
    before: [],
    after: []
  };
  let hasAnchor = false;
  let hasTag = false;
  const props = isCollectionItem(node.context.parent) ? node.context.parent.props.concat(node.props) : node.props;

  for (const {
    start,
    end
  } of props) {
    switch (node.context.src[start]) {
      case _rollupPluginBabelHelpers.Char.COMMENT:
        {
          if (!node.commentHasRequiredWhitespace(start)) {
            const msg = 'Comments must be separated from other tokens by white space characters';
            errors.push(new _rollupPluginBabelHelpers.YAMLSemanticError(node, msg));
          }

          const {
            header,
            valueRange
          } = node;
          const cc = valueRange && (start > valueRange.start || header && start > header.start) ? comments.after : comments.before;
          cc.push(node.context.src.slice(start + 1, end));
          break;
        }
      // Actual anchor & tag resolution is handled by schema, here we just complain

      case _rollupPluginBabelHelpers.Char.ANCHOR:
        if (hasAnchor) {
          const msg = 'A node can have at most one anchor';
          errors.push(new _rollupPluginBabelHelpers.YAMLSemanticError(node, msg));
        }

        hasAnchor = true;
        break;

      case _rollupPluginBabelHelpers.Char.TAG:
        if (hasTag) {
          const msg = 'A node can have at most one tag';
          errors.push(new _rollupPluginBabelHelpers.YAMLSemanticError(node, msg));
        }

        hasTag = true;
        break;
    }
  }

  return {
    comments,
    hasAnchor,
    hasTag
  };
}

function resolveNodeValue(doc, node) {
  const {
    anchors,
    errors,
    schema
  } = doc;

  if (node.type === _rollupPluginBabelHelpers.Type.ALIAS) {
    const name = node.rawValue;
    const src = anchors.getNode(name);

    if (!src) {
      const msg = `Aliased anchor not found: ${name}`;
      errors.push(new _rollupPluginBabelHelpers.YAMLReferenceError(node, msg));
      return null;
    } // Lazy resolution for circular references


    const res = new stringifyNumber.Alias(src);

    anchors._cstAliases.push(res);

    return res;
  }

  const tagName = resolveTagName(doc, node);
  if (tagName) return resolveTag(doc, node, tagName);

  if (node.type !== _rollupPluginBabelHelpers.Type.PLAIN) {
    const msg = `Failed to resolve ${node.type} node here`;
    errors.push(new _rollupPluginBabelHelpers.YAMLSyntaxError(node, msg));
    return null;
  }

  try {
    let str = node.strValue || '';

    if (typeof str !== 'string') {
      str.errors.forEach(error => doc.errors.push(error));
      str = str.str;
    }

    return stringifyNumber.resolveScalar(str, schema.tags);
  } catch (error) {
    if (!error.source) error.source = node;
    errors.push(error);
    return null;
  }
} // sets node.resolved on success


function resolveNode(doc, node) {
  if (!node) return null;
  if (node.error) doc.errors.push(node.error);
  const {
    comments,
    hasAnchor,
    hasTag
  } = resolveNodeProps(doc.errors, node);

  if (hasAnchor) {
    const {
      anchors
    } = doc;
    const name = node.anchor;
    const prev = anchors.getNode(name); // At this point, aliases for any preceding node with the same anchor
    // name have already been resolved, so it may safely be renamed.

    if (prev) anchors.map[anchors.newName(name)] = prev; // During parsing, we need to store the CST node in anchors.map as
    // anchors need to be available during resolution to allow for
    // circular references.

    anchors.map[name] = node;
  }

  if (node.type === _rollupPluginBabelHelpers.Type.ALIAS && (hasAnchor || hasTag)) {
    const msg = 'An alias node must not specify any properties';
    doc.errors.push(new _rollupPluginBabelHelpers.YAMLSemanticError(node, msg));
  }

  const res = resolveNodeValue(doc, node);

  if (res) {
    res.range = [node.range.start, node.range.end];
    if (doc.options.keepCstNodes) res.cstNode = node;
    if (doc.options.keepNodeTypes) res.type = node.type;
    const cb = comments.before.join('\n');

    if (cb) {
      res.commentBefore = res.commentBefore ? `${res.commentBefore}\n${cb}` : cb;
    }

    const ca = comments.after.join('\n');
    if (ca) res.comment = res.comment ? `${res.comment}\n${ca}` : ca;
  }

  return node.resolved = res;
}

function parseContents(doc, contents) {
  const comments = {
    before: [],
    after: []
  };
  let body = undefined;
  let spaceBefore = false;

  for (const node of contents) {
    if (node.valueRange) {
      if (body !== undefined) {
        const msg = 'Document contains trailing content not separated by a ... or --- line';
        doc.errors.push(new _rollupPluginBabelHelpers.YAMLSyntaxError(node, msg));
        break;
      }

      const res = resolveNode(doc, node);

      if (spaceBefore) {
        res.spaceBefore = true;
        spaceBefore = false;
      }

      body = res;
    } else if (node.comment !== null) {
      const cc = body === undefined ? comments.before : comments.after;
      cc.push(node.comment);
    } else if (node.type === _rollupPluginBabelHelpers.Type.BLANK_LINE) {
      spaceBefore = true;

      if (body === undefined && comments.before.length > 0 && !doc.commentBefore) {
        // space-separated comments at start are parsed as document comments
        doc.commentBefore = comments.before.join('\n');
        comments.before = [];
      }
    }
  }

  doc.contents = body || null;

  if (!body) {
    doc.comment = comments.before.concat(comments.after).join('\n') || null;
  } else {
    const cb = comments.before.join('\n');

    if (cb) {
      const cbNode = body instanceof stringifyNumber.Collection && body.items[0] ? body.items[0] : body;
      cbNode.commentBefore = cbNode.commentBefore ? `${cb}\n${cbNode.commentBefore}` : cb;
    }

    doc.comment = comments.after.join('\n') || null;
  }
}

function resolveTagDirective({
  tagPrefixes
}, directive) {
  const [handle, prefix] = directive.parameters;

  if (!handle || !prefix) {
    const msg = 'Insufficient parameters given for %TAG directive';
    throw new _rollupPluginBabelHelpers.YAMLSemanticError(directive, msg);
  }

  if (tagPrefixes.some(p => p.handle === handle)) {
    const msg = 'The %TAG directive must only be given at most once per handle in the same document.';
    throw new _rollupPluginBabelHelpers.YAMLSemanticError(directive, msg);
  }

  return {
    handle,
    prefix
  };
}

function resolveYamlDirective(doc, directive) {
  let [version] = directive.parameters;
  if (directive.name === 'YAML:1.0') version = '1.0';

  if (!version) {
    const msg = 'Insufficient parameters given for %YAML directive';
    throw new _rollupPluginBabelHelpers.YAMLSemanticError(directive, msg);
  }

  if (!documentOptions[version]) {
    const v0 = doc.version || doc.options.version;
    const msg = `Document will be parsed as YAML ${v0} rather than YAML ${version}`;
    doc.warnings.push(new _rollupPluginBabelHelpers.YAMLWarning(directive, msg));
  }

  return version;
}

function parseDirectives(doc, directives, prevDoc) {
  const directiveComments = [];
  let hasDirectives = false;

  for (const directive of directives) {
    const {
      comment,
      name
    } = directive;

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
          const msg = 'The %YAML directive must only be given at most once per document.';
          doc.errors.push(new _rollupPluginBabelHelpers.YAMLSemanticError(directive, msg));
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
          const msg = `YAML only supports %TAG and %YAML directives, and not %${name}`;
          doc.warnings.push(new _rollupPluginBabelHelpers.YAMLWarning(directive, msg));
        }

    }

    if (comment) directiveComments.push(comment);
  }

  if (prevDoc && !hasDirectives && '1.1' === (doc.version || prevDoc.version || doc.options.version)) {
    const copyTagPrefix = ({
      handle,
      prefix
    }) => ({
      handle,
      prefix
    });

    doc.tagPrefixes = prevDoc.tagPrefixes.map(copyTagPrefix);
    doc.version = prevDoc.version;
  }

  doc.commentBefore = directiveComments.join('\n') || null;
}

function assertCollection(contents) {
  if (contents instanceof stringifyNumber.Collection) return true;
  throw new Error('Expected a YAML collection as document contents');
}

class Document {
  constructor(value, replacer, options) {
    if (options === undefined && replacer && typeof replacer === 'object' && !Array.isArray(replacer)) {
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
    } else if (value instanceof parseCst.Document) {
      this.parse(value);
    } else {
      this.contents = this.createNode(value, {
        replacer
      });
    }
  }

  add(value) {
    assertCollection(this.contents);
    return this.contents.add(value);
  }

  addIn(path, value) {
    assertCollection(this.contents);
    this.contents.addIn(path, value);
  }

  createNode(value, {
    keepUndefined,
    onTagObj,
    replacer,
    tag,
    wrapScalars
  } = {}) {
    this.setSchema();
    if (typeof replacer === 'function') value = replacer.call({
      '': value
    }, '', value);else if (Array.isArray(replacer)) {
      const keyToStr = v => typeof v === 'number' || v instanceof String || v instanceof Number;

      const asStr = replacer.filter(keyToStr).map(String);
      if (asStr.length > 0) replacer = replacer.concat(asStr);
    }
    if (typeof keepUndefined !== 'boolean') keepUndefined = !!this.options.keepUndefined;
    const aliasNodes = [];
    const ctx = {
      keepUndefined,

      onAlias(source) {
        const alias = new stringifyNumber.Alias(source);
        aliasNodes.push(alias);
        return alias;
      },

      onTagObj,
      prevObjects: new Map(),
      replacer,
      schema: this.schema,
      wrapScalars: wrapScalars !== false
    };
    const node = stringifyNumber.createNode(value, tag, ctx);

    for (const alias of aliasNodes) {
      // With circular references, the source node is only resolved after all of
      // its child nodes are. This is why anchors are set only after all of the
      // nodes have been created.
      alias.source = alias.source.node;
      let name = this.anchors.getName(alias.source);

      if (!name) {
        name = this.anchors.newName();
        this.anchors.map[name] = alias.source;
      }
    }

    return node;
  }

  createPair(key, value, options = {}) {
    const k = this.createNode(key, options);
    const v = this.createNode(value, options);
    return new stringifyNumber.Pair(k, v);
  }

  delete(key) {
    assertCollection(this.contents);
    return this.contents.delete(key);
  }

  deleteIn(path) {
    if (stringifyNumber.isEmptyPath(path)) {
      if (this.contents == null) return false;
      this.contents = null;
      return true;
    }

    assertCollection(this.contents);
    return this.contents.deleteIn(path);
  }

  getDefaults() {
    return Document.defaults[this.version] || Document.defaults[this.options.version] || {};
  }

  get(key, keepScalar) {
    return this.contents instanceof stringifyNumber.Collection ? this.contents.get(key, keepScalar) : undefined;
  }

  getIn(path, keepScalar) {
    if (stringifyNumber.isEmptyPath(path)) return !keepScalar && this.contents instanceof stringifyNumber.Scalar ? this.contents.value : this.contents;
    return this.contents instanceof stringifyNumber.Collection ? this.contents.getIn(path, keepScalar) : undefined;
  }

  has(key) {
    return this.contents instanceof stringifyNumber.Collection ? this.contents.has(key) : false;
  }

  hasIn(path) {
    if (stringifyNumber.isEmptyPath(path)) return this.contents !== undefined;
    return this.contents instanceof stringifyNumber.Collection ? this.contents.hasIn(path) : false;
  }

  set(key, value) {
    if (this.contents == null) {
      this.setSchema();
      this.contents = stringifyNumber.collectionFromPath(this.schema, [key], value);
    } else {
      assertCollection(this.contents);
      this.contents.set(key, value);
    }
  }

  setIn(path, value) {
    if (stringifyNumber.isEmptyPath(path)) this.contents = value;else if (this.contents == null) {
      this.setSchema();
      this.contents = stringifyNumber.collectionFromPath(this.schema, path, value);
    } else {
      assertCollection(this.contents);
      this.contents.setIn(path, value);
    }
  }

  setSchema(id, customTags) {
    if (!id && !customTags && this.schema) return;
    if (typeof id === 'number') id = id.toFixed(1);

    if (id === '1.0' || id === '1.1' || id === '1.2') {
      if (this.version) this.version = id;else this.options.version = id;
      delete this.options.schema;
    } else if (id && typeof id === 'string') {
      this.options.schema = id;
    }

    if (Array.isArray(customTags)) this.options.customTags = customTags;
    const opt = Object.assign({}, this.getDefaults(), this.options);
    this.schema = new Schema.Schema(opt);
  }

  parse(node, prevDoc) {
    if (this.options.keepCstNodes) this.cstNode = node;
    if (this.options.keepNodeTypes) this.type = 'DOCUMENT';
    const {
      directives = [],
      contents = [],
      directivesEndMarker,
      error,
      valueRange
    } = node;

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
      for (const error of this.errors) if (error instanceof _rollupPluginBabelHelpers.YAMLError) error.makePretty();

      for (const warn of this.warnings) if (warn instanceof _rollupPluginBabelHelpers.YAMLError) warn.makePretty();
    }

    return this;
  }

  listNonDefaultTags() {
    return listTagNames(this.contents).filter(t => t.indexOf(_rollupPluginBabelHelpers.defaultTagPrefix) !== 0);
  }

  setTagPrefix(handle, prefix) {
    if (handle[0] !== '!' || handle[handle.length - 1] !== '!') throw new Error('Handle must start and end with !');

    if (prefix) {
      const prev = this.tagPrefixes.find(p => p.handle === handle);
      if (prev) prev.prefix = prefix;else this.tagPrefixes.push({
        handle,
        prefix
      });
    } else {
      this.tagPrefixes = this.tagPrefixes.filter(p => p.handle !== handle);
    }
  }

  toJS({
    json,
    jsonArg,
    mapAsMap,
    onAnchor,
    reviver
  } = {}) {
    const anchorNodes = Object.values(this.anchors.map).map(node => [node, {
      alias: [],
      aliasCount: 0,
      count: 1
    }]);
    const anchors = anchorNodes.length > 0 ? new Map(anchorNodes) : null;
    const ctx = {
      anchors,
      doc: this,
      indentStep: '  ',
      keep: !json,
      mapAsMap: typeof mapAsMap === 'boolean' ? mapAsMap : !!this.options.mapAsMap,
      maxAliasCount: this.options.maxAliasCount,
      stringify // Requiring directly in Pair would create circular dependencies

    };
    const res = stringifyNumber.toJS(this.contents, jsonArg || '', ctx);
    if (typeof onAnchor === 'function' && anchors) for (const {
      count,
      res
    } of anchors.values()) onAnchor(res, count);
    return typeof reviver === 'function' ? applyReviver(reviver, {
      '': res
    }, '', res) : res;
  }

  toJSON(jsonArg, onAnchor) {
    return this.toJS({
      json: true,
      jsonArg,
      mapAsMap: false,
      onAnchor
    });
  }

  toString() {
    if (this.errors.length > 0) throw new Error('Document with errors cannot be stringified');
    const indentSize = this.options.indent;

    if (!Number.isInteger(indentSize) || indentSize <= 0) {
      const s = JSON.stringify(indentSize);
      throw new Error(`"indent" option must be a positive integer, not ${s}`);
    }

    this.setSchema();
    const lines = [];
    let hasDirectives = false;

    if (this.version) {
      let vd = '%YAML 1.2';

      if (this.schema.name === 'yaml-1.1') {
        if (this.version === '1.0') vd = '%YAML:1.0';else if (this.version === '1.1') vd = '%YAML 1.1';
      }

      lines.push(vd);
      hasDirectives = true;
    }

    const tagNames = this.listNonDefaultTags();
    this.tagPrefixes.forEach(({
      handle,
      prefix
    }) => {
      if (tagNames.some(t => t.indexOf(prefix) === 0)) {
        lines.push(`%TAG ${handle} ${prefix}`);
        hasDirectives = true;
      }
    });
    if (hasDirectives || this.directivesEndMarker) lines.push('---');

    if (this.commentBefore) {
      if (hasDirectives || !this.directivesEndMarker) lines.unshift('');
      lines.unshift(this.commentBefore.replace(/^/gm, '#'));
    }

    const ctx = {
      anchors: Object.create(null),
      doc: this,
      indent: '',
      indentStep: ' '.repeat(indentSize),
      stringify // Requiring directly in nodes would create circular dependencies

    };
    let chompKeep = false;
    let contentComment = null;

    if (this.contents) {
      if (this.contents instanceof stringifyNumber.Node) {
        if (this.contents.spaceBefore && (hasDirectives || this.directivesEndMarker)) lines.push('');
        if (this.contents.commentBefore) lines.push(this.contents.commentBefore.replace(/^/gm, '#')); // top-level block scalars need to be indented if followed by a comment

        ctx.forceBlockIndent = !!this.comment;
        contentComment = this.contents.comment;
      }

      const onChompKeep = contentComment ? null : () => chompKeep = true;
      const body = stringify(this.contents, ctx, () => contentComment = null, onChompKeep);
      lines.push(stringifyNumber.addComment(body, '', contentComment));
    } else {
      lines.push(stringify(this.contents, ctx));
    }

    if (this.comment) {
      if ((!chompKeep || contentComment) && lines[lines.length - 1] !== '') lines.push('');
      lines.push(this.comment.replace(/^/gm, '#'));
    }

    return lines.join('\n') + '\n';
  }

}

_rollupPluginBabelHelpers._defineProperty(Document, "defaults", documentOptions);

exports.Document = Document;
exports.defaultOptions = defaultOptions;
exports.scalarOptions = scalarOptions;
