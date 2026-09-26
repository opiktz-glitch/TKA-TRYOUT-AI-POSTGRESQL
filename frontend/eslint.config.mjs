import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        files: ["src/**/*.jsx", "src/**/*.js"],
        plugins: {
            react: reactPlugin,
            "react-hooks": reactHooksPlugin,
            "unused-imports": unusedImports,
        },
        languageOptions: {
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
                ecmaVersion: "latest",
                sourceType: "module",
            },
            globals: {
                ...globals.browser,
            }
        },
        settings: {
            react: {
                version: "detect",
            },
        },
        rules: {
            "no-undef": "error",
            "react/prop-types": "off",
            "react/jsx-uses-vars": "error",
            "react/jsx-uses-react": "error",
            "no-unused-vars": "off",
            "unused-imports/no-unused-imports": "error",
            "unused-imports/no-unused-vars": [
                "warn",
                { "vars": "all", "varsIgnorePattern": "^_", "args": "after-used", "argsIgnorePattern": "^_" }
            ]
        }
    }
];
