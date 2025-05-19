import { normalizeObjectHook } from "./context-D49cMElb.js";
import { isAbsolute, normalize } from "node:path";

//#region src/utils/webpack-like.ts
function transformUse(data, plugin, transformLoader) {
	if (data.resource == null) return [];
	const id = normalizeAbsolutePath(data.resource + (data.resourceQuery || ""));
	if (plugin.transformInclude && !plugin.transformInclude(id)) return [];
	const { filter } = normalizeObjectHook(
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
function normalizeAbsolutePath(path$1) {
	if (isAbsolute(path$1)) return normalize(path$1);
	else return path$1;
}

//#endregion
export { normalizeAbsolutePath, transformUse };