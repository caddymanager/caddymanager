import type { PiniaPluginContext } from 'pinia';
import type { Persistence, PersistenceOptions } from '../types.js';
export declare function createPersistence(context: PiniaPluginContext, optionsParser: (p: PersistenceOptions) => Persistence, auto: boolean): void;
