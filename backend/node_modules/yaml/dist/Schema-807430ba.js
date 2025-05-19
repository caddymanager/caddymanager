'use strict';

var _rollupPluginBabelHelpers = require('./_rollupPluginBabelHelpers-eed30217.js');
var stringifyNumber = require('./stringifyNumber-dea1120c.js');

const MERGE_KEY = '<<';
class Merge extends stringifyNumber.Pair {
  constructor(pair) {
    if (pair instanceof stringifyNumber.Pair) {
      let seq = pair.value;

      if (!(seq instanceof stringifyNumber.YAMLSeq)) {
        seq = new stringifyNumber.YAMLSeq();
        seq.items.push(pair.value);
        seq.range = pair.value.range;
      }

      super(pair.key, seq);
      this.range = pair.range;
    } else {
      super(new stringifyNumber.Scalar(MERGE_KEY), new stringifyNumber.YAMLSeq());
    }

    this.type = stringifyNumber.Pair.Type.MERGE_PAIR;
  } // If the value associated with a merge key is a single mapping node, each of
  // its key/value pairs is inserted into the current mapping, unless the key
  // already exists in it. If the value associated with the merge key is a
  // sequence, then this sequence is expected to contain mapping nodes and each
  // of these nodes is merged in turn according to its order in the sequence.
  // Keys in mapping nodes earlier in the sequence override keys specified in
  // later mapping nodes. -- http://yaml.org/type/merge.html


  addToJSMap(ctx, map) {
    for (const {
      source
    } of this.value.items) {
      if (!(source instanceof stringifyNumber.YAMLMap)) throw new Error('Merge sources must be maps');
      const srcMap = source.toJSON(null, ctx, Map);

      for (const [key, value] of srcMap) {
        if (map instanceof Map) {
          if (!map.has(key)) map.set(key, value);
        } else if (map instanceof Set) {
          map.add(key);
        } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
          Object.defineProperty(map, key, {
            value,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
    }

    return map;
  }

  toString(ctx, onComment) {
    const seq = this.value;
    if (seq.items.length > 1) return super.toString(ctx, onComment);
    this.value = seq.items[0];
    const str = super.toString(ctx, onComment);
    this.value = seq;
    return str;
  }

}

function createMap(schema, obj, ctx) {
  const {
    keepUndefined,
    replacer
  } = ctx;
  const map = new stringifyNumber.YAMLMap(schema);

  const add = (key, value) => {
    if (typeof replacer === 'function') value = replacer.call(obj, key, value);else if (Array.isArray(replacer) && !replacer.includes(key)) return;
    if (value !== undefined || keepUndefined) map.items.push(stringifyNumber.createPair(key, value, ctx));
  };

  if (obj instanceof Map) {
    for (const [key, value] of obj) add(key, value);
  } else if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) add(key, obj[key]);
  }

  if (typeof schema.sortMapEntries === 'function') {
    map.items.sort(schema.sortMapEntries);
  }

  return map;
}

const map = {
  createNode: createMap,
  default: true,
  nodeClass: stringifyNumber.YAMLMap,
  tag: 'tag:yaml.org,2002:map',
  resolve: map => map
};

function createSeq(schema, obj, ctx) {
  const {
    replacer
  } = ctx;
  const seq = new stringifyNumber.YAMLSeq(schema);

  if (obj && obj[Symbol.iterator]) {
    let i = 0;

    for (let it of obj) {
      if (typeof replacer === 'function') {
        const key = obj instanceof Set ? it : String(i++);
        it = replacer.call(obj, key, it);
      }

      seq.items.push(stringifyNumber.createNode(it, null, ctx));
    }
  }

  return seq;
}

const seq = {
  createNode: createSeq,
  default: true,
  nodeClass: stringifyNumber.YAMLSeq,
  tag: 'tag:yaml.org,2002:seq',
  resolve: seq => seq
};

const string = {
  identify: value => typeof value === 'string',
  default: true,
  tag: 'tag:yaml.org,2002:str',
  resolve: str => str,

  stringify(item, ctx, onComment, onChompKeep) {
    ctx = Object.assign({
      actualString: true
    }, ctx);
    return stringifyNumber.stringifyString(item, ctx, onComment, onChompKeep);
  },

  options: stringifyNumber.strOptions
};

const failsafe = [map, seq, string];

/* global BigInt */

const intIdentify = value => typeof value === 'bigint' || Number.isInteger(value);

const intResolve = (src, offset, radix) => stringifyNumber.intOptions.asBigInt ? BigInt(src) : parseInt(src.substring(offset), radix);

function intStringify(node, radix, prefix) {
  const {
    value
  } = node;
  if (intIdentify(value) && value >= 0) return prefix + value.toString(radix);
  return stringifyNumber.stringifyNumber(node);
}

const nullObj = {
  identify: value => value == null,
  createNode: (schema, value, ctx) => ctx.wrapScalars ? new stringifyNumber.Scalar(null) : null,
  default: true,
  tag: 'tag:yaml.org,2002:null',
  test: /^(?:~|[Nn]ull|NULL)?$/,
  resolve: str => {
    const node = new stringifyNumber.Scalar(null);
    node.sourceStr = str;
    return node;
  },
  options: stringifyNumber.nullOptions,
  stringify: ({
    sourceStr
  }) => sourceStr !== null && sourceStr !== void 0 ? sourceStr : stringifyNumber.nullOptions.nullStr
};
const boolObj = {
  identify: value => typeof value === 'boolean',
  default: true,
  tag: 'tag:yaml.org,2002:bool',
  test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
  resolve: str => str[0] === 't' || str[0] === 'T',
  options: stringifyNumber.boolOptions,
  stringify: ({
    value
  }) => value ? stringifyNumber.boolOptions.trueStr : stringifyNumber.boolOptions.falseStr
};
const octObj = {
  identify: value => intIdentify(value) && value >= 0,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  format: 'OCT',
  test: /^0o[0-7]+$/,
  resolve: str => intResolve(str, 2, 8),
  options: stringifyNumber.intOptions,
  stringify: node => intStringify(node, 8, '0o')
};
const intObj = {
  identify: intIdentify,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  test: /^[-+]?[0-9]+$/,
  resolve: str => intResolve(str, 0, 10),
  options: stringifyNumber.intOptions,
  stringify: stringifyNumber.stringifyNumber
};
const hexObj = {
  identify: value => intIdentify(value) && value >= 0,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  format: 'HEX',
  test: /^0x[0-9a-fA-F]+$/,
  resolve: str => intResolve(str, 2, 16),
  options: stringifyNumber.intOptions,
  stringify: node => intStringify(node, 16, '0x')
};
const nanObj = {
  identify: value => typeof value === 'number',
  default: true,
  tag: 'tag:yaml.org,2002:float',
  test: /^(?:[-+]?\.(?:inf|Inf|INF|nan|NaN|NAN))$/,
  resolve: str => str.slice(-3).toLowerCase() === 'nan' ? NaN : str[0] === '-' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
  stringify: stringifyNumber.stringifyNumber
};
const expObj = {
  identify: value => typeof value === 'number',
  default: true,
  tag: 'tag:yaml.org,2002:float',
  format: 'EXP',
  test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
  resolve: str => parseFloat(str),
  stringify: ({
    value
  }) => Number(value).toExponential()
};
const floatObj = {
  identify: value => typeof value === 'number',
  default: true,
  tag: 'tag:yaml.org,2002:float',
  test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,

  resolve(str) {
    const node = new stringifyNumber.Scalar(parseFloat(str));
    const dot = str.indexOf('.');
    if (dot !== -1 && str[str.length - 1] === '0') node.minFractionDigits = str.length - dot - 1;
    return node;
  },

  stringify: stringifyNumber.stringifyNumber
};
const core = failsafe.concat([nullObj, boolObj, octObj, intObj, hexObj, nanObj, expObj, floatObj]);

/* global BigInt */

const intIdentify$1 = value => typeof value === 'bigint' || Number.isInteger(value);

const stringifyJSON = ({
  value
}) => JSON.stringify(value);

const json = [map, seq, {
  identify: value => typeof value === 'string',
  default: true,
  tag: 'tag:yaml.org,2002:str',
  resolve: str => str,
  stringify: stringifyJSON
}, {
  identify: value => value == null,
  createNode: (schema, value, ctx) => ctx.wrapScalars ? new stringifyNumber.Scalar(null) : null,
  default: true,
  tag: 'tag:yaml.org,2002:null',
  test: /^null$/,
  resolve: () => null,
  stringify: stringifyJSON
}, {
  identify: value => typeof value === 'boolean',
  default: true,
  tag: 'tag:yaml.org,2002:bool',
  test: /^true|false$/,
  resolve: str => str === 'true',
  stringify: stringifyJSON
}, {
  identify: intIdentify$1,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  test: /^-?(?:0|[1-9][0-9]*)$/,
  resolve: str => stringifyNumber.intOptions.asBigInt ? BigInt(str) : parseInt(str, 10),
  stringify: ({
    value
  }) => intIdentify$1(value) ? value.toString() : JSON.stringify(value)
}, {
  identify: value => typeof value === 'number',
  default: true,
  tag: 'tag:yaml.org,2002:float',
  test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
  resolve: str => parseFloat(str),
  stringify: stringifyJSON
}, {
  default: true,
  test: /^/,

  resolve(str, onError) {
    onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
    return str;
  }

}];

/* global atob, btoa, Buffer */
const binary = {
  identify: value => value instanceof Uint8Array,
  // Buffer inherits from Uint8Array
  default: false,
  tag: 'tag:yaml.org,2002:binary',

  /**
   * Returns a Buffer in node and an Uint8Array in browsers
   *
   * To use the resulting buffer as an image, you'll want to do something like:
   *
   *   const blob = new Blob([buffer], { type: 'image/jpeg' })
   *   document.querySelector('#photo').src = URL.createObjectURL(blob)
   */
  resolve(src, onError) {
    if (typeof Buffer === 'function') {
      return Buffer.from(src, 'base64');
    } else if (typeof atob === 'function') {
      // On IE 11, atob() can't handle newlines
      const str = atob(src.replace(/[\n\r]/g, ''));
      const buffer = new Uint8Array(str.length);

      for (let i = 0; i < str.length; ++i) buffer[i] = str.charCodeAt(i);

      return buffer;
    } else {
      onError('This environment does not support reading binary tags; either Buffer or atob is required');
      return src;
    }
  },

  options: stringifyNumber.binaryOptions,
  stringify: ({
    comment,
    type,
    value
  }, ctx, onComment, onChompKeep) => {
    let src;

    if (typeof Buffer === 'function') {
      src = value instanceof Buffer ? value.toString('base64') : Buffer.from(value.buffer).toString('base64');
    } else if (typeof btoa === 'function') {
      let s = '';

      for (let i = 0; i < value.length; ++i) s += String.fromCharCode(value[i]);

      src = btoa(s);
    } else {
      throw new Error('This environment does not support writing binary tags; either Buffer or btoa is required');
    }

    if (!type) type = stringifyNumber.binaryOptions.defaultType;

    if (type === _rollupPluginBabelHelpers.Type.QUOTE_DOUBLE) {
      value = src;
    } else {
      const {
        lineWidth
      } = stringifyNumber.binaryOptions;
      const n = Math.ceil(src.length / lineWidth);
      const lines = new Array(n);

      for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
        lines[i] = src.substr(o, lineWidth);
      }

      value = lines.join(type === _rollupPluginBabelHelpers.Type.BLOCK_LITERAL ? '\n' : ' ');
    }

    return stringifyNumber.stringifyString({
      comment,
      type,
      value
    }, ctx, onComment, onChompKeep);
  }
};

function parsePairs(seq, onError) {
  if (seq instanceof stringifyNumber.YAMLSeq) {
    for (let i = 0; i < seq.items.length; ++i) {
      let item = seq.items[i];
      if (item instanceof stringifyNumber.Pair) continue;else if (item instanceof stringifyNumber.YAMLMap) {
        if (item.items.length > 1) onError('Each pair must have its own sequence indicator');
        const pair = item.items[0] || new stringifyNumber.Pair();
        if (item.commentBefore) pair.commentBefore = pair.commentBefore ? `${item.commentBefore}\n${pair.commentBefore}` : item.commentBefore;
        if (item.comment) pair.comment = pair.comment ? `${item.comment}\n${pair.comment}` : item.comment;
        item = pair;
      }
      seq.items[i] = item instanceof stringifyNumber.Pair ? item : new stringifyNumber.Pair(item);
    }
  } else onError('Expected a sequence for this tag');

  return seq;
}
function createPairs(schema, iterable, ctx) {
  const {
    replacer
  } = ctx;
  const pairs = new stringifyNumber.YAMLSeq(schema);
  pairs.tag = 'tag:yaml.org,2002:pairs';
  let i = 0;

  for (let it of iterable) {
    if (typeof replacer === 'function') it = replacer.call(iterable, String(i++), it);
    let key, value;

    if (Array.isArray(it)) {
      if (it.length === 2) {
        key = it[0];
        value = it[1];
      } else throw new TypeError(`Expected [key, value] tuple: ${it}`);
    } else if (it && it instanceof Object) {
      const keys = Object.keys(it);

      if (keys.length === 1) {
        key = keys[0];
        value = it[key];
      } else throw new TypeError(`Expected { key: value } tuple: ${it}`);
    } else {
      key = it;
    }

    pairs.items.push(stringifyNumber.createPair(key, value, ctx));
  }

  return pairs;
}
const pairs = {
  default: false,
  tag: 'tag:yaml.org,2002:pairs',
  resolve: parsePairs,
  createNode: createPairs
};

class YAMLOMap extends stringifyNumber.YAMLSeq {
  constructor() {
    super();

    _rollupPluginBabelHelpers._defineProperty(this, "add", stringifyNumber.YAMLMap.prototype.add.bind(this));

    _rollupPluginBabelHelpers._defineProperty(this, "delete", stringifyNumber.YAMLMap.prototype.delete.bind(this));

    _rollupPluginBabelHelpers._defineProperty(this, "get", stringifyNumber.YAMLMap.prototype.get.bind(this));

    _rollupPluginBabelHelpers._defineProperty(this, "has", stringifyNumber.YAMLMap.prototype.has.bind(this));

    _rollupPluginBabelHelpers._defineProperty(this, "set", stringifyNumber.YAMLMap.prototype.set.bind(this));

    this.tag = YAMLOMap.tag;
  }

  toJSON(_, ctx) {
    const map = new Map();
    if (ctx && ctx.onCreate) ctx.onCreate(map);

    for (const pair of this.items) {
      let key, value;

      if (pair instanceof stringifyNumber.Pair) {
        key = stringifyNumber.toJS(pair.key, '', ctx);
        value = stringifyNumber.toJS(pair.value, key, ctx);
      } else {
        key = stringifyNumber.toJS(pair, '', ctx);
      }

      if (map.has(key)) throw new Error('Ordered maps must not include duplicate keys');
      map.set(key, value);
    }

    return map;
  }

}

_rollupPluginBabelHelpers._defineProperty(YAMLOMap, "tag", 'tag:yaml.org,2002:omap');

function parseOMap(seq, onError) {
  const pairs = parsePairs(seq, onError);
  const seenKeys = [];

  for (const {
    key
  } of pairs.items) {
    if (key instanceof stringifyNumber.Scalar) {
      if (seenKeys.includes(key.value)) {
        onError(`Ordered maps must not include duplicate keys: ${key.value}`);
      } else {
        seenKeys.push(key.value);
      }
    }
  }

  return Object.assign(new YAMLOMap(), pairs);
}

function createOMap(schema, iterable, ctx) {
  const pairs = createPairs(schema, iterable, ctx);
  const omap = new YAMLOMap();
  omap.items = pairs.items;
  return omap;
}

const omap = {
  identify: value => value instanceof Map,
  nodeClass: YAMLOMap,
  default: false,
  tag: 'tag:yaml.org,2002:omap',
  resolve: parseOMap,
  createNode: createOMap
};

class YAMLSet extends stringifyNumber.YAMLMap {
  constructor(schema) {
    super(schema);
    this.tag = YAMLSet.tag;
  }

  add(key) {
    const pair = key instanceof stringifyNumber.Pair ? key : new stringifyNumber.Pair(key);
    const prev = stringifyNumber.findPair(this.items, pair.key);
    if (!prev) this.items.push(pair);
  }

  get(key, keepPair) {
    const pair = stringifyNumber.findPair(this.items, key);
    return !keepPair && pair instanceof stringifyNumber.Pair ? pair.key instanceof stringifyNumber.Scalar ? pair.key.value : pair.key : pair;
  }

  set(key, value) {
    if (typeof value !== 'boolean') throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
    const prev = stringifyNumber.findPair(this.items, key);

    if (prev && !value) {
      this.items.splice(this.items.indexOf(prev), 1);
    } else if (!prev && value) {
      this.items.push(new stringifyNumber.Pair(key));
    }
  }

  toJSON(_, ctx) {
    return super.toJSON(_, ctx, Set);
  }

  toString(ctx, onComment, onChompKeep) {
    if (!ctx) return JSON.stringify(this);
    if (this.hasAllNullValues()) return super.toString(ctx, onComment, onChompKeep);else throw new Error('Set items must all have null values');
  }

}

_rollupPluginBabelHelpers._defineProperty(YAMLSet, "tag", 'tag:yaml.org,2002:set');

function parseSet(map, onError) {
  if (map instanceof stringifyNumber.YAMLMap) {
    if (map.hasAllNullValues()) return Object.assign(new YAMLSet(), map);else onError('Set items must all have null values');
  } else onError('Expected a mapping for this tag');

  return map;
}

function createSet(schema, iterable, ctx) {
  const {
    replacer
  } = ctx;
  const set = new YAMLSet(schema);

  for (let value of iterable) {
    if (typeof replacer === 'function') value = replacer.call(iterable, value, value);
    set.items.push(stringifyNumber.createPair(value, null, ctx));
  }

  return set;
}

const set = {
  identify: value => value instanceof Set,
  nodeClass: YAMLSet,
  default: false,
  tag: 'tag:yaml.org,2002:set',
  resolve: parseSet,
  createNode: createSet
};

/* global BigInt */

const parseSexagesimal = (str, isInt) => {
  const sign = str[0];
  const parts = sign === '-' || sign === '+' ? str.substring(1) : str;

  const num = n => isInt && stringifyNumber.intOptions.asBigInt ? BigInt(n) : Number(n);

  const res = parts.replace(/_/g, '').split(':').reduce((res, p) => res * num(60) + num(p), num(0));
  return sign === '-' ? num(-1) * res : res;
}; // hhhh:mm:ss.sss


const stringifySexagesimal = ({
  value
}) => {
  let num = n => n;

  if (typeof value === 'bigint') num = n => BigInt(n);else if (isNaN(value) || !isFinite(value)) return stringifyNumber.stringifyNumber(value);
  let sign = '';

  if (value < 0) {
    sign = '-';
    value *= num(-1);
  }

  const _60 = num(60);

  const parts = [value % _60]; // seconds, including ms

  if (value < 60) {
    parts.unshift(0); // at least one : is required
  } else {
    value = (value - parts[0]) / _60;
    parts.unshift(value % _60); // minutes

    if (value >= 60) {
      value = (value - parts[0]) / _60;
      parts.unshift(value); // hours
    }
  }

  return sign + parts.map(n => n < 10 ? '0' + String(n) : String(n)).join(':').replace(/000000\d*$/, '') // % 60 may introduce error
  ;
};

const intTime = {
  identify: value => typeof value === 'bigint' || Number.isInteger(value),
  default: true,
  tag: 'tag:yaml.org,2002:int',
  format: 'TIME',
  test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
  resolve: str => parseSexagesimal(str, true),
  stringify: stringifySexagesimal
};
const floatTime = {
  identify: value => typeof value === 'number',
  default: true,
  tag: 'tag:yaml.org,2002:float',
  format: 'TIME',
  test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
  resolve: str => parseSexagesimal(str, false),
  stringify: stringifySexagesimal
};
const timestamp = {
  identify: value => value instanceof Date,
  default: true,
  tag: 'tag:yaml.org,2002:timestamp',
  // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
  // may be omitted altogether, resulting in a date format. In such a case, the time part is
  // assumed to be 00:00:00Z (start of day, UTC).
  test: RegExp('^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})' + // YYYY-Mm-Dd
  '(?:' + // time is optional
  '(?:t|T|[ \\t]+)' + // t | T | whitespace
  '([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)' + // Hh:Mm:Ss(.ss)?
  '(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?' + // Z | +5 | -03:30
  ')?$'),

  resolve(str) {
    let [, year, month, day, hour, minute, second, millisec, tz] = str.match(timestamp.test);
    if (millisec) millisec = (millisec + '00').substr(1, 3);
    let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec || 0);

    if (tz && tz !== 'Z') {
      let d = parseSexagesimal(tz, false);
      if (Math.abs(d) < 30) d *= 60;
      date -= 60000 * d;
    }

    return new Date(date);
  },

  stringify: ({
    value
  }) => value.toISOString().replace(/((T00:00)?:00)?\.000Z$/, '')
};

/* global BigInt */

const boolStringify = ({
  value
}) => value ? stringifyNumber.boolOptions.trueStr : stringifyNumber.boolOptions.falseStr;

const intIdentify$2 = value => typeof value === 'bigint' || Number.isInteger(value);

function intResolve$1(str, offset, radix) {
  const sign = str[0];
  if (sign === '-' || sign === '+') offset += 1;
  str = str.substring(offset).replace(/_/g, '');

  if (stringifyNumber.intOptions.asBigInt) {
    switch (radix) {
      case 2:
        str = `0b${str}`;
        break;

      case 8:
        str = `0o${str}`;
        break;

      case 16:
        str = `0x${str}`;
        break;
    }

    const n = BigInt(str);
    return sign === '-' ? BigInt(-1) * n : n;
  }

  const n = parseInt(str, radix);
  return sign === '-' ? -1 * n : n;
}

function intStringify$1(node, radix, prefix) {
  const {
    value
  } = node;

  if (intIdentify$2(value)) {
    const str = value.toString(radix);
    return value < 0 ? '-' + prefix + str.substr(1) : prefix + str;
  }

  return stringifyNumber.stringifyNumber(node);
}

const yaml11 = failsafe.concat([{
  identify: value => value == null,
  createNode: (schema, value, ctx) => ctx.wrapScalars ? new stringifyNumber.Scalar(null) : null,
  default: true,
  tag: 'tag:yaml.org,2002:null',
  test: /^(?:~|[Nn]ull|NULL)?$/,
  resolve: str => {
    const node = new stringifyNumber.Scalar(null);
    node.sourceStr = str;
    return node;
  },
  options: stringifyNumber.nullOptions,
  stringify: ({
    sourceStr
  }) => sourceStr !== null && sourceStr !== void 0 ? sourceStr : stringifyNumber.nullOptions.nullStr
}, {
  identify: value => typeof value === 'boolean',
  default: true,
  tag: 'tag:yaml.org,2002:bool',
  test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
  resolve: () => true,
  options: stringifyNumber.boolOptions,
  stringify: boolStringify
}, {
  identify: value => typeof value === 'boolean',
  default: true,
  tag: 'tag:yaml.org,2002:bool',
  test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
  resolve: () => false,
  options: stringifyNumber.boolOptions,
  stringify: boolStringify
}, {
  identify: intIdentify$2,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  format: 'BIN',
  test: /^[-+]?0b[0-1_]+$/,
  resolve: str => intResolve$1(str, 2, 2),
  stringify: node => intStringify$1(node, 2, '0b')
}, {
  identify: intIdentify$2,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  format: 'OCT',
  test: /^[-+]?0[0-7_]+$/,
  resolve: str => intResolve$1(str, 1, 8),
  stringify: node => intStringify$1(node, 8, '0')
}, {
  identify: intIdentify$2,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  test: /^[-+]?[0-9][0-9_]*$/,
  resolve: str => intResolve$1(str, 0, 10),
  stringify: stringifyNumber.stringifyNumber
}, {
  identify: intIdentify$2,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  format: 'HEX',
  test: /^[-+]?0x[0-9a-fA-F_]+$/,
  resolve: str => intResolve$1(str, 2, 16),
  stringify: node => intStringify$1(node, 16, '0x')
}, {
  identify: value => typeof value === 'number',
  default: true,
  tag: 'tag:yaml.org,2002:float',
  test: /^[-+]?\.(?:inf|Inf|INF|nan|NaN|NAN)$/,
  resolve: str => str.slice(-3).toLowerCase() === 'nan' ? NaN : str[0] === '-' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
  stringify: stringifyNumber.stringifyNumber
}, {
  identify: value => typeof value === 'number',
  default: true,
  tag: 'tag:yaml.org,2002:float',
  format: 'EXP',
  test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
  resolve: str => parseFloat(str.replace(/_/g, '')),
  stringify: ({
    value
  }) => Number(value).toExponential()
}, {
  identify: value => typeof value === 'number',
  default: true,
  tag: 'tag:yaml.org,2002:float',
  test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,

  resolve(str) {
    const node = new stringifyNumber.Scalar(parseFloat(str.replace(/_/g, '')));
    const dot = str.indexOf('.');

    if (dot !== -1) {
      const f = str.substring(dot + 1).replace(/_/g, '');
      if (f[f.length - 1] === '0') node.minFractionDigits = f.length;
    }

    return node;
  },

  stringify: stringifyNumber.stringifyNumber
}], binary, omap, pairs, set, intTime, floatTime, timestamp);

const schemas = {
  core,
  failsafe,
  json,
  yaml11
};
const tags = {
  binary,
  bool: boolObj,
  float: floatObj,
  floatExp: expObj,
  floatNaN: nanObj,
  floatTime,
  int: intObj,
  intHex: hexObj,
  intOct: octObj,
  intTime,
  map,
  null: nullObj,
  omap,
  pairs,
  seq,
  set,
  timestamp
};

function getSchemaTags(schemas, knownTags, customTags, schemaId) {
  let tags = schemas[schemaId.replace(/\W/g, '')]; // 'yaml-1.1' -> 'yaml11'

  if (!tags) {
    const keys = Object.keys(schemas).map(key => JSON.stringify(key)).join(', ');
    throw new Error(`Unknown schema "${schemaId}"; use one of ${keys}`);
  }

  if (Array.isArray(customTags)) {
    for (const tag of customTags) tags = tags.concat(tag);
  } else if (typeof customTags === 'function') {
    tags = customTags(tags.slice());
  }

  for (let i = 0; i < tags.length; ++i) {
    const tag = tags[i];

    if (typeof tag === 'string') {
      const tagObj = knownTags[tag];

      if (!tagObj) {
        const keys = Object.keys(knownTags).map(key => JSON.stringify(key)).join(', ');
        throw new Error(`Unknown custom tag "${tag}"; use one of ${keys}`);
      }

      tags[i] = tagObj;
    }
  }

  return tags;
}

const sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;

const coreKnownTags = {
  'tag:yaml.org,2002:binary': tags.binary,
  'tag:yaml.org,2002:omap': tags.omap,
  'tag:yaml.org,2002:pairs': tags.pairs,
  'tag:yaml.org,2002:set': tags.set,
  'tag:yaml.org,2002:timestamp': tags.timestamp
};
class Schema {
  constructor({
    customTags,
    merge,
    resolveKnownTags,
    schema,
    sortMapEntries
  }) {
    this.merge = !!merge;
    this.name = schema;
    this.knownTags = resolveKnownTags ? coreKnownTags : {};
    this.tags = getSchemaTags(schemas, tags, customTags, schema); // Used by createNode(), to avoid circular dependencies

    this.map = tags.map;
    this.seq = tags.seq; // Used by createMap()

    this.sortMapEntries = sortMapEntries === true ? sortMapEntriesByKey : sortMapEntries || null;
  }

}

exports.MERGE_KEY = MERGE_KEY;
exports.Merge = Merge;
exports.Schema = Schema;
