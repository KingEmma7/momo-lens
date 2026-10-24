import { describe, expect, it } from 'vitest';
import { t } from '../lib/i18n';
import { CATEGORIES } from '../lib/categorise/defaults';

describe('typed UI copy and the partial Twi draft', () => {
  it('uses existing reviewed-as-draft labels and falls back to English for missing Twi copy', () => {
    expect(t('Money in', 'tw')).toBe('Sika a aba');
    expect(t('Privacy and local data', 'tw')).toBe('Privacy and local data');
  });

  it('substitutes values without treating imported content as markup or another message', () => {
    expect(
      t('Category updated for all transactions from {counterparty}.', 'en', {
        counterparty: '<script>synthetic</script>',
      }),
    ).toBe('Category updated for all transactions from <script>synthetic</script>.');
  });

  it('stores translation keys for category labels', () => {
    for (const category of CATEGORIES) {
      expect(typeof category.labelKey).toBe('string');
      expect(t(category.labelKey)).toBe(category.label);
    }
  });
});

it('keeps visible component text and accessible labels in the catalogue', async () => {
  const { readFile, readdir } = await import('node:fs/promises');
  const path = await import('node:path');
  const ts = await import('typescript');
  const failures: string[] = [];
  async function inspect(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await inspect(file);
        continue;
      }
      if (!file.endsWith('.tsx')) continue;
      const source = ts.createSourceFile(
        file,
        await readFile(file, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      function visit(node: import('typescript').Node): void {
        if (ts.isJsxText(node) && /[a-z]/i.test(node.text))
          failures.push(`${file}: untranslated JSX text`);
        if (
          ts.isJsxAttribute(node) &&
          ['title', 'description', 'placeholder', 'aria-label', 'alt'].includes(
            node.name.getText(source),
          ) &&
          node.initializer &&
          ts.isStringLiteral(node.initializer) &&
          /[a-z]/i.test(node.initializer.text)
        )
          failures.push(`${file}: untranslated accessible label`);
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
  await inspect('components');
  expect(failures).toEqual([]);
});
