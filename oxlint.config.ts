import { defineConfig } from 'oxlint';

export default defineConfig({
	ignorePatterns: ['apps/**/.adonisjs/**', 'apps/**/types/db.ts'],
	plugins: ['typescript', 'vue'],
	rules: {
		'typescript/no-namespace': 'off',
	},
});
