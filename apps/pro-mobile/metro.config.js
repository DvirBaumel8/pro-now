// Metro configuration for this app inside the npm workspaces monorepo.
//
// Metro does not follow workspace symlinks or hoisted dependencies by
// default: without this it cannot see `packages/*` sources or the root
// node_modules. See /docs/04-TECH-ARCHITECTURE.md §Repository layout.
const path = require("path");

const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the whole workspace so edits in packages/* trigger a rebuild.
config.watchFolders = [workspaceRoot];

// Resolve from this app first, then the hoisted root node_modules.
// Hierarchical lookup stays ON: react-native keeps some of its own
// dependencies nested (e.g. @react-native/virtualized-lists), and Metro
// must still be able to walk up to them.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
