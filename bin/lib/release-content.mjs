import { setTimeout as delay } from 'node:timers/promises';
import { OpenRouter } from '@openrouter/sdk';
import { applyFixes } from 'markdownlint';
import { lint as lintSync } from 'markdownlint/sync';

const defaultModel = 'qwen/qwen3.8-27b:free';
const maxAttempts = 3;
const maxFixPasses = 3;
const sectionHeadingPattern = /^#{2,3} (?:Features|Fixes|Maintenance)$/i;
const emptySectionValuePattern = /^(?:(?:[-*]\s*)?(?:none|no changes|n\/a)\.?|[-*])$/i;
const markdownlintConfig = {
	MD013: false,
	MD041: false,
	MD047: false,
};

function fixMarkdown(value) {
	let output = value;

	for (let pass = 0; pass < maxFixPasses; pass++) {
		const results =
			lintSync({
				config: markdownlintConfig,
				noInlineConfig: true,
				strings: { notes: output },
			}).notes || [];
		const fixable = results.filter((result) => result.fixInfo);

		if (fixable.length === 0) {
			break;
		}
		output = applyFixes(output, fixable);
	}

	return output;
}

function removeEmptySections(value) {
	const prefix = [];
	const sections = [];
	let currentSection;

	for (const line of value.split('\n')) {
		const trimmed = line.trim();

		if (sectionHeadingPattern.test(trimmed)) {
			if (currentSection) {
				sections.push(currentSection);
			}
			currentSection = { heading: line, lines: [] };
		} else if (currentSection) {
			currentSection.lines.push(line);
		} else {
			prefix.push(line);
		}
	}

	if (currentSection) {
		sections.push(currentSection);
	}

	const output = [...prefix];
	for (const section of sections) {
		const hasContent = section.lines.some((line) => {
			const trimmed = line.trim();
			return trimmed && !emptySectionValuePattern.test(trimmed);
		});

		if (hasContent) {
			output.push(section.heading, ...section.lines);
		}
	}

	return output.join('\n');
}

function hasNotesContent(value) {
	return value.split('\n').some((line) => {
		const trimmed = line.trim();
		return trimmed && !/^#{1,6}\s+/.test(trimmed) && !emptySectionValuePattern.test(trimmed);
	});
}

function repairConcatenatedMarkdown(value) {
	return value
		.replace(/(?<=\S)(?=#{2,3}\s+(?:Features|Fixes|Maintenance)\b)/g, '\n\n')
		.replace(/(#{2,3}\s+(?:Features|Fixes|Maintenance))(?=\s*-)/g, '$1\n')
		.replace(/(?<=\S)-(?=\s+(?![-*]))/g, '\n-');
}

function normalizeNotes(value) {
	const cleaned = removeEmptySections(repairConcatenatedMarkdown(value.replace(/<br\s*\/?>/gi, '\n')))
		.replace(/\n{3,}/g, '\n\n')
		.trim();

	return fixMarkdown(cleaned).trim();
}

function parseReleaseContent(content) {
	if (typeof content !== 'string' || !content.trim()) {
		throw new Error('OpenRouter returned an empty response');
	}

	const result = JSON.parse(content);
	const rawTitle = typeof result.title === 'string' ? result.title : '';
	const title = rawTitle
		.trim()
		.replace(/^[^\p{L}\p{N}]+/u, '')
		.trim();
	const notes = typeof result.notes === 'string' ? normalizeNotes(result.notes) : '';

	if (!title || !/[A-Za-z]{2}/.test(title) || title.length > 70) {
		throw new Error('OpenRouter returned an incomplete response');
	}

	if (!hasNotesContent(notes)) {
		throw new Error('OpenRouter returned release notes without content');
	}

	return { title, notes };
}

export async function generateReleaseContent({ tag, commits }) {
	const apiKey = process.env.OPENROUTER_API_KEY?.trim();

	if (!apiKey) {
		return null;
	}

	const model = process.env.OPENROUTER_MODEL?.trim() || defaultModel;
	const openRouter = new OpenRouter({
		apiKey,
		httpReferer: 'https://github.com/jdebetaz/mr-starter-kit',
		appTitle: 'MR Starter Kit Release',
	});

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const response = await openRouter.chat.send({
			chatRequest: {
				model,
				messages: [
					{
						role: 'system',
						content:
							'You write GitHub release titles and Markdown release notes for a software product. The title must be one short plain-text line that starts with a letter, contains a descriptive phrase, and never consists only of punctuation. The notes must not repeat the title.',
					},
					{
						role: 'user',
						content: `Write a user-facing release title and release notes for MR Starter Kit release ${tag} from the commits below.

The title must be 3 to 70 characters, start with a letter, summarize the most important change, and must not include the release tag. For example: Add OpenRouter release content. The notes must be Markdown without a top-level title or a fenced code block. Group changes under only the relevant headings from "## Features", "## Fixes", and "## Maintenance". Omit a heading entirely when it has no entries, and never write None or N/A under a heading. Use real Markdown line breaks, never HTML tags such as <br>. Use short bullet points, preserve important technical names, and do not claim anything not supported by the commit subjects.

Commits:
${commits}`,
					},
				],
				temperature: 0.2,
				responseFormat: {
					type: 'json_schema',
					jsonSchema: {
						name: 'release_content',
						strict: true,
						schema: {
							type: 'object',
							additionalProperties: false,
							required: ['title', 'notes'],
							properties: {
								title: {
									type: 'string',
									minLength: 3,
									maxLength: 70,
									description:
										'A short, descriptive plain-text title that starts with a letter, such as Add OpenRouter release content. Never return punctuation only or the release tag.',
								},
								notes: {
									type: 'string',
									description:
										'User-facing Markdown release notes without a top-level title. Omit headings with no entries and never write None or N/A. Use Markdown line breaks, never HTML tags such as <br>.',
								},
							},
						},
					},
				},
			},
		});

		try {
			return parseReleaseContent(response.choices?.[0]?.message?.content);
		} catch (error) {
			if (attempt === maxAttempts) {
				throw error;
			}
			await delay(attempt * 1000);
		}
	}
}
