import { normalizeObjectHook } from "../../context-D49cMElb.js";
import { normalizeAbsolutePath } from "../../webpack-like-eCUNu7bZ.js";
import { createBuildContext, createContext } from "../../context-D_KPTgTH.js";
import { decodeVirtualModuleId, isVirtualModuleId } from "../../utils-BrnUOYYS.js";

//#region src/rspack/loaders/load.ts
async function load(source, map) {
	const callback = this.async();
	const { plugin } = this.query;
	let id = this.resource;
	if (!plugin?.load || !id) return callback(null, source, map);
	if (isVirtualModuleId(id, plugin)) id = decodeVirtualModuleId(id, plugin);
	const context = createContext(this);
	const { handler } = normalizeObjectHook("load", plugin.load);
	const res = await handler.call(Object.assign({}, this._compilation && createBuildContext(this._compiler, this._compilation, this), context), normalizeAbsolutePath(id));
	if (res == null) callback(null, source, map);
	else if (typeof res !== "string") callback(null, res.code, res.map ?? map);
	else callback(null, res, map);
}

//#endregion
export { load as default };