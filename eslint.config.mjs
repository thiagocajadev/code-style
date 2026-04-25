import js from "@eslint/js";
import globals from "globals";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import {
  sdgEslintConfig,
  sdgTestConfig,
} from "./.ai/tooling/eslint-config/snippet.mjs";

export default [
  { ignores: ["assets/**"] },
  js.configs.recommended,
  prettierRecommended,
  sdgEslintConfig,
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["**/*.jest.js", "**/*.test.js", "**/*.spec.js"],
    languageOptions: {
      globals: globals.jest,
    },
  },
  sdgTestConfig,
];
