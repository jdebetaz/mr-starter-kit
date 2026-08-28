import { resolvePageComponent } from '@adonisjs/inertia/helpers';
import { TuyauProvider } from '@adonisjs/inertia/react';
import { type Data } from '@generated/data';
import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react';
import { type ReactElement } from 'react';
import ReactDOMServer from 'react-dom/server';
import { client } from '~/client';
import Layout from '~/layouts/default';

export default function render(page: any) {
	return createInertiaApp({
		page,
		render: ReactDOMServer.renderToString,
		resolve: (name) => {
			return resolvePageComponent<ResolvedComponent>(
				`./pages/${name}.tsx`,
				import.meta.glob<ResolvedComponent>('./pages/**/*.tsx', { eager: true }),
				(resolvedPage: ReactElement<Data.SharedProps>) => <Layout children={resolvedPage} />,
			);
		},
		setup: ({ App, props }) => {
			return (
				<TuyauProvider client={client}>
					<App {...props} />
				</TuyauProvider>
			);
		},
	});
}
