import {defineManifest} from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
	manifest_version: 3,
	name: "FarmRPG Guide",
	version: pkg.version,
	icons: {
		48: 'public/logo.png',
	},
	action: {
		default_icon: {
			48: 'public/logo.png',
		},
		default_popup: 'src/popup/index.html',
	},
	content_scripts: [{
		js: ['src/content/main.ts'],
		matches: ['https://farmrpg.com/', 'https://www.farmrpg.com/', 'https://farmrpg.com/index.php', 'https://www.farmrpg.com/index.php'],
		run_at: "document_idle",
	}],
	permissions: [
		"storage",
	],
	host_permissions: [
		"https://buddy.farm/*",
		"https://api.buddy.farm/*",
	],
	browser_specific_settings: {
		gecko: {
			id: "farmrpgguide@whs.in.th",
			strict_min_version: "100",
		}
	}
})
