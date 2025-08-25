import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
    ],
  },
  {
    files: ["src/**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      parser: typescriptParser,
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },
    rules: {
      "no-unused-vars": "off", // Turn off base rule as we use TypeScript version
      "@typescript-eslint/no-unused-vars": "warn",
      "no-console": "off", // Allow console in analytics package for debugging
      "@typescript-eslint/no-explicit-any": "off", // Allow any for external APIs
    },
  },
];

export default eslintConfig;