# deep-pick-omit

[![npm version][version-src]][version-href]
[![bundlephobia][bundle-src]][bundle-href]
[![license][license-src]][license-href]

> Deep-pick and deep-omit objects with typesafe paths.

## Basic usage

Both `deepPick` and `deepOmit` take an object and an array of dot-notation paths to respectively pick and omit from the object. By default, TypeScript will infer types for paths and error if a path does not exist in the object.

### `deepPick`

```typescript
import { deepPick } from 'deep-pick-omit'

const obj = {
  a: {
    b: 'this',
    c: 'not this'
  },
  d: 'this'
}

deepPick(obj, ['a.b', 'e'])
// -> { a: { b: 'this' }, d: 'this' }

deepPick(obj, ['f'])
// -> TypeScript Error: `f` is not a key of `obj`
```

### `deepOmit`

```typescript
import { deepOmit } from 'deep-pick-omit'

const obj = {
  a: {
    b: 'this',
    c: 'not this'
  },
  d: 'this'
}

deepOmit(obj, ['a.c'])
// -> { a: { b: 'this' }, d: 'this' }

deepOmit(obj, ['f'])
// -> TypeScript Error: `f` is not a key of `obj`
```

> [!NOTE]
> Pathing through array values is not allowed typesafe path methods. See [unsafe methods](#unsafe-methods).

## Unsafe methods

If paths type-safety is a problem for some edge cases, the package exposes the same methods without the type-checking on paths.

### `deepPickUnsafe`

```typescript
import { deepPickUnsafe } from 'deep-pick-omit'

const obj = {
  a: {
    c: 'not this'
  },
  d: 'this'
}

deepPickUnsafe(obj, ['d', 'f'])
// -> { d: 'this' }
```

### `deepOmitUnsafe`

```typescript
import { deepOmitUnsafe } from 'deep-pick-omit'

const obj = {
  a: {
    b: 'this',
    c: 'not this'
  },
  d: 'this'
}

deepOmitUnsafe(obj, ['a.c', 'f'])
// -> { a: { b: 'this' }, d: 'this' }
```

## License

[MIT](./LICENSE) — Made with 💖.

<!-- Badges -->

[version-src]: https://img.shields.io/npm/v/deep-pick-omit?style=flat-square&labelColor=313244&color=f38ba8
[version-href]: https://npmjs.com/package/deep-pick-omit
[bundle-src]: https://img.shields.io/bundlephobia/minzip/deep-pick-omit?style=flat-square&labelColor=313244&color=f38ba8
[bundle-href]: https://bundlephobia.com/result?p=deep-pick-omit
[license-src]: https://img.shields.io/github/license/prazdevs/deep-pick-omit?style=flat-square&labelColor=313244&color=f38ba8
[license-href]: https://github.com/prazdevs/deep-pick-omit/blob/main/LICENSE
