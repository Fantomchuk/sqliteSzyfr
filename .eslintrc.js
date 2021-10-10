module.exports = {
    root: true,
    parser: "babel-eslint",
    parserOptions: {
        ecmaVersion: 2015,
        sourceType: "script",
    },
    env: {
        browser: true,
        node: true,
    },
    extends: ["airbnb-base", "plugin:prettier/recommended"],
    plugins: ["html"],

    rules: {
        "no-console": "off",
        "func-names": ["error", "never"],
        "no-restricted-syntax": ["error", "BinaryExpression[operator='in']"],
        "no-async-promise-executor": "off",
        "no-useless-catch": "off",
        "no-unused-vars": [
            1,
            {
                ignoreRestSiblings: true,
                argsIgnorePattern: "r|res|next|^err",
            },
        ],
        "prettier/prettier": [
            "error",
            {
                singleQuote: false,
                printWidth: 120,
                tabWidth: 4,
                endOfLine: "auto",
            },
        ],
        "import/no-extraneous-dependencies": ["error", {}],
    },
};
