/* eslint-disable global-require */
import typescript from "@rollup/plugin-typescript";
import pkg from "./package.json" with { type: "json" };

export default {
  input: "src/index.ts",
  output: [
    {
      file: 'dist/index.js',
      format: "cjs",
    },
    {
      file: 'dist/index.es.js',
      format: "es",
    },
  ],
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json",
    }),
  ],
};
