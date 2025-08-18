import path from 'node:path'
import {crx} from '@crxjs/vite-plugin'
import {defineConfig} from 'vite'
import zip from 'vite-plugin-zip-pack'
import tailwindcss from '@tailwindcss/vite'
import manifest from './manifest.config.js'
import {name, version} from './package.json'

export default defineConfig({
	resolve: {
		alias: {
			'@': `${path.resolve(__dirname, 'src')}`,
		},
	},
	plugins: [
		tailwindcss(),
		crx({
			manifest,
			browser: "firefox",
		}),
		zip({outDir: 'release', outFileName: `crx-${name}-${version}.zip`}),
	],
	server: {
		cors: {
			origin: [
				/chrome-extension:\/\//,
				/moz-extension:\/\//,
			],
		},
	},
})
