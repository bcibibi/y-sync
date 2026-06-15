import type { AsyncResolver, SyncResolver } from 'jest-resolve'

const sync: SyncResolver = (path, options) => {
  const jsExtRegex = /\.js$/i
  const resolver = options.defaultResolver
  if (jsExtRegex.test(path)) {
    try {
      return resolver(path.replace(jsExtRegex, '.ts'), options)
    } catch {
      // use default resolver
    }
  }

  return resolver(path, options)
}

const async: AsyncResolver = async (path, options) => {
  const jsExtRegex = /\.js$/i
  const resolver = options.defaultAsyncResolver
  if (jsExtRegex.test(path)) {
    try {
      return await resolver(path.replace(jsExtRegex, '.ts'), options)
    } catch {
      // use default resolver
    }
  }

  return resolver(path, options)
}

export { sync, async }