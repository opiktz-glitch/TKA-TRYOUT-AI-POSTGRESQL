import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        files: ["src/**/*.jsx", "src/**/*.js"],
        plugins: {
            react: reactPlugin,
            "react-hooks": reactHooksPlugin,
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
            "react/prop-types": "off"
        }
    }
];
