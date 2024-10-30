import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        include: ['./tests/**/*.test.ts'],  // Updated to catch all test files in tests directory
        environment: 'node',
        exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/cypress/**',
        '**/.{idea,git,cache,output,temp}/**'
        ],
        testTimeout: 10000
    }
})