import fs from "node:fs";
import { basename, dirname, resolve } from "node:path";

//#region src/rspack/utils.ts
function encodeVirtualModuleId(id, plugin) {
	return resolve(plugin.__virtualModulePrefix, encodeURIComponent(id));
}
function decodeVirtualModuleId(encoded, _plugin) {
	return decodeURIComponent(basename(encoded));
}
function isVirtualModuleId(encoded, plugin) {
	return dirname(encoded) === plugin.__virtualModulePrefix;
}
var FakeVirtualModulesPlugin = class {
	name = "FakeVirtualModulesPlugin";
	constructor(plugin) {
		this.plugin = plugin;
	}
	apply(compiler) {
		const dir = this.plugin.__virtualModulePrefix;
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
		compiler.hooks.shutdown.tap(this.name, () => {
			fs.rmSync(dir, {
				recursive: true,
				force: true
			});
		});
	}
	async writeModule(file) {
		const path$1 = encodeVirtualModuleId(file, this.plugin);
		await fs.promises.writeFile(path$1, "");
		return path$1;
	}
};

//#endregion
export { FakeVirtualModulesPlugin, decodeVirtualModuleId, encodeVirtualModuleId, isVirtualModuleId };