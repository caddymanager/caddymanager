import { defineNuxtModule, createResolver, useLogger, hasNuxtModule, addImports, addPlugin } from '@nuxt/kit';
import { defu } from 'defu';

const module = defineNuxtModule({
  meta: {
    name: "pinia-plugin-persistedstate",
    configKey: "piniaPluginPersistedstate",
    compatibility: {
      nuxt: ">=3.0.0"
    }
  },
  defaults: {},
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);
    const logger = useLogger();
    if (!hasNuxtModule("pinia", nuxt)) {
      logger.warn("The `@pinia/nuxt` module was not found, `pinia-plugin-persistedstate/nuxt` will not work.");
      return;
    }
    nuxt.options.build.transpile.push(resolver.resolve("./runtime"));
    nuxt.options.runtimeConfig.public.piniaPluginPersistedstate = defu(nuxt.options.runtimeConfig.public.piniaPluginPersistedstate, options);
    addImports({
      name: "storages",
      from: resolver.resolve("./runtime/storages"),
      as: "piniaPluginPersistedstate"
    });
    addPlugin(resolver.resolve("./runtime/plugin"));
  }
});

export { module as default };
