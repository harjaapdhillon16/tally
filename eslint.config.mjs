import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // TypeScript configuration
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: ["./tsconfig.json", "./apps/*/tsconfig.json", "./packages/*/tsconfig.json"],
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Prettier integration
  ...compat.extends("prettier"),
  // Global ignores
  {
    ignores: [
      "node_modules/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/out/**",
      "**/.next/**",
      "**/coverage/**",
      "**/*.d.ts",
      "**/*.js.map",
      "**/*.d.ts.map",
      "**/test-results/**",
      "**/playwright-report/**",
      "**/next-env.d.ts",
      "**/tsconfig.tsbuildinfo",
    ],
  },
];

export default eslintConfig;