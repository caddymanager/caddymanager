import * as _nuxt_schema from '@nuxt/schema';
import { ModuleOptions, ModuleDefinition, NuxtModule, NuxtConfig, Nuxt, ModuleMeta, NuxtOptions, SchemaDefinition, ImportPresetWithDeprecation, NuxtCompatibility, NuxtCompatibilityIssues, Component, ComponentsDir, NuxtTemplate, NuxtMiddleware, NuxtHooks, NuxtPlugin, NuxtPluginTemplate, ResolvedNuxtTemplate, NuxtServerTemplate, NuxtTypeTemplate } from '@nuxt/schema';
import { LoadConfigOptions } from 'c12';
import { Import } from 'unimport';
import { WebpackPluginInstance, Configuration } from 'webpack';
import { RspackPluginInstance } from '@rspack/core';
import { Plugin, UserConfig } from 'vite';
import * as unctx from 'unctx';
import { NitroRouteConfig, NitroEventHandler, NitroDevEventHandler, Nitro } from 'nitropack';
import * as consola from 'consola';
import { ConsolaOptions } from 'consola';
import { genSafeVariableName } from 'knitwork';

/**
 * Define a Nuxt module, automatically merging defaults with user provided options, installing
 * any hooks that are provided, and calling an optional setup function for full control.
 */
declare function defineNuxtModule<TOptions extends ModuleOptions>(definition: ModuleDefinition<TOptions, Partial<TOptions>, false> | NuxtModule<TOptions, Partial<TOptions>, false>): NuxtModule<TOptions, TOptions, false>;
declare function defineNuxtModule<TOptions extends ModuleOptions>(): {
    with: <TOptionsDefaults extends Partial<TOptions>>(definition: ModuleDefinition<TOptions, TOptionsDefaults, true> | NuxtModule<TOptions, TOptionsDefaults, true>) => NuxtModule<TOptions, TOptionsDefaults, true>;
};

/** Installs a module on a Nuxt instance. */
declare function installModule<T extends string | NuxtModule, Config extends Extract<NonNullable<NuxtConfig['modules']>[number], [T, any]>>(moduleToInstall: T, inlineOptions?: [Config] extends [never] ? any : Config[1], nuxt?: Nuxt): Promise<void>;
declare function getDirectory(p: string): string;
declare const normalizeModuleTranspilePath: (p: string) => string;
declare function loadNuxtModuleInstance(nuxtModule: string | NuxtModule, nuxt?: Nuxt): Promise<{
    nuxtModule: NuxtModule<any>;
    buildTimeModuleMeta: ModuleMeta;
    resolvedModulePath?: string;
}>;

/**
 * Check if a Nuxt module is installed by name.
 *
 * This will check both the installed modules and the modules to be installed. Note
 * that it cannot detect if a module is _going to be_ installed programmatically by another module.
 */
declare function hasNuxtModule(moduleName: string, nuxt?: Nuxt): boolean;
/**
 * Checks if a Nuxt Module is compatible with a given semver version.
 */
declare function hasNuxtModuleCompatibility(module: string | NuxtModule, semverVersion: string, nuxt?: Nuxt): Promise<boolean>;
/**
 * Get the version of a Nuxt module.
 *
 * Scans installed modules for the version, if it's not found it will attempt to load the module instance and get the version from there.
 */
declare function getNuxtModuleVersion(module: string | NuxtModule, nuxt?: Nuxt | any): Promise<string | false>;

interface LoadNuxtConfigOptions extends Omit<LoadConfigOptions<NuxtConfig>, 'overrides'> {
    overrides?: Exclude<LoadConfigOptions<NuxtConfig>['overrides'], Promise<any> | Function>;
}
declare function loadNuxtConfig(opts: LoadNuxtConfigOptions): Promise<NuxtOptions>;

declare function extendNuxtSchema(def: SchemaDefinition | (() => SchemaDefinition)): void;

interface LoadNuxtOptions extends LoadNuxtConfigOptions {
    /** Load nuxt with development mode */
    dev?: boolean;
    /** Use lazy initialization of nuxt if set to false */
    ready?: boolean;
    /** @deprecated Use cwd option */
    rootDir?: LoadNuxtConfigOptions['cwd'];
    /** @deprecated use overrides option */
    config?: LoadNuxtConfigOptions['overrides'];
}
declare function loadNuxt(opts: LoadNuxtOptions): Promise<Nuxt>;
declare function buildNuxt(nuxt: Nuxt): Promise<any>;

declare function addImports(imports: Import | Import[]): void;
declare function addImportsDir(dirs: string | string[], opts?: {
    prepend?: boolean;
}): void;
declare function addImportsSources(presets: ImportPresetWithDeprecation | ImportPresetWithDeprecation[]): void;

/**
 * Access 'resolved' Nuxt runtime configuration, with values updated from environment.
 *
 * This mirrors the runtime behavior of Nitro.
 */
declare function useRuntimeConfig(): Record<string, any>;
/**
 * Update Nuxt runtime configuration.
 */
declare function updateRuntimeConfig(runtimeConfig: Record<string, unknown>): void | Promise<void>;

interface ExtendConfigOptions {
    /**
     * Install plugin on dev
     * @default true
     */
    dev?: boolean;
    /**
     * Install plugin on build
     * @default true
     */
    build?: boolean;
    /**
     * Install plugin on server side
     * @default true
     */
    server?: boolean;
    /**
     * Install plugin on client side
     * @default true
     */
    client?: boolean;
    /**
     * Prepends the plugin to the array with `unshift()` instead of `push()`.
     */
    prepend?: boolean;
}
interface ExtendWebpackConfigOptions extends ExtendConfigOptions {
}
interface ExtendViteConfigOptions extends ExtendConfigOptions {
}
/**
 * Extend webpack config
 *
 * The fallback function might be called multiple times
 * when applying to both client and server builds.
 */
declare const extendWebpackConfig: (fn: ((config: Configuration) => void), options?: ExtendWebpackConfigOptions) => void;
/**
 * Extend rspack config
 *
 * The fallback function might be called multiple times
 * when applying to both client and server builds.
 */
declare const extendRspackConfig: (fn: ((config: Configuration) => void), options?: ExtendWebpackConfigOptions) => void;
/**
 * Extend Vite config
 */
declare function extendViteConfig(fn: ((config: UserConfig) => void), options?: ExtendViteConfigOptions): (() => void) | undefined;
/**
 * Append webpack plugin to the config.
 */
declare function addWebpackPlugin(pluginOrGetter: WebpackPluginInstance | WebpackPluginInstance[] | (() => WebpackPluginInstance | WebpackPluginInstance[]), options?: ExtendWebpackConfigOptions): void;
/**
 * Append rspack plugin to the config.
 */
declare function addRspackPlugin(pluginOrGetter: RspackPluginInstance | RspackPluginInstance[] | (() => RspackPluginInstance | RspackPluginInstance[]), options?: ExtendWebpackConfigOptions): void;
/**
 * Append Vite plugin to the config.
 */
declare function addVitePlugin(pluginOrGetter: Plugin | Plugin[] | (() => Plugin | Plugin[]), options?: ExtendViteConfigOptions): void;
interface AddBuildPluginFactory {
    vite?: () => Plugin | Plugin[];
    webpack?: () => WebpackPluginInstance | WebpackPluginInstance[];
    rspack?: () => RspackPluginInstance | RspackPluginInstance[];
}
declare function addBuildPlugin(pluginFactory: AddBuildPluginFactory, options?: ExtendConfigOptions): void;

declare function normalizeSemanticVersion(version: string): string;
/**
 * Check version constraints and return incompatibility issues as an array
 */
declare function checkNuxtCompatibility(constraints: NuxtCompatibility, nuxt?: Nuxt): Promise<NuxtCompatibilityIssues>;
/**
 * Check version constraints and throw a detailed error if has any, otherwise returns true
 */
declare function assertNuxtCompatibility(constraints: NuxtCompatibility, nuxt?: Nuxt): Promise<true>;
/**
 * Check version constraints and return true if passed, otherwise returns false
 */
declare function hasNuxtCompatibility(constraints: NuxtCompatibility, nuxt?: Nuxt): Promise<boolean>;
/**
 * Check if current Nuxt instance is of specified major version
 */
declare function isNuxtMajorVersion(majorVersion: 2 | 3 | 4, nuxt?: Nuxt): boolean;
/**
 * @deprecated Use `isNuxtMajorVersion(2, nuxt)` instead. This may be removed in \@nuxt/kit v5 or a future major version.
 */
declare function isNuxt2(nuxt?: Nuxt): boolean;
/**
 * @deprecated Use `isNuxtMajorVersion(3, nuxt)` instead. This may be removed in \@nuxt/kit v5 or a future major version.
 */
declare function isNuxt3(nuxt?: Nuxt): boolean;
/**
 * Get nuxt version
 */
declare function getNuxtVersion(nuxt?: Nuxt | any): string;

/**
 * Register a directory to be scanned for components and imported only when used.
 *
 * Requires Nuxt 2.13+
 */
declare function addComponentsDir(dir: ComponentsDir, opts?: {
    prepend?: boolean;
}): void;
type AddComponentOptions = {
    name: string;
    filePath: string;
} & Partial<Exclude<Component, 'shortPath' | 'async' | 'level' | 'import' | 'asyncImport'>>;
/**
 * Register a component by its name and filePath.
 *
 * Requires Nuxt 2.13+
 */
declare function addComponent(opts: AddComponentOptions): void;

/**
 * Direct access to the Nuxt global context - see https://github.com/unjs/unctx.
 * @deprecated Use `getNuxtCtx` instead
 */
declare const nuxtCtx: unctx.UseContext<Nuxt>;
/** Direct access to the Nuxt context with asyncLocalStorage - see https://github.com/unjs/unctx. */
declare const getNuxtCtx: () => Nuxt | null;
/**
 * Get access to Nuxt instance.
 *
 * Throws an error if Nuxt instance is unavailable.
 * @example
 * ```js
 * const nuxt = useNuxt()
 * ```
 */
declare function useNuxt(): Nuxt;
/**
 * Get access to Nuxt instance.
 *
 * Returns null if Nuxt instance is unavailable.
 * @example
 * ```js
 * const nuxt = tryUseNuxt()
 * if (nuxt) {
 *  // Do something
 * }
 * ```
 */
declare function tryUseNuxt(): Nuxt | null;
declare function runWithNuxtContext<T extends (...args: any[]) => any>(nuxt: Nuxt, fn: T): ReturnType<T>;

declare function createIsIgnored(nuxt?: _nuxt_schema.Nuxt | null): (pathname: string, stats?: unknown) => boolean;
/**
 * Return a filter function to filter an array of paths
 */
declare function isIgnored(pathname: string, _stats?: unknown, nuxt?: _nuxt_schema.Nuxt | null): boolean;
declare function resolveIgnorePatterns(relativePath?: string): string[];

declare function addLayout(this: any, template: NuxtTemplate | string, name?: string): void;

declare function extendPages(cb: NuxtHooks['pages:extend']): void;
interface ExtendRouteRulesOptions {
    /**
     * Override route rule config
     * @default false
     */
    override?: boolean;
}
declare function extendRouteRules(route: string, rule: NitroRouteConfig, options?: ExtendRouteRulesOptions): void;
interface AddRouteMiddlewareOptions {
    /**
     * Override existing middleware with the same name, if it exists
     * @default false
     */
    override?: boolean;
    /**
     * Prepend middleware to the list
     * @default false
     */
    prepend?: boolean;
}
declare function addRouteMiddleware(input: NuxtMiddleware | NuxtMiddleware[], options?: AddRouteMiddlewareOptions): void;

declare function normalizePlugin(plugin: NuxtPlugin | string): NuxtPlugin;
/**
 * Registers a nuxt plugin and to the plugins array.
 *
 * Note: You can use mode or .client and .server modifiers with fileName option
 * to use plugin only in client or server side.
 *
 * Note: By default plugin is prepended to the plugins array. You can use second argument to append (push) instead.
 * @example
 * ```js
 * import { createResolver } from '@nuxt/kit'
 * const resolver = createResolver(import.meta.url)
 *
 * addPlugin({
 *   src: resolver.resolve('templates/foo.js'),
 *   filename: 'foo.server.js' // [optional] only include in server bundle
 * })
 * ```
 */
interface AddPluginOptions {
    append?: boolean;
}
declare function addPlugin(_plugin: NuxtPlugin | string, opts?: AddPluginOptions): NuxtPlugin;
/**
 * Adds a template and registers as a nuxt plugin.
 */
declare function addPluginTemplate(plugin: NuxtPluginTemplate | string, opts?: AddPluginOptions): NuxtPlugin;

interface ResolvePathOptions {
    /** Base for resolving paths from. Default is Nuxt rootDir. */
    cwd?: string;
    /** An object of aliases. Default is Nuxt configured aliases. */
    alias?: Record<string, string>;
    /** The file extensions to try. Default is Nuxt configured extensions. */
    extensions?: string[];
    /**
     * Whether to resolve files that exist in the Nuxt VFS (for example, as a Nuxt template).
     * @default false
     */
    virtual?: boolean;
    /**
     * Whether to fallback to the original path if the resolved path does not exist instead of returning the normalized input path.
     *
     * @default false
     */
    fallbackToOriginal?: boolean;
}
/**
 * Resolve full path to a file or directory respecting Nuxt alias and extensions options
 *
 * If path could not be resolved, normalized input path will be returned
 */
declare function resolvePath(path: string, opts?: ResolvePathOptions): Promise<string>;
/**
 * Try to resolve first existing file in paths
 */
declare function findPath(paths: string | string[], opts?: ResolvePathOptions, pathType?: 'file' | 'dir'): Promise<string | null>;
/**
 * Resolve path aliases respecting Nuxt alias options
 */
declare function resolveAlias(path: string, alias?: Record<string, string>): string;
interface Resolver {
    resolve(...path: string[]): string;
    resolvePath(path: string, opts?: ResolvePathOptions): Promise<string>;
}
/**
 * Create a relative resolver
 */
declare function createResolver(base: string | URL): Resolver;
declare function resolveNuxtModule(base: string, paths: string[]): Promise<string[]>;
declare function resolveFiles(path: string, pattern: string | string[], opts?: {
    followSymbolicLinks?: boolean;
}): Promise<string[]>;

/**
 * Adds a nitro server handler
 *
 */
declare function addServerHandler(handler: NitroEventHandler): void;
/**
 * Adds a nitro server handler for development-only
 *
 */
declare function addDevServerHandler(handler: NitroDevEventHandler): void;
/**
 * Adds a Nitro plugin
 */
declare function addServerPlugin(plugin: string): void;
/**
 * Adds routes to be prerendered
 */
declare function addPrerenderRoutes(routes: string | string[]): void;
/**
 * Access to the Nitro instance
 *
 * **Note:** You can call `useNitro()` only after `ready` hook.
 *
 * **Note:** Changes to the Nitro instance configuration are not applied.
 * @example
 *
 * ```ts
 * nuxt.hook('ready', () => {
 *   console.log(useNitro())
 * })
 * ```
 */
declare function useNitro(): Nitro;
/**
 * Add server imports to be auto-imported by Nitro
 */
declare function addServerImports(imports: Import[]): void;
/**
 * Add directories to be scanned for auto-imports by Nitro
 */
declare function addServerImportsDir(dirs: string | string[], opts?: {
    prepend?: boolean;
}): void;
/**
 * Add directories to be scanned by Nitro. It will check for subdirectories,
 * which will be registered just like the `~/server` folder is.
 */
declare function addServerScanDir(dirs: string | string[], opts?: {
    prepend?: boolean;
}): void;

/**
 * Renders given template during build into the virtual file system (and optionally to disk in the project `buildDir`)
 */
declare function addTemplate<T>(_template: NuxtTemplate<T> | string): ResolvedNuxtTemplate<T>;
/**
 * Adds a virtual file that can be used within the Nuxt Nitro server build.
 */
declare function addServerTemplate(template: NuxtServerTemplate): NuxtServerTemplate;
/**
 * Renders given types during build to disk in the project `buildDir`
 * and register them as types.
 *
 * You can pass a second context object to specify in which context the type should be added.
 *
 * If no context object is passed, then it will only be added to the nuxt context.
 */
declare function addTypeTemplate<T>(_template: NuxtTypeTemplate<T>, context?: {
    nitro?: boolean;
    nuxt?: boolean;
}): ResolvedNuxtTemplate<T>;
/**
 * Normalize a nuxt template object
 */
declare function normalizeTemplate<T>(template: NuxtTemplate<T> | string, buildDir?: string): ResolvedNuxtTemplate<T>;
/**
 * Trigger rebuilding Nuxt templates
 *
 * You can pass a filter within the options to selectively regenerate a subset of templates.
 */
declare function updateTemplates(options?: {
    filter?: (template: ResolvedNuxtTemplate<any>) => boolean;
}): Promise<any>;
declare function writeTypes(nuxt: Nuxt): Promise<void>;

declare const logger: consola.ConsolaInstance;
declare function useLogger(tag?: string, options?: Partial<ConsolaOptions>): consola.ConsolaInstance;

interface ResolveModuleOptions {
    /** @deprecated use `url` with URLs pointing at a file - never a directory */
    paths?: string | string[];
    url?: URL | URL[];
}
declare function directoryToURL(dir: string): URL;
/**
 * Resolve a module from a given root path using an algorithm patterned on
 * the upcoming `import.meta.resolve`. It returns a file URL
 *
 * @internal
 */
declare function tryResolveModule(id: string, url: URL | URL[]): Promise<string | undefined>;
/** @deprecated pass URLs pointing at files */
declare function tryResolveModule(id: string, url: string | string[]): Promise<string | undefined>;
declare function resolveModule(id: string, options?: ResolveModuleOptions): string;
interface ImportModuleOptions extends ResolveModuleOptions {
    /** Automatically de-default the result of requiring the module. */
    interopDefault?: boolean;
}
declare function importModule<T = unknown>(id: string, opts?: ImportModuleOptions): Promise<T>;
declare function tryImportModule<T = unknown>(id: string, opts?: ImportModuleOptions): Promise<T | undefined> | undefined;
/**
 * @deprecated Please use `importModule` instead.
 */
declare function requireModule<T = unknown>(id: string, opts?: ImportModuleOptions): T;
/**
 * @deprecated Please use `tryImportModule` instead.
 */
declare function tryRequireModule<T = unknown>(id: string, opts?: ImportModuleOptions): T | undefined;

/** @deprecated */
declare function compileTemplate<T>(template: NuxtTemplate<T>, ctx: any): Promise<string>;
/** @deprecated */
declare const templateUtils: {
    serialize: (data: any) => string;
    importName: typeof genSafeVariableName;
    importSources: (sources: string | string[], { lazy }?: {
        lazy?: boolean | undefined;
    }) => string;
};

export { type AddComponentOptions, type AddPluginOptions, type AddRouteMiddlewareOptions, type ExtendConfigOptions, type ExtendRouteRulesOptions, type ExtendViteConfigOptions, type ExtendWebpackConfigOptions, type ImportModuleOptions, type LoadNuxtConfigOptions, type LoadNuxtOptions, type ResolveModuleOptions, type ResolvePathOptions, type Resolver, addBuildPlugin, addComponent, addComponentsDir, addDevServerHandler, addImports, addImportsDir, addImportsSources, addLayout, addPlugin, addPluginTemplate, addPrerenderRoutes, addRouteMiddleware, addRspackPlugin, addServerHandler, addServerImports, addServerImportsDir, addServerPlugin, addServerScanDir, addServerTemplate, addTemplate, addTypeTemplate, addVitePlugin, addWebpackPlugin, assertNuxtCompatibility, buildNuxt, checkNuxtCompatibility, compileTemplate, createIsIgnored, createResolver, defineNuxtModule, directoryToURL, extendNuxtSchema, extendPages, extendRouteRules, extendRspackConfig, extendViteConfig, extendWebpackConfig, findPath, getDirectory, getNuxtCtx, getNuxtModuleVersion, getNuxtVersion, hasNuxtCompatibility, hasNuxtModule, hasNuxtModuleCompatibility, importModule, installModule, isIgnored, isNuxt2, isNuxt3, isNuxtMajorVersion, loadNuxt, loadNuxtConfig, loadNuxtModuleInstance, logger, normalizeModuleTranspilePath, normalizePlugin, normalizeSemanticVersion, normalizeTemplate, nuxtCtx, requireModule, resolveAlias, resolveFiles, resolveIgnorePatterns, resolveModule, resolveNuxtModule, resolvePath, runWithNuxtContext, templateUtils, tryImportModule, tryRequireModule, tryResolveModule, tryUseNuxt, updateRuntimeConfig, updateTemplates, useLogger, useNitro, useNuxt, useRuntimeConfig, writeTypes };
