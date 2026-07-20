import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // dist 为构建产物；src/components/ui/** 与 src/hooks/** 为 shadcn/ui 脚手架生成代码，
  // 其内置的 react-refresh / set-state-in-effect 警告不参与本仓库门禁（手册 §1.5 CI lint）
  globalIgnores(['dist', 'src/components/ui/**', 'src/hooks/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
