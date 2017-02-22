module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es6": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "sourceType": "module"
    },
    "rules": {
        "no-var": 1,
        "space-before-function-paren": ["error", "never"],
        "keyword-spacing": "error",
        "indent": [
            "error",
            2
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ]
    },
    "globals": {
        "angular": 1,
        "XDate": 1,
        "$": 1,
        "_": 1,
        "__dirname": 1,
        "process": 1,
        "timeHelper": 1
    },
};
