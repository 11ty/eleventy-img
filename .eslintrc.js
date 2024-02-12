module.exports = {
  env: {
    es2020: true,
    node: true
  },
  extends: "eslint:recommended",
  rules: {
    indent: ["error", 2],
    "linebreak-style": ["error", "unix"],
    semi: ["error", "always"]
  }
};
