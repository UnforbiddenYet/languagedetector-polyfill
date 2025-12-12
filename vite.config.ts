import { defineConfig, Plugin } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

// Plugin to fix cld3-asm ES module compatibility for browsers
// The emscripten-generated cld3.js exports a factory function that gets wrapped
// as a default export, but cld3-asm uses `import * as runtime` which creates
// a namespace object instead of getting the function directly
function fixCld3AsmPlugin(): Plugin {
  return {
    name: "fix-cld3-asm",
    transform(code, id) {
      // Fix the getModuleLoader call in emscripten-wasm-loader
      if (
        id.includes("emscripten-wasm-loader") &&
        id.includes("getModuleLoader")
      ) {
        return code.replace(
          "const asmModule = runtimeModule(constructedModule);",
          "const runtimeFn = typeof runtimeModule === 'function' ? runtimeModule : (runtimeModule.default || runtimeModule);\n        const asmModule = runtimeFn(constructedModule);"
        );
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    fixCld3AsmPlugin(),
    dts({
      insertTypesEntry: true,
      // Only include public API types
      exclude: ["src/**/*.test.ts"],
    }),
  ],
  resolve: {
    // Prioritize browser builds
    mainFields: ["browser", "module", "main"],
    conditions: ["browser", "import", "module", "default"],
  },
  build: {
    target: "es2020",
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "LanguageDetectorPolyfill",
      fileName: "languagedetector-polyfill",
      formats: ["es", "umd"],
    },
    rollupOptions: {
      output: {
        exports: "named",
        // Ensure proper globals for UMD
        globals: {},
      },
    },
  },
});
