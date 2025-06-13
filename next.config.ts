import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    const path = require("path");
    config.resolve.alias["vitallens$"] = path.join(__dirname, "node_modules/vitallens/dist/vitallens.browser.js");
    return config;
  },
};

export default nextConfig;
