'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const node_fs = require('node:fs');
const MagicString = require('magic-string');
const unplugin$1 = require('unplugin');
const unpluginUtils = require('unplugin-utils');
const context = require('./shared/unimport.CQr58EHT.cjs');
require('./shared/unimport.BPKK5DUV.cjs');
require('node:path');
require('node:process');
require('pathe');
require('scule');
require('mlly');
require('strip-literal');
require('node:fs/promises');
require('node:url');
require('picomatch');
require('tinyglobby');
require('node:os');
require('local-pkg');

function _interopDefaultCompat (e) { return e && typeof e === 'object' && 'default' in e ? e.default : e; }

const MagicString__default = /*#__PURE__*/_interopDefaultCompat(MagicString);

const defaultIncludes = [/\.[jt]sx?$/, /\.vue$/, /\.vue\?vue/, /\.svelte$/];
const defaultExcludes = [/[\\/]node_modules[\\/]/, /[\\/]\.git[\\/]/];
function toArray(x) {
  return x == null ? [] : Array.isArray(x) ? x : [x];
}
const unplugin = unplugin$1.createUnplugin((options = {}) => {
  const ctx = context.createUnimport(options);
  const filter = unpluginUtils.createFilter(
    toArray(options.include || []).length ? options.include : defaultIncludes,
    options.exclude || defaultExcludes
  );
  const dts = options.dts === true ? "unimport.d.ts" : options.dts;
  const {
    autoImport = true
  } = options;
  return {
    name: "unimport",
    enforce: "post",
    transformInclude(id) {
      return filter(id);
    },
    async transform(code, id) {
      const s = new MagicString__default(code);
      await ctx.injectImports(s, id, {
        autoImport
      });
      if (!s.hasChanged())
        return;
      return {
        code: s.toString(),
        map: s.generateMap()
      };
    },
    async buildStart() {
      await ctx.init();
      if (dts)
        return node_fs.promises.writeFile(dts, await ctx.generateTypeDeclarations(), "utf-8");
    }
  };
});

exports.default = unplugin;
exports.defaultExcludes = defaultExcludes;
exports.defaultIncludes = defaultIncludes;
