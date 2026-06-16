import type { Config } from 'jest'
import { createDefaultEsmPreset } from 'ts-jest'

const presetConfig = createDefaultEsmPreset({
  tsconfig: "./tsconfig.json",
})

export default {
  ...presetConfig,
  resolver: "./jest.resolver.ts",
  globalSetup: "./jest.setup.ts",
} satisfies Config