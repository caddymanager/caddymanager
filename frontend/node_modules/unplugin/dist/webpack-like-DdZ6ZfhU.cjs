"use strict";
const require_context = require('./context-nfVPmEse.cjs');
const node_path = require_context.__toESM(require("node:path"));

//#region src/utils/webpack-like.ts
function transformUse(data, plugin, transformLoader) {
	if (data.resource == null) return [];
	const id = normalizeAbsolutePath(data.resource + (data.resourceQuery || ""));
	if (plugin.transformInclude && !plugin.transformInclude(id)) return [];
	const { filter } = require_context.normalizeObjectHook(
		// WARN: treat `transform` as `load` here, since cannot get `code` outside of `transform`
		// `code` should be checked in the loader
		"load",
		plugin.transform
);
	if (!filter(id)) return [];
	return [{
		loader: transformLoader,
		options: { plugin },
		ident: plugin.name
	}];
}
function normalizeAbsolutePath(path) {
	if ((0, node_path.isAbsolute)(path)) return (0, node_path.normalize)(path);
	else return path;
}

//#endregion
Object.defineProperty(exports, 'normalizeAbsolutePath', {
  enumerable: true,
  get: function () {
    return normalizeAbsolutePath;
  }
});
Object.defineProperty(exports, 'transformUse', {
  enumerable: true,
  get: function () {
    return transformUse;
  }
});