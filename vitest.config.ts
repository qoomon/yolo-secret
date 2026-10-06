import {defineConfig} from 'vitest/config'
import path from 'path'

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src'),
            // openpgp/lightweight only exports a browser condition;
            // fall back to the full build for Node-based test runs
            'openpgp/lightweight': 'openpgp',
        }
    },
    test: {
        include: ['**/*.test.ts'],
    },
})
