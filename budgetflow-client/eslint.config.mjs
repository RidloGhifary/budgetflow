const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "**/*.ts", "**/*.tsx"]
  },
  {
    files: ["*.config.mjs", "src/**/*.js", "src/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    }
  }
];

export default eslintConfig;
