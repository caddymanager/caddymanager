import { promises, existsSync, readFileSync, lstatSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import defu$1, { defu } from 'defu';
import { applyDefaults } from 'untyped';
import { dirname, relative, join, resolve, normalize, isAbsolute, basename, parse } from 'pathe';
import { consola } from 'consola';
import { AsyncLocalStorage } from 'node:async_hooks';
import { getContext, createContext } from 'unctx';
import satisfies from 'semver/functions/satisfies.js';
import { readPackageJSON } from 'pkg-types';
import { genSafeVariableName, genDynamicImport, genImport } from 'knitwork';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';
import { interopDefault, parseNodeModulePath } from 'mlly';
import { resolveModulePath, resolveModuleURL } from 'exsolve';
import { isRelative, withTrailingSlash } from 'ufo';
import { globby } from 'globby';
import { resolveAlias as resolveAlias$1 } from 'pathe/utils';
import ignore from 'ignore';
import { loadConfig } from 'c12';
import process$1 from 'node:process';
import destr from 'destr';
import { snakeCase, pascalCase, kebabCase } from 'scule';
import { klona } from 'klona';
import { hash } from 'ohash';
import { gte } from 'semver';
import { captureStackTrace } from 'errx';
import { isAbsolute as isAbsolute$1 } from 'node:path';

const logger = consola;
function useLogger(tag, options = {}) {
  return tag ? logger.create(options).withTag(tag) : logger;
}

const nuxtCtx = getContext("nuxt");
const asyncNuxtStorage = createContext({
  asyncContext: true,
  AsyncLocalStorage
});
const getNuxtCtx = () => asyncNuxtStorage.tryUse();
function useNuxt() {
  const instance = asyncNuxtStorage.tryUse() || nuxtCtx.tryUse();
  if (!instance) {
    throw new Error("Nuxt instance is unavailable!");
  }
  return instance;
}
function tryUseNuxt() {
  return asyncNuxtStorage.tryUse() || nuxtCtx.tryUse();
}
function runWithNuxtContext(nuxt, fn) {
  return asyncNuxtStorage.call(nuxt, fn);
}

const SEMANTIC_VERSION_RE = /-\d+\.[0-9a-f]+/;
function normalizeSemanticVersion(version) {
  return version.replace(SEMANTIC_VERSION_RE, "");
}
const builderMap = {
  "@nuxt/rspack-builder": "rspack",
  "@nuxt/vite-builder": "vite",
  "@nuxt/webpack-builder": "webpack"
};
function checkNuxtVersion(version, nuxt = useNuxt()) {
  const nuxtVersion = getNuxtVersion(nuxt);
  return satisfies(normalizeSemanticVersion(nuxtVersion), version, { includePrerelease: true });
}
async function checkNuxtCompatibility(constraints, nuxt = useNuxt()) {
  const issues = [];
  if (constraints.nuxt) {
    const nuxtVersion = getNuxtVersion(nuxt);
    if (!checkNuxtVersion(constraints.nuxt, nuxt)) {
      issues.push({
        name: "nuxt",
        message: `Nuxt version \`${constraints.nuxt}\` is required but currently using \`${nuxtVersion}\``
      });
    }
  }
  if (isNuxt2(nuxt)) {
    const bridgeRequirement = constraints.bridge;
    const hasBridge = !!nuxt.options.bridge;
    if (bridgeRequirement === true && !hasBridge) {
      issues.push({
        name: "bridge",
        message: "Nuxt bridge is required"
      });
    } else if (bridgeRequirement === false && hasBridge) {
      issues.push({
        name: "bridge",
        message: "Nuxt bridge is not supported"
      });
    }
  }
  if (constraints.builder && typeof nuxt.options.builder === "string") {
    const currentBuilder = builderMap[nuxt.options.builder] || nuxt.options.builder;
    if (currentBuilder in constraints.builder) {
      const constraint = constraints.builder[currentBuilder];
      if (constraint === false) {
        issues.push({
          name: "builder",
          message: `Not compatible with \`${nuxt.options.builder}\`.`
        });
      } else {
        for (const parent of [nuxt.options.rootDir, nuxt.options.workspaceDir, import.meta.url]) {
          const builderVersion = await readPackageJSON(nuxt.options.builder, { parent }).then((r) => r.version).catch(() => void 0);
          if (builderVersion) {
            if (!satisfies(normalizeSemanticVersion(builderVersion), constraint, { includePrerelease: true })) {
              issues.push({
                name: "builder",
                message: `Not compatible with \`${builderVersion}\` of \`${currentBuilder}\`. This module requires \`${constraint}\`.`
              });
            }
            break;
          }
        }
      }
    }
  }
  await nuxt.callHook("kit:compatibility", constraints, issues);
  issues.toString = () => issues.map((issue) => ` - [${issue.name}] ${issue.message}`).join("\n");
  return issues;
}
async function assertNuxtCompatibility(constraints, nuxt = useNuxt()) {
  const issues = await checkNuxtCompatibility(constraints, nuxt);
  if (issues.length) {
    throw new Error("Nuxt compatibility issues found:\n" + issues.toString());
  }
  return true;
}
async function hasNuxtCompatibility(constraints, nuxt = useNuxt()) {
  const issues = await checkNuxtCompatibility(constraints, nuxt);
  return !issues.length;
}
function isNuxtMajorVersion(majorVersion, nuxt = useNuxt()) {
  const version = getNuxtVersion(nuxt);
  return version[0] === majorVersion.toString() && version[1] === ".";
}
function isNuxt2(nuxt = useNuxt()) {
  return isNuxtMajorVersion(2, nuxt);
}
function isNuxt3(nuxt = useNuxt()) {
  return isNuxtMajorVersion(3, nuxt);
}
const NUXT_VERSION_RE = /^v/g;
function getNuxtVersion(nuxt = useNuxt()) {
  const rawVersion = nuxt?._version || nuxt?.version || nuxt?.constructor?.version;
  if (typeof rawVersion !== "string") {
    throw new TypeError("Cannot determine nuxt version! Is current instance passed?");
  }
  return rawVersion.replace(NUXT_VERSION_RE, "");
}

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Built-in value references. */
var Symbol$1 = root.Symbol;

/** Used for built-in method references. */
var objectProto$b = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$9 = objectProto$b.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString$1 = objectProto$b.toString;

/** Built-in value references. */
var symToStringTag$1 = Symbol$1 ? Symbol$1.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty$9.call(value, symToStringTag$1),
      tag = value[symToStringTag$1];

  try {
    value[symToStringTag$1] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString$1.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag$1] = tag;
    } else {
      delete value[symToStringTag$1];
    }
  }
  return result;
}

/** Used for built-in method references. */
var objectProto$a = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto$a.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString.call(value);
}

/** `Object#toString` result references. */
var nullTag = '[object Null]',
    undefinedTag = '[object Undefined]';

/** Built-in value references. */
var symToStringTag = Symbol$1 ? Symbol$1.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && baseGetTag(value) == symbolTag);
}

/**
 * A specialized version of `_.map` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function arrayMap(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length,
      result = Array(length);

  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol$1 ? Symbol$1.prototype : undefined,
    symbolToString = symbolProto ? symbolProto.toString : undefined;

/**
 * The base implementation of `_.toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (isArray(value)) {
    // Recursively convert values (susceptible to call stack limits).
    return arrayMap(value, baseToString) + '';
  }
  if (isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -Infinity) ? '-0' : result;
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

/**
 * This method returns the first argument it receives.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Util
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'a': 1 };
 *
 * console.log(_.identity(object) === object);
 * // => true
 */
function identity(value) {
  return value;
}

/** `Object#toString` result references. */
var asyncTag = '[object AsyncFunction]',
    funcTag$1 = '[object Function]',
    genTag = '[object GeneratorFunction]',
    proxyTag = '[object Proxy]';

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  if (!isObject(value)) {
    return false;
  }
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 9 which returns 'object' for typed arrays and other constructors.
  var tag = baseGetTag(value);
  return tag == funcTag$1 || tag == genTag || tag == asyncTag || tag == proxyTag;
}

/** Used to detect overreaching core-js shims. */
var coreJsData = root['__core-js_shared__'];

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && (maskSrcKey in func);
}

/** Used for built-in method references. */
var funcProto$2 = Function.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString$2 = funcProto$2.toString;

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to convert.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString$2.call(func);
    } catch (e) {}
    try {
      return (func + '');
    } catch (e) {}
  }
  return '';
}

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used for built-in method references. */
var funcProto$1 = Function.prototype,
    objectProto$9 = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString$1 = funcProto$1.toString;

/** Used to check objects for own properties. */
var hasOwnProperty$8 = objectProto$9.hasOwnProperty;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  funcToString$1.call(hasOwnProperty$8).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!isObject(value) || isMasked(value)) {
    return false;
  }
  var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}

/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : undefined;
}

/**
 * A faster alternative to `Function#apply`, this function invokes `func`
 * with the `this` binding of `thisArg` and the arguments of `args`.
 *
 * @private
 * @param {Function} func The function to invoke.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {Array} args The arguments to invoke `func` with.
 * @returns {*} Returns the result of `func`.
 */
function apply(func, thisArg, args) {
  switch (args.length) {
    case 0: return func.call(thisArg);
    case 1: return func.call(thisArg, args[0]);
    case 2: return func.call(thisArg, args[0], args[1]);
    case 3: return func.call(thisArg, args[0], args[1], args[2]);
  }
  return func.apply(thisArg, args);
}

/** Used to detect hot functions by number of calls within a span of milliseconds. */
var HOT_COUNT = 800,
    HOT_SPAN = 16;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeNow = Date.now;

/**
 * Creates a function that'll short out and invoke `identity` instead
 * of `func` when it's called `HOT_COUNT` or more times in `HOT_SPAN`
 * milliseconds.
 *
 * @private
 * @param {Function} func The function to restrict.
 * @returns {Function} Returns the new shortable function.
 */
function shortOut(func) {
  var count = 0,
      lastCalled = 0;

  return function() {
    var stamp = nativeNow(),
        remaining = HOT_SPAN - (stamp - lastCalled);

    lastCalled = stamp;
    if (remaining > 0) {
      if (++count >= HOT_COUNT) {
        return arguments[0];
      }
    } else {
      count = 0;
    }
    return func.apply(undefined, arguments);
  };
}

/**
 * Creates a function that returns `value`.
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Util
 * @param {*} value The value to return from the new function.
 * @returns {Function} Returns the new constant function.
 * @example
 *
 * var objects = _.times(2, _.constant({ 'a': 1 }));
 *
 * console.log(objects);
 * // => [{ 'a': 1 }, { 'a': 1 }]
 *
 * console.log(objects[0] === objects[1]);
 * // => true
 */
function constant(value) {
  return function() {
    return value;
  };
}

var defineProperty = (function() {
  try {
    var func = getNative(Object, 'defineProperty');
    func({}, '', {});
    return func;
  } catch (e) {}
}());

/**
 * The base implementation of `setToString` without support for hot loop shorting.
 *
 * @private
 * @param {Function} func The function to modify.
 * @param {Function} string The `toString` result.
 * @returns {Function} Returns `func`.
 */
var baseSetToString = !defineProperty ? identity : function(func, string) {
  return defineProperty(func, 'toString', {
    'configurable': true,
    'enumerable': false,
    'value': constant(string),
    'writable': true
  });
};

/**
 * Sets the `toString` method of `func` to return `string`.
 *
 * @private
 * @param {Function} func The function to modify.
 * @param {Function} string The `toString` result.
 * @returns {Function} Returns `func`.
 */
var setToString = shortOut(baseSetToString);

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER$1 = 9007199254740991;

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  var type = typeof value;
  length = length == null ? MAX_SAFE_INTEGER$1 : length;

  return !!length &&
    (type == 'number' ||
      (type != 'symbol' && reIsUint.test(value))) &&
        (value > -1 && value % 1 == 0 && value < length);
}

/**
 * The base implementation of `assignValue` and `assignMergeValue` without
 * value checks.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function baseAssignValue(object, key, value) {
  if (key == '__proto__' && defineProperty) {
    defineProperty(object, key, {
      'configurable': true,
      'enumerable': true,
      'value': value,
      'writable': true
    });
  } else {
    object[key] = value;
  }
}

/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

/** Used for built-in method references. */
var objectProto$8 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$7 = objectProto$8.hasOwnProperty;

/**
 * Assigns `value` to `key` of `object` if the existing value is not equivalent
 * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * for equality comparisons.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function assignValue(object, key, value) {
  var objValue = object[key];
  if (!(hasOwnProperty$7.call(object, key) && eq(objValue, value)) ||
      (value === undefined && !(key in object))) {
    baseAssignValue(object, key, value);
  }
}

/**
 * Copies properties of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy properties from.
 * @param {Array} props The property identifiers to copy.
 * @param {Object} [object={}] The object to copy properties to.
 * @param {Function} [customizer] The function to customize copied values.
 * @returns {Object} Returns `object`.
 */
function copyObject(source, props, object, customizer) {
  var isNew = !object;
  object || (object = {});

  var index = -1,
      length = props.length;

  while (++index < length) {
    var key = props[index];

    var newValue = customizer
      ? customizer(object[key], source[key], key, object, source)
      : undefined;

    if (newValue === undefined) {
      newValue = source[key];
    }
    if (isNew) {
      baseAssignValue(object, key, newValue);
    } else {
      assignValue(object, key, newValue);
    }
  }
  return object;
}

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * A specialized version of `baseRest` which transforms the rest array.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @param {Function} transform The rest array transform.
 * @returns {Function} Returns the new function.
 */
function overRest(func, start, transform) {
  start = nativeMax(start === undefined ? (func.length - 1) : start, 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        array = Array(length);

    while (++index < length) {
      array[index] = args[start + index];
    }
    index = -1;
    var otherArgs = Array(start + 1);
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = transform(array);
    return apply(func, this, otherArgs);
  };
}

/**
 * The base implementation of `_.rest` which doesn't validate or coerce arguments.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 */
function baseRest(func, start) {
  return setToString(overRest(func, start, identity), func + '');
}

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}

/**
 * Checks if the given arguments are from an iteratee call.
 *
 * @private
 * @param {*} value The potential iteratee value argument.
 * @param {*} index The potential iteratee index or key argument.
 * @param {*} object The potential iteratee object argument.
 * @returns {boolean} Returns `true` if the arguments are from an iteratee call,
 *  else `false`.
 */
function isIterateeCall(value, index, object) {
  if (!isObject(object)) {
    return false;
  }
  var type = typeof index;
  if (type == 'number'
        ? (isArrayLike(object) && isIndex(index, object.length))
        : (type == 'string' && index in object)
      ) {
    return eq(object[index], value);
  }
  return false;
}

/**
 * Creates a function like `_.assign`.
 *
 * @private
 * @param {Function} assigner The function to assign values.
 * @returns {Function} Returns the new assigner function.
 */
function createAssigner(assigner) {
  return baseRest(function(object, sources) {
    var index = -1,
        length = sources.length,
        customizer = length > 1 ? sources[length - 1] : undefined,
        guard = length > 2 ? sources[2] : undefined;

    customizer = (assigner.length > 3 && typeof customizer == 'function')
      ? (length--, customizer)
      : undefined;

    if (guard && isIterateeCall(sources[0], sources[1], guard)) {
      customizer = length < 3 ? undefined : customizer;
      length = 1;
    }
    object = Object(object);
    while (++index < length) {
      var source = sources[index];
      if (source) {
        assigner(object, source, index, customizer);
      }
    }
    return object;
  });
}

/** Used for built-in method references. */
var objectProto$7 = Object.prototype;

/**
 * Checks if `value` is likely a prototype object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
 */
function isPrototype(value) {
  var Ctor = value && value.constructor,
      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto$7;

  return value === proto;
}

/**
 * The base implementation of `_.times` without support for iteratee shorthands
 * or max array length checks.
 *
 * @private
 * @param {number} n The number of times to invoke `iteratee`.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the array of results.
 */
function baseTimes(n, iteratee) {
  var index = -1,
      result = Array(n);

  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}

/** `Object#toString` result references. */
var argsTag$1 = '[object Arguments]';

/**
 * The base implementation of `_.isArguments`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 */
function baseIsArguments(value) {
  return isObjectLike(value) && baseGetTag(value) == argsTag$1;
}

/** Used for built-in method references. */
var objectProto$6 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$6 = objectProto$6.hasOwnProperty;

/** Built-in value references. */
var propertyIsEnumerable = objectProto$6.propertyIsEnumerable;

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
var isArguments = baseIsArguments(function() { return arguments; }()) ? baseIsArguments : function(value) {
  return isObjectLike(value) && hasOwnProperty$6.call(value, 'callee') &&
    !propertyIsEnumerable.call(value, 'callee');
};

/**
 * This method returns `false`.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {boolean} Returns `false`.
 * @example
 *
 * _.times(2, _.stubFalse);
 * // => [false, false]
 */
function stubFalse() {
  return false;
}

/** Detect free variable `exports`. */
var freeExports$1 = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule$1 = freeExports$1 && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports$1 = freeModule$1 && freeModule$1.exports === freeExports$1;

/** Built-in value references. */
var Buffer = moduleExports$1 ? root.Buffer : undefined;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;

/**
 * Checks if `value` is a buffer.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
 * @example
 *
 * _.isBuffer(new Buffer(2));
 * // => true
 *
 * _.isBuffer(new Uint8Array(2));
 * // => false
 */
var isBuffer = nativeIsBuffer || stubFalse;

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag$1 = '[object Error]',
    funcTag = '[object Function]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag$1 = '[object Object]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    dataViewTag = '[object DataView]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
typedArrayTags[dataViewTag] = typedArrayTags[dateTag] =
typedArrayTags[errorTag$1] = typedArrayTags[funcTag] =
typedArrayTags[mapTag] = typedArrayTags[numberTag] =
typedArrayTags[objectTag$1] = typedArrayTags[regexpTag] =
typedArrayTags[setTag] = typedArrayTags[stringTag] =
typedArrayTags[weakMapTag] = false;

/**
 * The base implementation of `_.isTypedArray` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 */
function baseIsTypedArray(value) {
  return isObjectLike(value) &&
    isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
}

/**
 * The base implementation of `_.unary` without support for storing metadata.
 *
 * @private
 * @param {Function} func The function to cap arguments for.
 * @returns {Function} Returns the new capped function.
 */
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}

/** Detect free variable `exports`. */
var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Detect free variable `process` from Node.js. */
var freeProcess = moduleExports && freeGlobal.process;

/** Used to access faster Node.js helpers. */
var nodeUtil = (function() {
  try {
    // Use `util.types` for Node.js 10+.
    var types = freeModule && freeModule.require && freeModule.require('util').types;

    if (types) {
      return types;
    }

    // Legacy `process.binding('util')` for Node.js < 10.
    return freeProcess && freeProcess.binding && freeProcess.binding('util');
  } catch (e) {}
}());

/* Node.js helper references. */
var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;

/** Used for built-in method references. */
var objectProto$5 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$5 = objectProto$5.hasOwnProperty;

/**
 * Creates an array of the enumerable property names of the array-like `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @param {boolean} inherited Specify returning inherited property names.
 * @returns {Array} Returns the array of property names.
 */
function arrayLikeKeys(value, inherited) {
  var isArr = isArray(value),
      isArg = !isArr && isArguments(value),
      isBuff = !isArr && !isArg && isBuffer(value),
      isType = !isArr && !isArg && !isBuff && isTypedArray(value),
      skipIndexes = isArr || isArg || isBuff || isType,
      result = skipIndexes ? baseTimes(value.length, String) : [],
      length = result.length;

  for (var key in value) {
    if ((inherited || hasOwnProperty$5.call(value, key)) &&
        !(skipIndexes && (
           // Safari 9 has enumerable `arguments.length` in strict mode.
           key == 'length' ||
           // Node.js 0.10 has enumerable non-index properties on buffers.
           (isBuff && (key == 'offset' || key == 'parent')) ||
           // PhantomJS 2 has enumerable non-index properties on typed arrays.
           (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
           // Skip index properties.
           isIndex(key, length)
        ))) {
      result.push(key);
    }
  }
  return result;
}

/**
 * Creates a unary function that invokes `func` with its argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeKeys = overArg(Object.keys, Object);

/** Used for built-in method references. */
var objectProto$4 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$4 = objectProto$4.hasOwnProperty;

/**
 * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeys(object) {
  if (!isPrototype(object)) {
    return nativeKeys(object);
  }
  var result = [];
  for (var key in Object(object)) {
    if (hasOwnProperty$4.call(object, key) && key != 'constructor') {
      result.push(key);
    }
  }
  return result;
}

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
function keys(object) {
  return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
}

/**
 * This function is like
 * [`Object.keys`](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * except that it includes inherited enumerable properties.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function nativeKeysIn(object) {
  var result = [];
  if (object != null) {
    for (var key in Object(object)) {
      result.push(key);
    }
  }
  return result;
}

/** Used for built-in method references. */
var objectProto$3 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$3 = objectProto$3.hasOwnProperty;

/**
 * The base implementation of `_.keysIn` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeysIn(object) {
  if (!isObject(object)) {
    return nativeKeysIn(object);
  }
  var isProto = isPrototype(object),
      result = [];

  for (var key in object) {
    if (!(key == 'constructor' && (isProto || !hasOwnProperty$3.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  return isArrayLike(object) ? arrayLikeKeys(object, true) : baseKeysIn(object);
}

/**
 * This method is like `_.assignIn` except that it accepts `customizer`
 * which is invoked to produce the assigned values. If `customizer` returns
 * `undefined`, assignment is handled by the method instead. The `customizer`
 * is invoked with five arguments: (objValue, srcValue, key, object, source).
 *
 * **Note:** This method mutates `object`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @alias extendWith
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} sources The source objects.
 * @param {Function} [customizer] The function to customize assigned values.
 * @returns {Object} Returns `object`.
 * @see _.assignWith
 * @example
 *
 * function customizer(objValue, srcValue) {
 *   return _.isUndefined(objValue) ? srcValue : objValue;
 * }
 *
 * var defaults = _.partialRight(_.assignInWith, customizer);
 *
 * defaults({ 'a': 1 }, { 'b': 2 }, { 'a': 3 });
 * // => { 'a': 1, 'b': 2 }
 */
var assignInWith = createAssigner(function(object, source, srcIndex, customizer) {
  copyObject(source, keysIn(source), object, customizer);
});

/**
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  return value == null ? '' : baseToString(value);
}

/** Built-in value references. */
var getPrototype = overArg(Object.getPrototypeOf, Object);

/** `Object#toString` result references. */
var objectTag = '[object Object]';

/** Used for built-in method references. */
var funcProto = Function.prototype,
    objectProto$2 = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty$2 = objectProto$2.hasOwnProperty;

/** Used to infer the `Object` constructor. */
var objectCtorString = funcToString.call(Object);

/**
 * Checks if `value` is a plain object, that is, an object created by the
 * `Object` constructor or one with a `[[Prototype]]` of `null`.
 *
 * @static
 * @memberOf _
 * @since 0.8.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 * }
 *
 * _.isPlainObject(new Foo);
 * // => false
 *
 * _.isPlainObject([1, 2, 3]);
 * // => false
 *
 * _.isPlainObject({ 'x': 0, 'y': 0 });
 * // => true
 *
 * _.isPlainObject(Object.create(null));
 * // => true
 */
function isPlainObject(value) {
  if (!isObjectLike(value) || baseGetTag(value) != objectTag) {
    return false;
  }
  var proto = getPrototype(value);
  if (proto === null) {
    return true;
  }
  var Ctor = hasOwnProperty$2.call(proto, 'constructor') && proto.constructor;
  return typeof Ctor == 'function' && Ctor instanceof Ctor &&
    funcToString.call(Ctor) == objectCtorString;
}

/** `Object#toString` result references. */
var domExcTag = '[object DOMException]',
    errorTag = '[object Error]';

/**
 * Checks if `value` is an `Error`, `EvalError`, `RangeError`, `ReferenceError`,
 * `SyntaxError`, `TypeError`, or `URIError` object.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an error object, else `false`.
 * @example
 *
 * _.isError(new Error);
 * // => true
 *
 * _.isError(Error);
 * // => false
 */
function isError(value) {
  if (!isObjectLike(value)) {
    return false;
  }
  var tag = baseGetTag(value);
  return tag == errorTag || tag == domExcTag ||
    (typeof value.message == 'string' && typeof value.name == 'string' && !isPlainObject(value));
}

/**
 * Attempts to invoke `func`, returning either the result or the caught error
 * object. Any additional arguments are provided to `func` when it's invoked.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Util
 * @param {Function} func The function to attempt.
 * @param {...*} [args] The arguments to invoke `func` with.
 * @returns {*} Returns the `func` result or error object.
 * @example
 *
 * // Avoid throwing errors for invalid selectors.
 * var elements = _.attempt(function(selector) {
 *   return document.querySelectorAll(selector);
 * }, '>_>');
 *
 * if (_.isError(elements)) {
 *   elements = [];
 * }
 */
var attempt = baseRest(function(func, args) {
  try {
    return apply(func, undefined, args);
  } catch (e) {
    return isError(e) ? e : new Error(e);
  }
});

/**
 * The base implementation of `_.propertyOf` without support for deep paths.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Function} Returns the new accessor function.
 */
function basePropertyOf(object) {
  return function(key) {
    return object == null ? undefined : object[key];
  };
}

/** Used to map characters to HTML entities. */
var htmlEscapes = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/**
 * Used by `_.escape` to convert characters to HTML entities.
 *
 * @private
 * @param {string} chr The matched character to escape.
 * @returns {string} Returns the escaped character.
 */
var escapeHtmlChar = basePropertyOf(htmlEscapes);

/** Used to match HTML entities and HTML characters. */
var reUnescapedHtml = /[&<>"']/g,
    reHasUnescapedHtml = RegExp(reUnescapedHtml.source);

/**
 * Converts the characters "&", "<", ">", '"', and "'" in `string` to their
 * corresponding HTML entities.
 *
 * **Note:** No other characters are escaped. To escape additional
 * characters use a third-party library like [_he_](https://mths.be/he).
 *
 * Though the ">" character is escaped for symmetry, characters like
 * ">" and "/" don't need escaping in HTML and have no special meaning
 * unless they're part of a tag or unquoted attribute value. See
 * [Mathias Bynens's article](https://mathiasbynens.be/notes/ambiguous-ampersands)
 * (under "semi-related fun fact") for more details.
 *
 * When working with HTML you should always
 * [quote attribute values](http://wonko.com/post/html-escaping) to reduce
 * XSS vectors.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category String
 * @param {string} [string=''] The string to escape.
 * @returns {string} Returns the escaped string.
 * @example
 *
 * _.escape('fred, barney, & pebbles');
 * // => 'fred, barney, &amp; pebbles'
 */
function escape(string) {
  string = toString(string);
  return (string && reHasUnescapedHtml.test(string))
    ? string.replace(reUnescapedHtml, escapeHtmlChar)
    : string;
}

/**
 * The base implementation of `_.values` and `_.valuesIn` which creates an
 * array of `object` property values corresponding to the property names
 * of `props`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array} props The property names to get values for.
 * @returns {Object} Returns the array of property values.
 */
function baseValues(object, props) {
  return arrayMap(props, function(key) {
    return object[key];
  });
}

/** Used for built-in method references. */
var objectProto$1 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$1 = objectProto$1.hasOwnProperty;

/**
 * Used by `_.defaults` to customize its `_.assignIn` use to assign properties
 * of source objects to the destination object for all destination properties
 * that resolve to `undefined`.
 *
 * @private
 * @param {*} objValue The destination value.
 * @param {*} srcValue The source value.
 * @param {string} key The key of the property to assign.
 * @param {Object} object The parent object of `objValue`.
 * @returns {*} Returns the value to assign.
 */
function customDefaultsAssignIn(objValue, srcValue, key, object) {
  if (objValue === undefined ||
      (eq(objValue, objectProto$1[key]) && !hasOwnProperty$1.call(object, key))) {
    return srcValue;
  }
  return objValue;
}

/** Used to escape characters for inclusion in compiled string literals. */
var stringEscapes = {
  '\\': '\\',
  "'": "'",
  '\n': 'n',
  '\r': 'r',
  '\u2028': 'u2028',
  '\u2029': 'u2029'
};

/**
 * Used by `_.template` to escape characters for inclusion in compiled string literals.
 *
 * @private
 * @param {string} chr The matched character to escape.
 * @returns {string} Returns the escaped character.
 */
function escapeStringChar(chr) {
  return '\\' + stringEscapes[chr];
}

/** Used to match template delimiters. */
var reInterpolate = /<%=([\s\S]+?)%>/g;

/** Used to match template delimiters. */
var reEscape = /<%-([\s\S]+?)%>/g;

/** Used to match template delimiters. */
var reEvaluate = /<%([\s\S]+?)%>/g;

/**
 * By default, the template delimiters used by lodash are like those in
 * embedded Ruby (ERB) as well as ES2015 template strings. Change the
 * following template settings to use alternative delimiters.
 *
 * @static
 * @memberOf _
 * @type {Object}
 */
var templateSettings = {

  /**
   * Used to detect `data` property values to be HTML-escaped.
   *
   * @memberOf _.templateSettings
   * @type {RegExp}
   */
  'escape': reEscape,

  /**
   * Used to detect code to be evaluated.
   *
   * @memberOf _.templateSettings
   * @type {RegExp}
   */
  'evaluate': reEvaluate,

  /**
   * Used to detect `data` property values to inject.
   *
   * @memberOf _.templateSettings
   * @type {RegExp}
   */
  'interpolate': reInterpolate,

  /**
   * Used to reference the data object in the template text.
   *
   * @memberOf _.templateSettings
   * @type {string}
   */
  'variable': '',

  /**
   * Used to import variables into the compiled template.
   *
   * @memberOf _.templateSettings
   * @type {Object}
   */
  'imports': {

    /**
     * A reference to the `lodash` function.
     *
     * @memberOf _.templateSettings.imports
     * @type {Function}
     */
    '_': { 'escape': escape }
  }
};

/** Error message constants. */
var INVALID_TEMPL_VAR_ERROR_TEXT = 'Invalid `variable` option passed into `_.template`';

/** Used to match empty string literals in compiled template source. */
var reEmptyStringLeading = /\b__p \+= '';/g,
    reEmptyStringMiddle = /\b(__p \+=) '' \+/g,
    reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;

/**
 * Used to validate the `validate` option in `_.template` variable.
 *
 * Forbids characters which could potentially change the meaning of the function argument definition:
 * - "()," (modification of function parameters)
 * - "=" (default value)
 * - "[]{}" (destructuring of function parameters)
 * - "/" (beginning of a comment)
 * - whitespace
 */
var reForbiddenIdentifierChars = /[()=,{}\[\]\/\s]/;

/**
 * Used to match
 * [ES template delimiters](http://ecma-international.org/ecma-262/7.0/#sec-template-literal-lexical-components).
 */
var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

/** Used to ensure capturing order of template delimiters. */
var reNoMatch = /($^)/;

/** Used to match unescaped characters in compiled string literals. */
var reUnescapedString = /['\n\r\u2028\u2029\\]/g;

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Creates a compiled template function that can interpolate data properties
 * in "interpolate" delimiters, HTML-escape interpolated data properties in
 * "escape" delimiters, and execute JavaScript in "evaluate" delimiters. Data
 * properties may be accessed as free variables in the template. If a setting
 * object is given, it takes precedence over `_.templateSettings` values.
 *
 * **Note:** In the development build `_.template` utilizes
 * [sourceURLs](http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl)
 * for easier debugging.
 *
 * For more information on precompiling templates see
 * [lodash's custom builds documentation](https://lodash.com/custom-builds).
 *
 * For more information on Chrome extension sandboxes see
 * [Chrome's extensions documentation](https://developer.chrome.com/extensions/sandboxingEval).
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category String
 * @param {string} [string=''] The template string.
 * @param {Object} [options={}] The options object.
 * @param {RegExp} [options.escape=_.templateSettings.escape]
 *  The HTML "escape" delimiter.
 * @param {RegExp} [options.evaluate=_.templateSettings.evaluate]
 *  The "evaluate" delimiter.
 * @param {Object} [options.imports=_.templateSettings.imports]
 *  An object to import into the template as free variables.
 * @param {RegExp} [options.interpolate=_.templateSettings.interpolate]
 *  The "interpolate" delimiter.
 * @param {string} [options.sourceURL='templateSources[n]']
 *  The sourceURL of the compiled template.
 * @param {string} [options.variable='obj']
 *  The data object variable name.
 * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
 * @returns {Function} Returns the compiled template function.
 * @example
 *
 * // Use the "interpolate" delimiter to create a compiled template.
 * var compiled = _.template('hello <%= user %>!');
 * compiled({ 'user': 'fred' });
 * // => 'hello fred!'
 *
 * // Use the HTML "escape" delimiter to escape data property values.
 * var compiled = _.template('<b><%- value %></b>');
 * compiled({ 'value': '<script>' });
 * // => '<b>&lt;script&gt;</b>'
 *
 * // Use the "evaluate" delimiter to execute JavaScript and generate HTML.
 * var compiled = _.template('<% _.forEach(users, function(user) { %><li><%- user %></li><% }); %>');
 * compiled({ 'users': ['fred', 'barney'] });
 * // => '<li>fred</li><li>barney</li>'
 *
 * // Use the internal `print` function in "evaluate" delimiters.
 * var compiled = _.template('<% print("hello " + user); %>!');
 * compiled({ 'user': 'barney' });
 * // => 'hello barney!'
 *
 * // Use the ES template literal delimiter as an "interpolate" delimiter.
 * // Disable support by replacing the "interpolate" delimiter.
 * var compiled = _.template('hello ${ user }!');
 * compiled({ 'user': 'pebbles' });
 * // => 'hello pebbles!'
 *
 * // Use backslashes to treat delimiters as plain text.
 * var compiled = _.template('<%= "\\<%- value %\\>" %>');
 * compiled({ 'value': 'ignored' });
 * // => '<%- value %>'
 *
 * // Use the `imports` option to import `jQuery` as `jq`.
 * var text = '<% jq.each(users, function(user) { %><li><%- user %></li><% }); %>';
 * var compiled = _.template(text, { 'imports': { 'jq': jQuery } });
 * compiled({ 'users': ['fred', 'barney'] });
 * // => '<li>fred</li><li>barney</li>'
 *
 * // Use the `sourceURL` option to specify a custom sourceURL for the template.
 * var compiled = _.template('hello <%= user %>!', { 'sourceURL': '/basic/greeting.jst' });
 * compiled(data);
 * // => Find the source of "greeting.jst" under the Sources tab or Resources panel of the web inspector.
 *
 * // Use the `variable` option to ensure a with-statement isn't used in the compiled template.
 * var compiled = _.template('hi <%= data.user %>!', { 'variable': 'data' });
 * compiled.source;
 * // => function(data) {
 * //   var __t, __p = '';
 * //   __p += 'hi ' + ((__t = ( data.user )) == null ? '' : __t) + '!';
 * //   return __p;
 * // }
 *
 * // Use custom template delimiters.
 * _.templateSettings.interpolate = /{{([\s\S]+?)}}/g;
 * var compiled = _.template('hello {{ user }}!');
 * compiled({ 'user': 'mustache' });
 * // => 'hello mustache!'
 *
 * // Use the `source` property to inline compiled templates for meaningful
 * // line numbers in error messages and stack traces.
 * fs.writeFileSync(path.join(process.cwd(), 'jst.js'), '\
 *   var JST = {\
 *     "main": ' + _.template(mainText).source + '\
 *   };\
 * ');
 */
function template(string, options, guard) {
  // Based on John Resig's `tmpl` implementation
  // (http://ejohn.org/blog/javascript-micro-templating/)
  // and Laura Doktorova's doT.js (https://github.com/olado/doT).
  var settings = templateSettings.imports._.templateSettings || templateSettings;
  string = toString(string);
  options = assignInWith({}, options, settings, customDefaultsAssignIn);

  var imports = assignInWith({}, options.imports, settings.imports, customDefaultsAssignIn),
      importsKeys = keys(imports),
      importsValues = baseValues(imports, importsKeys);

  var isEscaping,
      isEvaluating,
      index = 0,
      interpolate = options.interpolate || reNoMatch,
      source = "__p += '";

  // Compile the regexp to match each delimiter.
  var reDelimiters = RegExp(
    (options.escape || reNoMatch).source + '|' +
    interpolate.source + '|' +
    (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + '|' +
    (options.evaluate || reNoMatch).source + '|$'
  , 'g');

  // Use a sourceURL for easier debugging.
  // The sourceURL gets injected into the source that's eval-ed, so be careful
  // to normalize all kinds of whitespace, so e.g. newlines (and unicode versions of it) can't sneak in
  // and escape the comment, thus injecting code that gets evaled.
  var sourceURL = hasOwnProperty.call(options, 'sourceURL')
    ? ('//# sourceURL=' +
       (options.sourceURL + '').replace(/\s/g, ' ') +
       '\n')
    : '';

  string.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
    interpolateValue || (interpolateValue = esTemplateValue);

    // Escape characters that can't be included in string literals.
    source += string.slice(index, offset).replace(reUnescapedString, escapeStringChar);

    // Replace delimiters with snippets.
    if (escapeValue) {
      isEscaping = true;
      source += "' +\n__e(" + escapeValue + ") +\n'";
    }
    if (evaluateValue) {
      isEvaluating = true;
      source += "';\n" + evaluateValue + ";\n__p += '";
    }
    if (interpolateValue) {
      source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
    }
    index = offset + match.length;

    // The JS engine embedded in Adobe products needs `match` returned in
    // order to produce the correct `offset` value.
    return match;
  });

  source += "';\n";

  // If `variable` is not specified wrap a with-statement around the generated
  // code to add the data object to the top of the scope chain.
  var variable = hasOwnProperty.call(options, 'variable') && options.variable;
  if (!variable) {
    source = 'with (obj) {\n' + source + '\n}\n';
  }
  // Throw an error if a forbidden character was found in `variable`, to prevent
  // potential command injection attacks.
  else if (reForbiddenIdentifierChars.test(variable)) {
    throw new Error(INVALID_TEMPL_VAR_ERROR_TEXT);
  }

  // Cleanup code by stripping empty strings.
  source = (isEvaluating ? source.replace(reEmptyStringLeading, '') : source)
    .replace(reEmptyStringMiddle, '$1')
    .replace(reEmptyStringTrailing, '$1;');

  // Frame code as the function body.
  source = 'function(' + (variable || 'obj') + ') {\n' +
    (variable
      ? ''
      : 'obj || (obj = {});\n'
    ) +
    "var __t, __p = ''" +
    (isEscaping
       ? ', __e = _.escape'
       : ''
    ) +
    (isEvaluating
      ? ', __j = Array.prototype.join;\n' +
        "function print() { __p += __j.call(arguments, '') }\n"
      : ';\n'
    ) +
    source +
    'return __p\n}';

  var result = attempt(function() {
    return Function(importsKeys, sourceURL + 'return ' + source)
      .apply(undefined, importsValues);
  });

  // Provide the compiled function's source by its `toString` method or
  // the `source` property as a convenience for inlining compiled templates.
  result.source = source;
  if (isError(result)) {
    throw result;
  }
  return result;
}

function toArray(value) {
  return Array.isArray(value) ? value : [value];
}
function filterInPlace(array, predicate) {
  for (let i = array.length; i--; i >= 0) {
    if (!predicate(array[i], i, array)) {
      array.splice(i, 1);
    }
  }
  return array;
}
const MODE_RE = /\.(server|client)(\.\w+)*$/;
const distDirURL = new URL(".", import.meta.url);

async function compileTemplate(template$1, ctx) {
  const data = { ...ctx, options: template$1.options };
  if (template$1.src) {
    try {
      const srcContents = await promises.readFile(template$1.src, "utf-8");
      return template(srcContents, {})(data);
    } catch (err) {
      logger.error("Error compiling template: ", template$1);
      throw err;
    }
  }
  if (template$1.getContents) {
    return template$1.getContents(data);
  }
  throw new Error("Invalid template: " + JSON.stringify(template$1));
}
const serialize = (data) => JSON.stringify(data, null, 2).replace(/"\{(.+)\}"(?=,?$)/gm, (r) => JSON.parse(r).replace(/^\{(.*)\}$/, "$1"));
const importSources = (sources, { lazy = false } = {}) => {
  return toArray(sources).map((src) => {
    const safeVariableName = genSafeVariableName(src);
    if (lazy) {
      return `const ${safeVariableName} = ${genDynamicImport(src, { comment: `webpackChunkName: ${JSON.stringify(src)}` })}`;
    }
    return genImport(src, safeVariableName);
  }).join("\n");
};
const importName = genSafeVariableName;
const templateUtils = { serialize, importName, importSources };

function defineNuxtModule(definition) {
  if (definition) {
    return _defineNuxtModule(definition);
  }
  return {
    with: (definition2) => _defineNuxtModule(definition2)
  };
}
function _defineNuxtModule(definition) {
  if (typeof definition === "function") {
    return _defineNuxtModule({ setup: definition });
  }
  const module = defu(definition, { meta: {} });
  module.meta.configKey ||= module.meta.name;
  async function getOptions(inlineOptions, nuxt = useNuxt()) {
    const nuxtConfigOptionsKey = module.meta.configKey || module.meta.name;
    const nuxtConfigOptions = nuxtConfigOptionsKey && nuxtConfigOptionsKey in nuxt.options ? nuxt.options[nuxtConfigOptionsKey] : {};
    const optionsDefaults = module.defaults instanceof Function ? await module.defaults(nuxt) : module.defaults ?? {};
    let options = defu(inlineOptions, nuxtConfigOptions, optionsDefaults);
    if (module.schema) {
      options = await applyDefaults(module.schema, options);
    }
    return Promise.resolve(options);
  }
  async function normalizedModule(inlineOptions, nuxt) {
    nuxt ||= tryUseNuxt() || this.nuxt;
    const uniqueKey = module.meta.name || module.meta.configKey;
    if (uniqueKey) {
      nuxt.options._requiredModules ||= {};
      if (nuxt.options._requiredModules[uniqueKey]) {
        return false;
      }
      nuxt.options._requiredModules[uniqueKey] = true;
    }
    if (module.meta.compatibility) {
      const issues = await checkNuxtCompatibility(module.meta.compatibility, nuxt);
      if (issues.length) {
        logger.warn(`Module \`${module.meta.name}\` is disabled due to incompatibility issues:
${issues.toString()}`);
        return;
      }
    }
    nuxt2Shims(nuxt);
    const _options = await getOptions(inlineOptions, nuxt);
    if (module.hooks) {
      nuxt.hooks.addHooks(module.hooks);
    }
    const start = performance.now();
    const res = await module.setup?.call(null, _options, nuxt) ?? {};
    const perf = performance.now() - start;
    const setupTime = Math.round(perf * 100) / 100;
    if (setupTime > 5e3 && uniqueKey !== "@nuxt/telemetry") {
      logger.warn(`Slow module \`${uniqueKey || "<no name>"}\` took \`${setupTime}ms\` to setup.`);
    } else if (nuxt.options.debug && nuxt.options.debug.modules) {
      logger.info(`Module \`${uniqueKey || "<no name>"}\` took \`${setupTime}ms\` to setup.`);
    }
    if (res === false) {
      return false;
    }
    return defu(res, {
      timings: {
        setup: setupTime
      }
    });
  }
  normalizedModule.getMeta = () => Promise.resolve(module.meta);
  normalizedModule.getOptions = getOptions;
  return normalizedModule;
}
const NUXT2_SHIMS_KEY = "__nuxt2_shims_key__";
function nuxt2Shims(nuxt) {
  if (!isNuxt2(nuxt) || nuxt[NUXT2_SHIMS_KEY]) {
    return;
  }
  nuxt[NUXT2_SHIMS_KEY] = true;
  nuxt.hooks = nuxt;
  if (!nuxtCtx.tryUse()) {
    nuxtCtx.set(nuxt);
    nuxt.hook("close", () => nuxtCtx.unset());
  }
  let virtualTemplates;
  nuxt.hook("builder:prepared", (_builder, buildOptions) => {
    virtualTemplates = buildOptions.templates.filter((t) => t.getContents);
    for (const template of virtualTemplates) {
      buildOptions.templates.splice(buildOptions.templates.indexOf(template), 1);
    }
  });
  nuxt.hook("build:templates", async (templates) => {
    const context = {
      nuxt,
      utils: templateUtils,
      app: {
        dir: nuxt.options.srcDir,
        extensions: nuxt.options.extensions,
        plugins: nuxt.options.plugins,
        templates: [
          ...templates.templatesFiles,
          ...virtualTemplates
        ],
        templateVars: templates.templateVars
      }
    };
    for await (const template of virtualTemplates) {
      const contents = await compileTemplate({ ...template, src: "" }, context);
      await promises.mkdir(dirname(template.dst), { recursive: true });
      await promises.writeFile(template.dst, contents);
    }
  });
}

function directoryToURL(dir) {
  return pathToFileURL(dir + "/");
}
function tryResolveModule(id, url = import.meta.url) {
  return Promise.resolve(resolveModulePath(id, {
    from: url,
    suffixes: ["", "index"],
    try: true
  }));
}
function resolveModule(id, options) {
  return resolveModulePath(id, {
    from: options?.url ?? options?.paths ?? [import.meta.url],
    extensions: [".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"]
  });
}
async function importModule(id, opts) {
  const resolvedPath = resolveModule(id, opts);
  return await import(pathToFileURL(resolvedPath).href).then((r) => opts?.interopDefault !== false ? interopDefault(r) : r);
}
function tryImportModule(id, opts) {
  try {
    return importModule(id, opts).catch(() => void 0);
  } catch {
  }
}
const warnings = /* @__PURE__ */ new Set();
function requireModule(id, opts) {
  if (!warnings.has(id)) {
    console.warn("[@nuxt/kit] `requireModule` is deprecated. Please use `importModule` instead.");
    warnings.add(id);
  }
  const resolvedPath = resolveModule(id, opts);
  const jiti = createJiti(import.meta.url, {
    interopDefault: opts?.interopDefault !== false
  });
  return jiti(pathToFileURL(resolvedPath).href);
}
function tryRequireModule(id, opts) {
  try {
    return requireModule(id, opts);
  } catch {
  }
}

function createIsIgnored(nuxt = tryUseNuxt()) {
  return (pathname, stats) => isIgnored(pathname, stats, nuxt);
}
function isIgnored(pathname, _stats, nuxt = tryUseNuxt()) {
  if (!nuxt) {
    return false;
  }
  if (!nuxt._ignore) {
    nuxt._ignore = ignore(nuxt.options.ignoreOptions);
    nuxt._ignore.add(resolveIgnorePatterns());
  }
  const cwds = nuxt.options._layers?.map((layer2) => layer2.cwd).sort((a, b) => b.length - a.length);
  const layer = cwds?.find((cwd) => pathname.startsWith(cwd));
  const relativePath = relative(layer ?? nuxt.options.rootDir, pathname);
  if (relativePath[0] === "." && relativePath[1] === ".") {
    return false;
  }
  return !!(relativePath && nuxt._ignore.ignores(relativePath));
}
const NEGATION_RE = /^(!?)(.*)$/;
function resolveIgnorePatterns(relativePath) {
  const nuxt = tryUseNuxt();
  if (!nuxt) {
    return [];
  }
  const ignorePatterns = nuxt.options.ignore.flatMap((s) => resolveGroupSyntax(s));
  const nuxtignoreFile = join(nuxt.options.rootDir, ".nuxtignore");
  if (existsSync(nuxtignoreFile)) {
    const contents = readFileSync(nuxtignoreFile, "utf-8");
    ignorePatterns.push(...contents.trim().split(/\r?\n/));
  }
  if (relativePath) {
    return ignorePatterns.map((p) => {
      const [_, negation = "", pattern] = p.match(NEGATION_RE) || [];
      if (pattern && pattern[0] === "*") {
        return p;
      }
      return negation + relative(relativePath, resolve(nuxt.options.rootDir, pattern || p));
    });
  }
  return ignorePatterns;
}
function resolveGroupSyntax(group) {
  let groups = [group];
  while (groups.some((group2) => group2.includes("{"))) {
    groups = groups.flatMap((group2) => {
      const [head, ...tail] = group2.split("{");
      if (tail.length) {
        const [body = "", ...rest] = tail.join("{").split("}");
        return body.split(",").map((part) => `${head}${part}${rest.join("")}`);
      }
      return group2;
    });
  }
  return groups;
}

async function resolvePath(path, opts = {}) {
  const res = await _resolvePathGranularly(path, opts);
  if (res.type === "file") {
    return res.path;
  }
  return opts.fallbackToOriginal ? path : res.path;
}
async function findPath(paths, opts, pathType = "file") {
  for (const path of toArray(paths)) {
    const res = await _resolvePathGranularly(path, opts);
    if (!res.type || pathType && res.type !== pathType) {
      continue;
    }
    if (res.virtual || await existsSensitive(res.path)) {
      return res.path;
    }
  }
  return null;
}
function resolveAlias(path, alias) {
  alias ||= tryUseNuxt()?.options.alias || {};
  return resolveAlias$1(path, alias);
}
function createResolver(base) {
  if (!base) {
    throw new Error("`base` argument is missing for createResolver(base)!");
  }
  base = base.toString();
  if (base.startsWith("file://")) {
    base = dirname(fileURLToPath(base));
  }
  return {
    resolve: (...path) => resolve(base, ...path),
    resolvePath: (path, opts) => resolvePath(path, { cwd: base, ...opts })
  };
}
async function resolveNuxtModule(base, paths) {
  const resolved = [];
  const resolver = createResolver(base);
  for (const path of paths) {
    if (path.startsWith(base)) {
      resolved.push(path.split("/index.ts")[0]);
    } else {
      const resolvedPath = await resolver.resolvePath(path);
      resolved.push(resolvedPath.slice(0, resolvedPath.lastIndexOf(path) + path.length));
    }
  }
  return resolved;
}
async function _resolvePathType(path, opts = {}, skipFs = false) {
  if (opts?.virtual && existsInVFS(path)) {
    return {
      path,
      type: "file",
      virtual: true
    };
  }
  if (skipFs) {
    return;
  }
  const fd = await promises.open(path, "r").catch(() => null);
  try {
    const stats = await fd?.stat();
    if (stats) {
      return {
        path,
        type: stats.isFile() ? "file" : "dir",
        virtual: false
      };
    }
  } finally {
    fd?.close();
  }
}
async function _resolvePathGranularly(path, opts = {}) {
  const _path = path;
  path = normalize(path);
  if (isAbsolute(path)) {
    const res2 = await _resolvePathType(path, opts);
    if (res2 && res2.type === "file") {
      return res2;
    }
  }
  const nuxt = tryUseNuxt();
  const cwd = opts.cwd || (nuxt ? nuxt.options.rootDir : process.cwd());
  const extensions = opts.extensions || (nuxt ? nuxt.options.extensions : [".ts", ".mjs", ".cjs", ".json"]);
  const modulesDir = nuxt ? nuxt.options.modulesDir : [];
  path = resolveAlias$1(path, opts.alias ?? nuxt?.options.alias ?? {});
  if (!isAbsolute(path)) {
    path = resolve(cwd, path);
  }
  const res = await _resolvePathType(path, opts);
  if (res && res.type === "file") {
    return res;
  }
  for (const ext of extensions) {
    const extPath = await _resolvePathType(path + ext, opts);
    if (extPath && extPath.type === "file") {
      return extPath;
    }
    const indexPath = await _resolvePathType(
      join(path, "index" + ext),
      opts,
      res?.type !== "dir"
      /* skip checking if parent is not a directory */
    );
    if (indexPath && indexPath.type === "file") {
      return indexPath;
    }
  }
  const resolvedModulePath = resolveModulePath(_path, {
    try: true,
    suffixes: ["", "index"],
    from: [cwd, ...modulesDir].map((d) => directoryToURL(d))
  });
  if (resolvedModulePath) {
    return {
      path: resolvedModulePath,
      type: "file",
      virtual: false
    };
  }
  return {
    path
  };
}
async function existsSensitive(path) {
  const dirFiles = await promises.readdir(dirname(path)).catch(() => null);
  return dirFiles && dirFiles.includes(basename(path));
}
function existsInVFS(path, nuxt = tryUseNuxt()) {
  if (!nuxt) {
    return false;
  }
  if (path in nuxt.vfs) {
    return true;
  }
  const templates = nuxt.apps.default?.templates ?? nuxt.options.build.templates;
  return templates.some((template) => template.dst === path);
}
async function resolveFiles(path, pattern, opts = {}) {
  const files = [];
  for (const file of await globby(pattern, { cwd: path, followSymbolicLinks: opts.followSymbolicLinks ?? true })) {
    const p = resolve(path, file);
    if (!isIgnored(p)) {
      files.push(p);
    }
  }
  return files.sort();
}

const NODE_MODULES_RE = /[/\\]node_modules[/\\]/;
async function installModule(moduleToInstall, inlineOptions, nuxt = useNuxt()) {
  const { nuxtModule, buildTimeModuleMeta, resolvedModulePath } = await loadNuxtModuleInstance(moduleToInstall, nuxt);
  const localLayerModuleDirs = [];
  for (const l of nuxt.options._layers) {
    const srcDir = l.config.srcDir || l.cwd;
    if (!NODE_MODULES_RE.test(srcDir)) {
      localLayerModuleDirs.push(resolve(srcDir, l.config?.dir?.modules || "modules").replace(/\/?$/, "/"));
    }
  }
  const res = (isNuxt2() ? await nuxtModule.call(nuxt.moduleContainer, inlineOptions, nuxt) : nuxt.options.experimental?.debugModuleMutation && nuxt._asyncLocalStorageModule ? await nuxt._asyncLocalStorageModule.run(nuxtModule, () => nuxtModule(inlineOptions || {}, nuxt)) : await nuxtModule(inlineOptions || {}, nuxt)) ?? {};
  if (res === false) {
    return;
  }
  const modulePath = resolvedModulePath || moduleToInstall;
  if (typeof modulePath === "string") {
    const parsed = parseNodeModulePath(modulePath);
    const moduleRoot = parsed.dir ? parsed.dir + parsed.name : modulePath;
    nuxt.options.build.transpile.push(normalizeModuleTranspilePath(moduleRoot));
    const directory = (parsed.dir ? moduleRoot : getDirectory(modulePath)).replace(/\/?$/, "/");
    if (directory !== moduleToInstall && !localLayerModuleDirs.some((dir) => directory.startsWith(dir))) {
      nuxt.options.modulesDir.push(resolve(directory, "node_modules"));
    }
  }
  nuxt.options._installedModules ||= [];
  const entryPath = typeof moduleToInstall === "string" ? resolveAlias(moduleToInstall) : void 0;
  if (typeof moduleToInstall === "string" && entryPath !== moduleToInstall) {
    buildTimeModuleMeta.rawPath = moduleToInstall;
  }
  nuxt.options._installedModules.push({
    meta: defu(await nuxtModule.getMeta?.(), buildTimeModuleMeta),
    module: nuxtModule,
    timings: res.timings,
    entryPath
  });
}
function getDirectory(p) {
  try {
    return isAbsolute(p) && lstatSync(p).isFile() ? dirname(p) : p;
  } catch {
  }
  return p;
}
const normalizeModuleTranspilePath = (p) => {
  return getDirectory(p).split("node_modules/").pop();
};
const MissingModuleMatcher = /Cannot find module\s+['"]?([^'")\s]+)['"]?/i;
async function loadNuxtModuleInstance(nuxtModule, nuxt = useNuxt()) {
  let buildTimeModuleMeta = {};
  if (typeof nuxtModule === "function") {
    return {
      nuxtModule,
      buildTimeModuleMeta
    };
  }
  if (typeof nuxtModule !== "string") {
    throw new TypeError(`Nuxt module should be a function or a string to import. Received: ${nuxtModule}.`);
  }
  const jiti = createJiti(nuxt.options.rootDir, { alias: nuxt.options.alias });
  nuxtModule = resolveAlias(nuxtModule, nuxt.options.alias);
  if (isRelative(nuxtModule)) {
    nuxtModule = resolve(nuxt.options.rootDir, nuxtModule);
  }
  try {
    const src = resolveModuleURL(nuxtModule, {
      from: nuxt.options.modulesDir.map((m) => directoryToURL(m.replace(/\/node_modules\/?$/, "/"))),
      suffixes: ["nuxt", "nuxt/index", "module", "module/index", "", "index"],
      extensions: [".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"]
    });
    const resolvedModulePath = fileURLToPath(src);
    const resolvedNuxtModule = await jiti.import(src, { default: true });
    if (typeof resolvedNuxtModule !== "function") {
      throw new TypeError(`Nuxt module should be a function: ${nuxtModule}.`);
    }
    const moduleMetadataPath = new URL("module.json", src);
    if (existsSync(moduleMetadataPath)) {
      buildTimeModuleMeta = JSON.parse(await promises.readFile(moduleMetadataPath, "utf-8"));
    }
    return { nuxtModule: resolvedNuxtModule, buildTimeModuleMeta, resolvedModulePath };
  } catch (error) {
    const code = error.code;
    if (code === "ERR_PACKAGE_PATH_NOT_EXPORTED" || code === "ERR_UNSUPPORTED_DIR_IMPORT" || code === "ENOTDIR") {
      throw new TypeError(`Could not load \`${nuxtModule}\`. Is it installed?`);
    }
    if (code === "MODULE_NOT_FOUND" || code === "ERR_MODULE_NOT_FOUND") {
      const module = MissingModuleMatcher.exec(error.message)?.[1];
      if (module && !module.includes(nuxtModule)) {
        throw new TypeError(`Error while importing module \`${nuxtModule}\`: ${error}`);
      }
    }
  }
  throw new TypeError(`Could not load \`${nuxtModule}\`. Is it installed?`);
}

function resolveNuxtModuleEntryName(m) {
  if (typeof m === "object" && !Array.isArray(m)) {
    return m.name;
  }
  if (Array.isArray(m)) {
    return resolveNuxtModuleEntryName(m[0]);
  }
  return m || false;
}
function hasNuxtModule(moduleName, nuxt = useNuxt()) {
  return nuxt.options._installedModules.some(({ meta }) => meta.name === moduleName) || // check modules to be installed
  nuxt.options.modules.some((m) => moduleName === resolveNuxtModuleEntryName(m));
}
async function hasNuxtModuleCompatibility(module, semverVersion, nuxt = useNuxt()) {
  const version = await getNuxtModuleVersion(module, nuxt);
  if (!version) {
    return false;
  }
  return satisfies(normalizeSemanticVersion(version), semverVersion, {
    includePrerelease: true
  });
}
async function getNuxtModuleVersion(module, nuxt = useNuxt()) {
  const moduleMeta = (typeof module === "string" ? { name: module } : await module.getMeta?.()) || {};
  if (moduleMeta.version) {
    return moduleMeta.version;
  }
  if (!moduleMeta.name) {
    return false;
  }
  for (const m of nuxt.options._installedModules) {
    if (m.meta.name === moduleMeta.name && m.meta.version) {
      return m.meta.version;
    }
  }
  if (hasNuxtModule(moduleMeta.name)) {
    const { nuxtModule, buildTimeModuleMeta } = await loadNuxtModuleInstance(moduleMeta.name, nuxt);
    return buildTimeModuleMeta.version || await nuxtModule.getMeta?.().then((r) => r.version) || false;
  }
  return false;
}

async function loadNuxtConfig(opts) {
  const localLayers = await globby("layers/*", { onlyDirectories: true, cwd: opts.cwd || process.cwd() });
  opts.overrides = defu$1(opts.overrides, { _extends: localLayers });
  globalThis.defineNuxtConfig = (c) => c;
  const { configFile, layers = [], cwd, config: nuxtConfig, meta } = await loadConfig({
    name: "nuxt",
    configFile: "nuxt.config",
    rcFile: ".nuxtrc",
    extend: { extendKey: ["theme", "extends", "_extends"] },
    dotenv: true,
    globalRc: true,
    ...opts
  });
  delete globalThis.defineNuxtConfig;
  nuxtConfig.rootDir ||= cwd;
  nuxtConfig._nuxtConfigFile = configFile;
  nuxtConfig._nuxtConfigFiles = [configFile];
  nuxtConfig.alias ||= {};
  if (meta?.name) {
    const alias = `#layers/${meta.name}`;
    nuxtConfig.alias[alias] ||= nuxtConfig.rootDir;
  }
  const defaultBuildDir = join(nuxtConfig.rootDir, ".nuxt");
  if (!opts.overrides?._prepare && !nuxtConfig.dev && !nuxtConfig.buildDir && nuxtConfig.future?.compatibilityVersion === 4 && existsSync(defaultBuildDir)) {
    nuxtConfig.buildDir = join(nuxtConfig.rootDir, "node_modules/.cache/nuxt/.nuxt");
  }
  const NuxtConfigSchema = await loadNuxtSchema(nuxtConfig.rootDir || cwd || process.cwd());
  const layerSchemaKeys = ["future", "srcDir", "rootDir", "serverDir", "dir"];
  const layerSchema = /* @__PURE__ */ Object.create(null);
  for (const key of layerSchemaKeys) {
    if (key in NuxtConfigSchema) {
      layerSchema[key] = NuxtConfigSchema[key];
    }
  }
  const _layers = [];
  const processedLayers = /* @__PURE__ */ new Set();
  for (const layer of layers) {
    layer.config ||= {};
    layer.config.rootDir ??= layer.cwd;
    if (processedLayers.has(layer.config.rootDir)) {
      continue;
    }
    processedLayers.add(layer.config.rootDir);
    layer.config = await applyDefaults(layerSchema, layer.config);
    if (!layer.configFile || layer.configFile.endsWith(".nuxtrc")) {
      continue;
    }
    if (layer.cwd && cwd && localLayers.includes(relative(cwd, layer.cwd))) {
      layer.meta ||= {};
      layer.meta.name ||= basename(layer.cwd);
    }
    if (layer.meta?.name) {
      const alias = `#layers/${layer.meta.name}`;
      nuxtConfig.alias[alias] ||= layer.config.rootDir || layer.cwd;
    }
    _layers.push(layer);
  }
  nuxtConfig._layers = _layers;
  if (!_layers.length) {
    _layers.push({
      cwd,
      config: {
        rootDir: cwd,
        srcDir: cwd
      }
    });
  }
  return await applyDefaults(NuxtConfigSchema, nuxtConfig);
}
async function loadNuxtSchema(cwd) {
  const url = directoryToURL(cwd);
  const urls = [url];
  const nuxtPath = resolveModuleURL("nuxt", { try: true, from: url }) ?? resolveModuleURL("nuxt-nightly", { try: true, from: url });
  if (nuxtPath) {
    urls.unshift(pathToFileURL(nuxtPath));
  }
  const schemaPath = resolveModuleURL("@nuxt/schema", { try: true, from: urls }) ?? "@nuxt/schema";
  return await import(schemaPath).then((r) => r.NuxtConfigSchema);
}

function extendNuxtSchema(def) {
  const nuxt = useNuxt();
  nuxt.hook("schema:extend", (schemas) => {
    schemas.push(typeof def === "function" ? def() : def);
  });
}

async function loadNuxt(opts) {
  opts.cwd ||= opts.rootDir;
  opts.overrides ||= opts.config || {};
  opts.overrides.dev = !!opts.dev;
  const resolvedPath = ["nuxt-nightly", "nuxt3", "nuxt", "nuxt-edge"].map((pkg2) => resolveModulePath(pkg2, { try: true, from: [directoryToURL(opts.cwd)] })).filter((p) => !!p).sort((a, b) => b.length - a.length)[0];
  if (!resolvedPath) {
    throw new Error(`Cannot find any nuxt version from ${opts.cwd}`);
  }
  const pkg = await readPackageJSON(resolvedPath);
  const majorVersion = pkg.version ? Number.parseInt(pkg.version.split(".")[0]) : "";
  if (majorVersion && majorVersion >= 3) {
    const { loadNuxt: loadNuxt3 } = await import(pathToFileURL(resolvedPath).href).then((r) => interopDefault(r));
    const nuxt2 = await loadNuxt3(opts);
    return nuxt2;
  }
  const rootURL = directoryToURL(opts.cwd);
  const { loadNuxt: loadNuxt2 } = await tryImportModule("nuxt-edge", { url: rootURL }) || await importModule("nuxt", { url: rootURL });
  const nuxt = await loadNuxt2({
    rootDir: opts.cwd,
    for: opts.dev ? "dev" : "build",
    configOverrides: opts.overrides,
    ready: opts.ready,
    envConfig: opts.dotenv
    // TODO: Backward format conversion
  });
  nuxt.removeHook ||= nuxt.clearHook.bind(nuxt);
  nuxt.removeAllHooks ||= nuxt.clearHooks.bind(nuxt);
  nuxt.hookOnce ||= (name, fn, ...hookArgs) => {
    const unsub = nuxt.hook(name, (...args) => {
      unsub();
      return fn(...args);
    }, ...hookArgs);
    return unsub;
  };
  nuxt.hooks ||= nuxt;
  return nuxt;
}
async function buildNuxt(nuxt) {
  const rootURL = directoryToURL(nuxt.options.rootDir);
  if (nuxt.options._majorVersion === 3) {
    const { build: build2 } = await tryImportModule("nuxt-nightly", { url: rootURL }) || await tryImportModule("nuxt3", { url: rootURL }) || await importModule("nuxt", { url: rootURL });
    return runWithNuxtContext(nuxt, () => build2(nuxt));
  }
  const { build } = await tryImportModule("nuxt-edge", { url: rootURL }) || await importModule("nuxt", { url: rootURL });
  return runWithNuxtContext(nuxt, () => build(nuxt));
}

function addImports(imports) {
  assertNuxtCompatibility({ bridge: true });
  useNuxt().hook("imports:extend", (_imports) => {
    _imports.push(...toArray(imports));
  });
}
function addImportsDir(dirs, opts = {}) {
  assertNuxtCompatibility({ bridge: true });
  useNuxt().hook("imports:dirs", (_dirs) => {
    for (const dir of toArray(dirs)) {
      _dirs[opts.prepend ? "unshift" : "push"](dir);
    }
  });
}
function addImportsSources(presets) {
  assertNuxtCompatibility({ bridge: true });
  useNuxt().hook("imports:sources", (_presets) => {
    for (const preset of toArray(presets)) {
      _presets.push(preset);
    }
  });
}

const HANDLER_METHOD_RE = /\.(get|head|patch|post|put|delete|connect|options|trace)(\.\w+)*$/;
function normalizeHandlerMethod(handler) {
  const [, method = void 0] = handler.handler.match(HANDLER_METHOD_RE) || [];
  return {
    method,
    ...handler,
    handler: normalize(handler.handler)
  };
}
function addServerHandler(handler) {
  useNuxt().options.serverHandlers.push(normalizeHandlerMethod(handler));
}
function addDevServerHandler(handler) {
  useNuxt().options.devServerHandlers.push(handler);
}
function addServerPlugin(plugin) {
  const nuxt = useNuxt();
  nuxt.options.nitro.plugins ||= [];
  nuxt.options.nitro.plugins.push(normalize(plugin));
}
function addPrerenderRoutes(routes) {
  const nuxt = useNuxt();
  routes = toArray(routes).filter(Boolean);
  if (!routes.length) {
    return;
  }
  nuxt.hook("prerender:routes", (ctx) => {
    for (const route of routes) {
      ctx.routes.add(route);
    }
  });
}
function useNitro() {
  const nuxt = useNuxt();
  if (!nuxt._nitro) {
    throw new Error("Nitro is not initialized yet. You can call `useNitro()` only after `ready` hook.");
  }
  return nuxt._nitro;
}
function addServerImports(imports) {
  const nuxt = useNuxt();
  nuxt.hook("nitro:config", (config) => {
    config.imports ||= {};
    config.imports.imports ||= [];
    config.imports.imports.push(...imports);
  });
}
function addServerImportsDir(dirs, opts = {}) {
  const nuxt = useNuxt();
  const _dirs = toArray(dirs);
  nuxt.hook("nitro:config", (config) => {
    config.imports ||= {};
    config.imports.dirs ||= [];
    config.imports.dirs[opts.prepend ? "unshift" : "push"](..._dirs);
  });
}
function addServerScanDir(dirs, opts = {}) {
  const nuxt = useNuxt();
  nuxt.hook("nitro:config", (config) => {
    config.scanDirs ||= [];
    for (const dir of toArray(dirs)) {
      config.scanDirs[opts.prepend ? "unshift" : "push"](dir);
    }
  });
}

function useRuntimeConfig() {
  const nuxt = useNuxt();
  return applyEnv(klona(nuxt.options.nitro.runtimeConfig), {
    prefix: "NITRO_",
    altPrefix: "NUXT_",
    envExpansion: nuxt.options.nitro.experimental?.envExpansion ?? !!process$1.env.NITRO_ENV_EXPANSION
  });
}
function updateRuntimeConfig(runtimeConfig) {
  const nuxt = useNuxt();
  Object.assign(nuxt.options.nitro.runtimeConfig, defu$1(runtimeConfig, nuxt.options.nitro.runtimeConfig));
  try {
    return useNitro().updateConfig({ runtimeConfig });
  } catch {
  }
}
function getEnv(key, opts, env = process$1.env) {
  const envKey = snakeCase(key).toUpperCase();
  return destr(
    env[opts.prefix + envKey] ?? env[opts.altPrefix + envKey]
  );
}
function _isObject(input) {
  return typeof input === "object" && !Array.isArray(input);
}
function applyEnv(obj, opts, parentKey = "") {
  for (const key in obj) {
    const subKey = parentKey ? `${parentKey}_${key}` : key;
    const envValue = getEnv(subKey, opts);
    if (_isObject(obj[key])) {
      if (_isObject(envValue)) {
        obj[key] = { ...obj[key], ...envValue };
        applyEnv(obj[key], opts, subKey);
      } else if (envValue === void 0) {
        applyEnv(obj[key], opts, subKey);
      } else {
        obj[key] = envValue ?? obj[key];
      }
    } else {
      obj[key] = envValue ?? obj[key];
    }
    if (opts.envExpansion && typeof obj[key] === "string") {
      obj[key] = _expandFromEnv(obj[key]);
    }
  }
  return obj;
}
const envExpandRx = /\{\{(.*?)\}\}/g;
function _expandFromEnv(value, env = process$1.env) {
  return value.replace(envExpandRx, (match, key) => {
    return env[key] || match;
  });
}

const extendWebpackCompatibleConfig = (builder) => (fn, options = {}) => {
  const nuxt = useNuxt();
  if (options.dev === false && nuxt.options.dev) {
    return;
  }
  if (options.build === false && nuxt.options.build) {
    return;
  }
  nuxt.hook(`${builder}:config`, (configs) => {
    if (options.server !== false) {
      const config = configs.find((i) => i.name === "server");
      if (config) {
        fn(config);
      }
    }
    if (options.client !== false) {
      const config = configs.find((i) => i.name === "client");
      if (config) {
        fn(config);
      }
    }
  });
};
const extendWebpackConfig = extendWebpackCompatibleConfig("webpack");
const extendRspackConfig = extendWebpackCompatibleConfig("rspack");
function extendViteConfig(fn, options = {}) {
  const nuxt = useNuxt();
  if (options.dev === false && nuxt.options.dev) {
    return;
  }
  if (options.build === false && nuxt.options.build) {
    return;
  }
  if (options.server !== false && options.client !== false) {
    return nuxt.hook("vite:extend", ({ config }) => fn(config));
  }
  nuxt.hook("vite:extendConfig", (config, { isClient, isServer }) => {
    if (options.server !== false && isServer) {
      return fn(config);
    }
    if (options.client !== false && isClient) {
      return fn(config);
    }
  });
}
function addWebpackPlugin(pluginOrGetter, options) {
  extendWebpackConfig((config) => {
    const method = options?.prepend ? "unshift" : "push";
    const plugin = typeof pluginOrGetter === "function" ? pluginOrGetter() : pluginOrGetter;
    config.plugins ||= [];
    config.plugins[method](...toArray(plugin));
  }, options);
}
function addRspackPlugin(pluginOrGetter, options) {
  extendRspackConfig((config) => {
    const method = options?.prepend ? "unshift" : "push";
    const plugin = typeof pluginOrGetter === "function" ? pluginOrGetter() : pluginOrGetter;
    config.plugins ||= [];
    config.plugins[method](...toArray(plugin));
  }, options);
}
function addVitePlugin(pluginOrGetter, options) {
  extendViteConfig((config) => {
    const method = options?.prepend ? "unshift" : "push";
    const plugin = typeof pluginOrGetter === "function" ? pluginOrGetter() : pluginOrGetter;
    config.plugins ||= [];
    config.plugins[method](...toArray(plugin));
  }, options);
}
function addBuildPlugin(pluginFactory, options) {
  if (pluginFactory.vite) {
    addVitePlugin(pluginFactory.vite, options);
  }
  if (pluginFactory.webpack) {
    addWebpackPlugin(pluginFactory.webpack, options);
  }
  if (pluginFactory.rspack) {
    addRspackPlugin(pluginFactory.rspack, options);
  }
}

function addComponentsDir(dir, opts = {}) {
  const nuxt = useNuxt();
  if (!checkNuxtVersion(">=2.13", nuxt)) {
    throw new Error(`\`addComponentsDir\` requires Nuxt 2.13 or higher.`);
  }
  nuxt.options.components ||= [];
  dir.priority ||= 0;
  nuxt.hook("components:dirs", (dirs) => {
    dirs[opts.prepend ? "unshift" : "push"](dir);
  });
}
function addComponent(opts) {
  const nuxt = useNuxt();
  if (!checkNuxtVersion(">=2.13", nuxt)) {
    throw new Error(`\`addComponent\` requires Nuxt 2.13 or higher.`);
  }
  nuxt.options.components ||= [];
  if (!opts.mode) {
    const [, mode = "all"] = opts.filePath.match(MODE_RE) || [];
    opts.mode = mode;
  }
  const component = {
    export: opts.export || "default",
    chunkName: "components/" + kebabCase(opts.name),
    global: opts.global ?? false,
    kebabName: kebabCase(opts.name || ""),
    pascalName: pascalCase(opts.name || ""),
    prefetch: false,
    preload: false,
    mode: "all",
    shortPath: opts.filePath,
    priority: 0,
    meta: {},
    ...opts
  };
  nuxt.hook("components:extend", (components) => {
    const existingComponentIndex = components.findIndex((c) => (c.pascalName === component.pascalName || c.kebabName === component.kebabName) && c.mode === component.mode);
    if (existingComponentIndex !== -1) {
      const existingComponent = components[existingComponentIndex];
      const existingPriority = existingComponent.priority ?? 0;
      const newPriority = component.priority ?? 0;
      if (newPriority < existingPriority) {
        return;
      }
      if (newPriority === existingPriority) {
        const name = existingComponent.pascalName || existingComponent.kebabName;
        logger.warn(`Overriding ${name} component. You can specify a \`priority\` option when calling \`addComponent\` to avoid this warning.`);
      }
      components.splice(existingComponentIndex, 1, component);
    } else {
      components.push(component);
    }
  });
}

function addTemplate(_template) {
  const nuxt = useNuxt();
  const template = normalizeTemplate(_template);
  filterInPlace(nuxt.options.build.templates, (p) => normalizeTemplate(p).dst !== template.dst);
  try {
    const distDir = distDirURL.toString();
    const { source } = captureStackTrace().find((e) => e.source && !e.source.startsWith(distDir)) ?? {};
    if (source) {
      const path = normalize(fileURLToPath(source));
      if (existsSync(path)) {
        template._path = path;
      }
    }
  } catch {
  }
  nuxt.options.build.templates.push(template);
  return template;
}
function addServerTemplate(template) {
  const nuxt = useNuxt();
  nuxt.options.nitro.virtual ||= {};
  nuxt.options.nitro.virtual[template.filename] = template.getContents;
  return template;
}
function addTypeTemplate(_template, context) {
  const nuxt = useNuxt();
  const template = addTemplate(_template);
  if (!template.filename.endsWith(".d.ts")) {
    throw new Error(`Invalid type template. Filename must end with .d.ts : "${template.filename}"`);
  }
  if (!context || context.nuxt) {
    nuxt.hook("prepare:types", ({ references }) => {
      references.push({ path: template.dst });
    });
  }
  if (context?.nitro) {
    nuxt.hook("nitro:prepare:types", ({ references }) => {
      references.push({ path: template.dst });
    });
  }
  return template;
}
function normalizeTemplate(template, buildDir) {
  if (!template) {
    throw new Error("Invalid template: " + JSON.stringify(template));
  }
  if (typeof template === "string") {
    template = { src: template };
  } else {
    template = { ...template };
  }
  if (template.src) {
    if (!existsSync(template.src)) {
      throw new Error("Template not found: " + template.src);
    }
    if (!template.filename) {
      const srcPath = parse(template.src);
      template.filename = template.fileName || `${basename(srcPath.dir)}.${srcPath.name}.${hash(template.src)}${srcPath.ext}`;
    }
  }
  if (!template.src && !template.getContents) {
    throw new Error("Invalid template. Either `getContents` or `src` should be provided: " + JSON.stringify(template));
  }
  if (!template.filename) {
    throw new Error("Invalid template. `filename` must be provided: " + JSON.stringify(template));
  }
  if (template.filename.endsWith(".d.ts")) {
    template.write = true;
  }
  template.dst ||= resolve(buildDir ?? useNuxt().options.buildDir, template.filename);
  return template;
}
async function updateTemplates(options) {
  return await tryUseNuxt()?.hooks.callHook("builder:generateApp", options);
}
const EXTENSION_RE = /\b(?:\.d\.[cm]?ts|\.\w+)$/g;
const excludedAlias = [/^@vue\/.*$/, /^#internal\/nuxt/];
async function _generateTypes(nuxt) {
  const rootDirWithSlash = withTrailingSlash(nuxt.options.rootDir);
  const relativeRootDir = relativeWithDot(nuxt.options.buildDir, nuxt.options.rootDir);
  const include = /* @__PURE__ */ new Set([
    "./nuxt.d.ts",
    join(relativeRootDir, ".config/nuxt.*"),
    join(relativeRootDir, "**/*")
  ]);
  if (nuxt.options.srcDir !== nuxt.options.rootDir) {
    include.add(join(relative(nuxt.options.buildDir, nuxt.options.srcDir), "**/*"));
  }
  if (nuxt.options.typescript.includeWorkspace && nuxt.options.workspaceDir !== nuxt.options.rootDir) {
    include.add(join(relative(nuxt.options.buildDir, nuxt.options.workspaceDir), "**/*"));
  }
  for (const layer of nuxt.options._layers) {
    const srcOrCwd = layer.config.srcDir ?? layer.cwd;
    if (!srcOrCwd.startsWith(rootDirWithSlash) || srcOrCwd.includes("node_modules")) {
      include.add(join(relative(nuxt.options.buildDir, srcOrCwd), "**/*"));
    }
  }
  const exclude = /* @__PURE__ */ new Set([
    // nitro generate output: https://github.com/nuxt/nuxt/blob/main/packages/nuxt/src/core/nitro.ts#L186
    relativeWithDot(nuxt.options.buildDir, resolve(nuxt.options.rootDir, "dist"))
  ]);
  for (const dir of nuxt.options.modulesDir) {
    exclude.add(relativeWithDot(nuxt.options.buildDir, dir));
  }
  const moduleEntryPaths = [];
  for (const m of nuxt.options._installedModules) {
    if (m.entryPath) {
      moduleEntryPaths.push(getDirectory(m.entryPath));
    }
  }
  const modulePaths = await resolveNuxtModule(rootDirWithSlash, moduleEntryPaths);
  for (const path of modulePaths) {
    const relative2 = relativeWithDot(nuxt.options.buildDir, path);
    include.add(join(relative2, "runtime"));
    exclude.add(join(relative2, "runtime/server"));
    include.add(join(relative2, "dist/runtime"));
    exclude.add(join(relative2, "dist/runtime/server"));
  }
  const isV4 = nuxt.options.future?.compatibilityVersion === 4;
  const nestedModulesDirs = [];
  for (const dir of [...nuxt.options.modulesDir].sort()) {
    const withSlash = withTrailingSlash(dir);
    if (nestedModulesDirs.every((d) => !d.startsWith(withSlash))) {
      nestedModulesDirs.push(withSlash);
    }
  }
  let hasTypescriptVersionWithModulePreserve;
  for (const parent of nestedModulesDirs) {
    hasTypescriptVersionWithModulePreserve ??= await readPackageJSON("typescript", { parent }).then((r) => r?.version && gte(r.version, "5.4.0")).catch(() => void 0);
  }
  hasTypescriptVersionWithModulePreserve ??= isV4;
  const useDecorators = Boolean(nuxt.options.experimental?.decorators);
  const tsConfig = defu(nuxt.options.typescript?.tsConfig, {
    compilerOptions: {
      /* Base options: */
      esModuleInterop: true,
      skipLibCheck: true,
      target: "ESNext",
      allowJs: true,
      resolveJsonModule: true,
      moduleDetection: "force",
      isolatedModules: true,
      verbatimModuleSyntax: true,
      /* Strictness */
      strict: nuxt.options.typescript?.strict ?? true,
      noUncheckedIndexedAccess: isV4,
      forceConsistentCasingInFileNames: true,
      noImplicitOverride: true,
      /* Decorator support */
      ...useDecorators ? {
        experimentalDecorators: false
      } : {},
      /* If NOT transpiling with TypeScript: */
      module: hasTypescriptVersionWithModulePreserve ? "preserve" : "ESNext",
      noEmit: true,
      /* If your code runs in the DOM: */
      lib: [
        "ESNext",
        ...useDecorators ? ["esnext.decorators"] : [],
        "dom",
        "dom.iterable",
        "webworker"
      ],
      /* JSX support for Vue */
      jsx: "preserve",
      jsxImportSource: "vue",
      /* remove auto-scanning for types */
      types: [],
      /* add paths object for filling-in later */
      paths: {},
      /* Possibly consider removing the following in future */
      moduleResolution: nuxt.options.future?.typescriptBundlerResolution || nuxt.options.experimental?.typescriptBundlerResolution ? "Bundler" : "Node",
      /* implied by module: preserve */
      useDefineForClassFields: true,
      /* implied by target: es2022+ */
      noImplicitThis: true,
      /* enabled with `strict` */
      allowSyntheticDefaultImports: true
    },
    include: [...include],
    exclude: [...exclude]
  });
  const aliases = nuxt.options.alias;
  const basePath = tsConfig.compilerOptions.baseUrl ? resolve(nuxt.options.buildDir, tsConfig.compilerOptions.baseUrl) : nuxt.options.buildDir;
  tsConfig.compilerOptions ||= {};
  tsConfig.compilerOptions.paths ||= {};
  tsConfig.include ||= [];
  const importPaths = nuxt.options.modulesDir.map((d) => directoryToURL(d));
  for (const alias in aliases) {
    if (excludedAlias.some((re) => re.test(alias))) {
      continue;
    }
    let absolutePath = resolve(basePath, aliases[alias]);
    let stats = await promises.stat(absolutePath).catch(
      () => null
      /* file does not exist */
    );
    if (!stats) {
      const resolvedModule = resolveModulePath(aliases[alias], {
        try: true,
        from: importPaths,
        extensions: [...nuxt.options.extensions, ".d.ts", ".d.mts", ".d.cts"]
      });
      if (resolvedModule) {
        absolutePath = resolvedModule;
        stats = await promises.stat(resolvedModule).catch(() => null);
      }
    }
    const relativePath = relativeWithDot(nuxt.options.buildDir, absolutePath);
    if (stats?.isDirectory()) {
      tsConfig.compilerOptions.paths[alias] = [relativePath];
      tsConfig.compilerOptions.paths[`${alias}/*`] = [`${relativePath}/*`];
      if (!absolutePath.startsWith(rootDirWithSlash)) {
        tsConfig.include.push(relativePath);
      }
    } else {
      const path = stats?.isFile() ? relativePath.replace(EXTENSION_RE, "") : aliases[alias];
      tsConfig.compilerOptions.paths[alias] = [path];
      if (!absolutePath.startsWith(rootDirWithSlash)) {
        tsConfig.include.push(path);
      }
    }
  }
  const references = [];
  await Promise.all([...nuxt.options.modules, ...nuxt.options._modules].map(async (id) => {
    if (typeof id !== "string") {
      return;
    }
    for (const parent of nestedModulesDirs) {
      const pkg = await readPackageJSON(id, { parent }).catch(() => null);
      if (pkg) {
        references.push({ types: pkg.name ?? id });
        return;
      }
    }
    references.push({ types: id });
  }));
  const declarations = [];
  await nuxt.callHook("prepare:types", { references, declarations, tsConfig });
  for (const alias in tsConfig.compilerOptions.paths) {
    const paths = tsConfig.compilerOptions.paths[alias];
    tsConfig.compilerOptions.paths[alias] = await Promise.all(paths.map(async (path) => {
      if (!isAbsolute(path)) {
        return path;
      }
      const stats = await promises.stat(path).catch(
        () => null
        /* file does not exist */
      );
      return relativeWithDot(nuxt.options.buildDir, stats?.isFile() ? path.replace(EXTENSION_RE, "") : path);
    }));
  }
  sortTsPaths(tsConfig.compilerOptions.paths);
  tsConfig.include = [...new Set(tsConfig.include.map((p) => isAbsolute(p) ? relativeWithDot(nuxt.options.buildDir, p) : p))];
  tsConfig.exclude = [...new Set(tsConfig.exclude.map((p) => isAbsolute(p) ? relativeWithDot(nuxt.options.buildDir, p) : p))];
  const declaration = [
    ...references.map((ref) => {
      if ("path" in ref && isAbsolute(ref.path)) {
        ref.path = relative(nuxt.options.buildDir, ref.path);
      }
      return `/// <reference ${renderAttrs(ref)} />`;
    }),
    ...declarations,
    "",
    "export {}",
    ""
  ].join("\n");
  return {
    declaration,
    tsConfig
  };
}
async function writeTypes(nuxt) {
  const { tsConfig, declaration } = await _generateTypes(nuxt);
  async function writeFile() {
    const GeneratedBy = "// Generated by nuxi";
    const tsConfigPath = resolve(nuxt.options.buildDir, "tsconfig.json");
    await promises.mkdir(nuxt.options.buildDir, { recursive: true });
    await promises.writeFile(tsConfigPath, GeneratedBy + "\n" + JSON.stringify(tsConfig, null, 2));
    const declarationPath = resolve(nuxt.options.buildDir, "nuxt.d.ts");
    await promises.writeFile(declarationPath, GeneratedBy + "\n" + declaration);
  }
  nuxt.hook("builder:prepared", writeFile);
  await writeFile();
}
function sortTsPaths(paths) {
  for (const pathKey in paths) {
    if (pathKey.startsWith("#build")) {
      const pathValue = paths[pathKey];
      delete paths[pathKey];
      paths[pathKey] = pathValue;
    }
  }
}
function renderAttrs(obj) {
  const attrs = [];
  for (const key in obj) {
    attrs.push(renderAttr(key, obj[key]));
  }
  return attrs.join(" ");
}
function renderAttr(key, value) {
  return value ? `${key}="${value}"` : "";
}
const RELATIVE_WITH_DOT_RE = /^([^.])/;
function relativeWithDot(from, to) {
  return relative(from, to).replace(RELATIVE_WITH_DOT_RE, "./$1") || ".";
}

const LAYOUT_RE = /["']/g;
function addLayout(template, name) {
  const nuxt = useNuxt();
  const { filename, src } = addTemplate(template);
  const layoutName = kebabCase(name || parse(filename).name).replace(LAYOUT_RE, "");
  if (isNuxt2(nuxt)) {
    const layout = nuxt.options.layouts[layoutName];
    if (layout) {
      return logger.warn(
        `Not overriding \`${layoutName}\` (provided by \`${layout}\`) with \`${src || filename}\`.`
      );
    }
    nuxt.options.layouts[layoutName] = `./${filename}`;
    if (name === "error") {
      this.addErrorLayout(filename);
    }
    return;
  }
  nuxt.hook("app:templates", (app) => {
    if (layoutName in app.layouts) {
      const relativePath = relative(nuxt.options.srcDir, app.layouts[layoutName].file);
      return logger.warn(
        `Not overriding \`${layoutName}\` (provided by \`~/${relativePath}\`) with \`${src || filename}\`.`
      );
    }
    app.layouts[layoutName] = {
      file: join("#build", filename),
      name: layoutName
    };
  });
}

function extendPages(cb) {
  const nuxt = useNuxt();
  if (isNuxt2(nuxt)) {
    nuxt.hook("build:extendRoutes", cb);
  } else {
    nuxt.hook("pages:extend", cb);
  }
}
function extendRouteRules(route, rule, options = {}) {
  const nuxt = useNuxt();
  for (const opts of [nuxt.options, nuxt.options.nitro]) {
    opts.routeRules ||= {};
    opts.routeRules[route] = options.override ? defu(rule, opts.routeRules[route]) : defu(opts.routeRules[route], rule);
  }
}
function addRouteMiddleware(input, options = {}) {
  const nuxt = useNuxt();
  const middlewares = toArray(input);
  nuxt.hook("app:resolve", (app) => {
    for (const middleware of middlewares) {
      const find = app.middleware.findIndex((item) => item.name === middleware.name);
      if (find >= 0) {
        const foundPath = app.middleware[find].path;
        if (foundPath === middleware.path) {
          continue;
        }
        if (options.override === true) {
          app.middleware[find] = { ...middleware };
        } else {
          logger.warn(`'${middleware.name}' middleware already exists at '${foundPath}'. You can set \`override: true\` to replace it.`);
        }
      } else if (options.prepend === true) {
        app.middleware.unshift({ ...middleware });
      } else {
        app.middleware.push({ ...middleware });
      }
    }
  });
}

const pluginSymbol = Symbol.for("nuxt plugin");
function normalizePlugin(plugin) {
  if (typeof plugin === "string") {
    plugin = { src: plugin };
  } else {
    plugin = { ...plugin };
  }
  if (pluginSymbol in plugin) {
    return plugin;
  }
  if (!plugin.src) {
    throw new Error("Invalid plugin. src option is required: " + JSON.stringify(plugin));
  }
  plugin.src = normalize(resolveAlias(plugin.src));
  if (!existsSync(plugin.src) && isAbsolute$1(plugin.src)) {
    try {
      plugin.src = resolveModulePath(plugin.src, {
        extensions: tryUseNuxt()?.options.extensions ?? [".js", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"]
      });
    } catch {
    }
  }
  if (plugin.ssr) {
    plugin.mode = "server";
  }
  if (!plugin.mode) {
    const [, mode = "all"] = plugin.src.match(MODE_RE) || [];
    plugin.mode = mode;
  }
  plugin[pluginSymbol] = true;
  return plugin;
}
function addPlugin(_plugin, opts = {}) {
  const nuxt = useNuxt();
  const plugin = normalizePlugin(_plugin);
  filterInPlace(nuxt.options.plugins, (p) => normalizePlugin(p).src !== plugin.src);
  nuxt.options.plugins[opts.append ? "push" : "unshift"](plugin);
  return plugin;
}
function addPluginTemplate(plugin, opts = {}) {
  const normalizedPlugin = typeof plugin === "string" ? { src: plugin } : { ...plugin, src: addTemplate(plugin).dst };
  return addPlugin(normalizedPlugin, opts);
}

export { addBuildPlugin, addComponent, addComponentsDir, addDevServerHandler, addImports, addImportsDir, addImportsSources, addLayout, addPlugin, addPluginTemplate, addPrerenderRoutes, addRouteMiddleware, addRspackPlugin, addServerHandler, addServerImports, addServerImportsDir, addServerPlugin, addServerScanDir, addServerTemplate, addTemplate, addTypeTemplate, addVitePlugin, addWebpackPlugin, assertNuxtCompatibility, buildNuxt, checkNuxtCompatibility, compileTemplate, createIsIgnored, createResolver, defineNuxtModule, directoryToURL, extendNuxtSchema, extendPages, extendRouteRules, extendRspackConfig, extendViteConfig, extendWebpackConfig, findPath, getDirectory, getNuxtCtx, getNuxtModuleVersion, getNuxtVersion, hasNuxtCompatibility, hasNuxtModule, hasNuxtModuleCompatibility, importModule, installModule, isIgnored, isNuxt2, isNuxt3, isNuxtMajorVersion, loadNuxt, loadNuxtConfig, loadNuxtModuleInstance, logger, normalizeModuleTranspilePath, normalizePlugin, normalizeSemanticVersion, normalizeTemplate, nuxtCtx, requireModule, resolveAlias, resolveFiles, resolveIgnorePatterns, resolveModule, resolveNuxtModule, resolvePath, runWithNuxtContext, templateUtils, tryImportModule, tryRequireModule, tryResolveModule, tryUseNuxt, updateRuntimeConfig, updateTemplates, useLogger, useNitro, useNuxt, useRuntimeConfig, writeTypes };
