import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'dist-single', 'dev-dist', 'node_modules', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',

      // المتغيّرات غير المستعملة تُسمح بادئتها بشرطة سفلية (نمط شائع للتجاهل المتعمّد)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // كتل catch الفارغة مقصودة في هذا المشروع: فشل التخزين يُعالَج
      // عبر حالة عامة مرئية للمستخدم، لا عبر رمي الخطأ في وجهه.
      'no-empty': ['error', { allowEmptyCatch: true }],

      // وعد مهمَل بلا معالجة = تغيير قد لا يصل إلى القرص أبدًا.
      // الاستدعاء المتعمّد بلا انتظار يُكتب `void promise()`.
      '@typescript-eslint/no-floating-promises': 'error',
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // ملفات الإعداد والسكربتات تعمل في Node
    files: ['*.config.{ts,js,mjs}', 'scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
)
