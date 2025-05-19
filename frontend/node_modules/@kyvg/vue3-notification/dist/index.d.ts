import { ComponentOptionsMixin } from 'vue';
import { ComponentProvideOptions } from 'vue';
import { DefineComponent } from 'vue';
import { ExtractPropTypes } from 'vue';
import { HTMLAttributes } from 'vue';
import { JSX } from 'vue/jsx-runtime';
import { Plugin as Plugin_2 } from 'vue';
import { PropType } from 'vue';
import { PublicProps } from 'vue';
import { SlotsType } from 'vue';

declare const _default: Plugin_2;
export default _default;

export declare type NotificationItem = Pick<NotificationsOptions, 'id' | 'title' | 'text' | 'type' | 'speed' | 'data'> & {
    length: number;
    duplicates: number;
};

export declare const Notifications: DefineComponent<ExtractPropTypes<    {
group: {
type: StringConstructor;
default: string;
};
/**
* Width of notification holder, can be `%`, `px` string or number.
* @example '100%', '200px', 200
* */
width: {
type: (StringConstructor | NumberConstructor)[];
default: number;
};
reverse: {
type: BooleanConstructor;
default: boolean;
};
position: {
type: PropType<string | string[]>;
default: () => string[];
};
classes: {
type: PropType<string | string[]>;
default: string;
};
animationType: {
type: PropType<"css" | "velocity">;
default: string;
validator(value: unknown): value is "css" | "velocity";
};
animation: {
type: PropType<Record<"enter" | "leave", unknown>>;
default(): {
enter: (el: Element) => {
height: number[];
opacity: number[];
};
leave: {
height: number;
opacity: number[];
};
};
};
animationName: {
type: StringConstructor;
default: string;
};
speed: {
type: NumberConstructor;
default: number;
};
/** Time (in ms) to keep the notification on screen (if **negative** - notification will stay **forever** or until clicked) */
duration: {
type: NumberConstructor;
default: number;
};
delay: {
type: NumberConstructor;
default: number;
};
max: {
type: NumberConstructor;
default: number;
};
ignoreDuplicates: {
type: BooleanConstructor;
default: boolean;
};
closeOnClick: {
type: BooleanConstructor;
default: boolean;
};
pauseOnHover: {
type: BooleanConstructor;
default: boolean;
};
/** Use [v-html](https://vuejs.org/api/built-in-directives.html#v-html) to set `title` and `text` */
dangerouslySetInnerHtml: {
type: BooleanConstructor;
default: boolean;
};
}>, () => JSX.Element, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {
click: (item: NotificationItem) => true;
destroy: (item: NotificationItem) => true;
start: (item: NotificationItem) => true;
}, string, PublicProps, Readonly<ExtractPropTypes<    {
group: {
type: StringConstructor;
default: string;
};
/**
* Width of notification holder, can be `%`, `px` string or number.
* @example '100%', '200px', 200
* */
width: {
type: (StringConstructor | NumberConstructor)[];
default: number;
};
reverse: {
type: BooleanConstructor;
default: boolean;
};
position: {
type: PropType<string | string[]>;
default: () => string[];
};
classes: {
type: PropType<string | string[]>;
default: string;
};
animationType: {
type: PropType<"css" | "velocity">;
default: string;
validator(value: unknown): value is "css" | "velocity";
};
animation: {
type: PropType<Record<"enter" | "leave", unknown>>;
default(): {
enter: (el: Element) => {
height: number[];
opacity: number[];
};
leave: {
height: number;
opacity: number[];
};
};
};
animationName: {
type: StringConstructor;
default: string;
};
speed: {
type: NumberConstructor;
default: number;
};
/** Time (in ms) to keep the notification on screen (if **negative** - notification will stay **forever** or until clicked) */
duration: {
type: NumberConstructor;
default: number;
};
delay: {
type: NumberConstructor;
default: number;
};
max: {
type: NumberConstructor;
default: number;
};
ignoreDuplicates: {
type: BooleanConstructor;
default: boolean;
};
closeOnClick: {
type: BooleanConstructor;
default: boolean;
};
pauseOnHover: {
type: BooleanConstructor;
default: boolean;
};
/** Use [v-html](https://vuejs.org/api/built-in-directives.html#v-html) to set `title` and `text` */
dangerouslySetInnerHtml: {
type: BooleanConstructor;
default: boolean;
};
}>> & Readonly<{
onClick?: ((item: NotificationItem) => any) | undefined;
onDestroy?: ((item: NotificationItem) => any) | undefined;
onStart?: ((item: NotificationItem) => any) | undefined;
}>, {
speed: number;
group: string;
duration: number;
ignoreDuplicates: boolean;
closeOnClick: boolean;
width: string | number;
reverse: boolean;
position: string | string[];
classes: string | string[];
animationType: "css" | "velocity";
animation: Record<"enter" | "leave", unknown>;
animationName: string;
delay: number;
max: number;
pauseOnHover: boolean;
dangerouslySetInnerHtml: boolean;
}, SlotsType<{
body?: (props: {
class: HTMLAttributes["class"];
item: NotificationItem;
close: () => void;
}) => any;
}>, {}, {}, string, ComponentProvideOptions, true, {}, any>;

export declare interface NotificationsOptions {
    id?: number;
    title?: string;
    text?: string;
    type?: NotificationType;
    group?: string;
    duration?: number;
    speed?: number;
    data?: unknown;
    clean?: boolean;
    clear?: boolean;
    ignoreDuplicates?: boolean;
    closeOnClick?: boolean;
}

export declare interface NotificationsPluginOptions {
    name?: string;
    componentName?: string;
    velocity?: any;
}

declare type NotificationType = 'warn' | 'success' | 'error' | (string & {});

export declare const notify: {
    (args: NotificationsOptions | string): void;
    close(id: unknown): void;
};

export declare const useNotification: () => {
    notify: {
        (args: NotificationsOptions | string): void;
        close(id: unknown): void;
    };
};

export { }
declare module 'vue' {
    export interface ComponentCustomProperties {
        $notify: typeof notify;
    }
}
