import {configDefaults,defineConfig} from 'vitest/config';

// .horizon-preview holds local, untracked prototypes that read personal files: never part of the suite.
export default defineConfig({test:{exclude:[...configDefaults.exclude,'.horizon-preview/**']}});
