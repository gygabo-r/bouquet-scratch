import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base path matches the GitHub Pages project sub-path so all asset URLs resolve.
export default defineConfig({
  base: "/bouquet-scratch/",
  plugins: [react()],
});
