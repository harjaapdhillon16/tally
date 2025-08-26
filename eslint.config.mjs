import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // For TypeScript files in packages and services
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: compat.parserOptions?.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: ["./tsconfig.json", "./apps/*/tsconfig.json", "./packages/*/tsconfig.json"],
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
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