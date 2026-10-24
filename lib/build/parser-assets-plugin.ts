type Chunk = { files: Set<string> };
type Entry = {
  name?: string;
  options: { name?: string };
  getFiles(): string[];
  getEntrypointChunk(): Chunk;
};
type Compilation = {
  asyncEntrypoints: Entry[];
  hooks: {
    processAssets: { tap(options: { name: string; stage: number }, callback: () => void): void };
  };
  emitAsset(name: string, source: unknown): void;
};
type Compiler = {
  hooks: {
    thisCompilation: { tap(name: string, callback: (compilation: Compilation) => void): void };
  };
  webpack: {
    Compilation: { PROCESS_ASSETS_STAGE_REPORT: number };
    sources: { RawSource: new (value: string) => unknown };
  };
};
/** List only the parser's webpack entry and dependencies, never arbitrary app or user URLs. */
export class ParserAssetsPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.thisCompilation.tap('MoMoParserAssets', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'MoMoParserAssets',
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT,
        },
        () => {
          const parser = compilation.asyncEntrypoints.find(
            (entry) => (entry.name ?? entry.options.name) === 'momo-lens-private-parser',
          );
          if (!parser) throw new Error('The private parser entry was not emitted.');
          const entry = [...parser.getEntrypointChunk().files].find((file) => file.endsWith('.js'));
          const chunks = parser.getFiles().filter((file) => file.endsWith('.js'));
          if (!entry || !chunks.includes(entry))
            throw new Error('The private parser assets are incomplete.');
          compilation.emitAsset(
            'static/parser-assets.json',
            new compiler.webpack.sources.RawSource(
              JSON.stringify({
                entry: `/_next/${entry}`,
                chunks: chunks.map((file) => `/_next/${file}`),
              }),
            ),
          );
        },
      );
    });
  }
}
