import type {CodegenConfig} from '@graphql-codegen/cli';

// https://github.com/dotansimha/graphql-code-generator/issues/10176
function fixImportsAndLint(path: string, content: string) {
	let newContent = content;
	if (!newContent.startsWith(`/* eslint-disable */`)) {
		newContent = `/* eslint-disable */\n${newContent}`;
	}
	if (path.endsWith('graphql.ts')) {
		newContent = newContent.replace(
			'/* eslint-disable */',
			`/* eslint-disable */\nimport { DocumentTypeDecoration } from '@graphql-typed-document-node/core';\n`
		);
	}
	return newContent;
}

const config: CodegenConfig = {
	schema: 'https://api.buddy.farm/graphql',
	generates: {
		'./src/data/types/': {
			preset: 'client',
			config: {
				documentMode: 'string',
			},
			hooks: {
				beforeOneFileWrite: (path, content) => {
					return fixImportsAndLint(path, content);
				},
			},
		},
		'./src/data/types/schema.graphql': {
			plugins: ['schema-ast'],
			config: {
				includeDirectives: true,
			},
		},
	},
};

export default config;
