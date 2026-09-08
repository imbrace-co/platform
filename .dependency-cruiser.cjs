/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
    forbidden: [
        {
            name: 'no-circular',
            severity: 'warn',
            comment: 'Circular dependencies make code hard to reason about and refactor.',
            from: {},
            to: { circular: true },
        },
        {
            name: 'domain-stays-pure',
            severity: 'error',
            comment: 'domain/ must not import from application, infrastructure, or interfaces.',
            from: { path: '^src/domain' },
            to: { path: '^src/(application|infrastructure|interfaces)' },
        },
        {
            name: 'application-no-infrastructure',
            severity: 'error',
            comment: 'application/ depends on domain abstractions, not infrastructure concretions.',
            from: { path: '^src/application' },
            to: { path: '^src/infrastructure' },
        },
        {
            name: 'application-no-interfaces',
            severity: 'error',
            comment: 'application/ must not depend on HTTP/transport layer.',
            from: { path: '^src/application' },
            to: { path: '^src/interfaces' },
        },
        {
            name: 'no-orphans',
            severity: 'info',
            comment: 'Modules not imported by anything else may be dead code.',
            from: {
                orphan: true,
                pathNot: [
                    '\\.(spec|test)\\.[jt]sx?$',
                    '\\.d\\.ts$',
                    '(^|/)index\\.ts$',
                    '^src/index\\.ts$',
                    '^scripts/',
                ],
            },
            to: {},
        },
    ],
    options: {
        doNotFollow: { path: 'node_modules' },
        tsConfig: { fileName: 'tsconfig.json' },
        tsPreCompilationDeps: true,
        includeOnly: '^src',
        exclude: {
            path: ['\\.(spec|test)\\.[jt]sx?$', '\\.d\\.ts$'],
        },
        reporterOptions: {
            mermaid: {
                minify: false,
            },
        },
    },
};
