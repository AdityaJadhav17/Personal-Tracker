import { ESLint } from 'eslint';

test('AC-84.3 a spec that takes test straight from Playwright fails lint', async () => {
  const [result] = await new ESLint().lintText(
    "import { test } from '@playwright/test';\n\ntest('x', () => {});\n",
    { filePath: 'e2e/forgot-the-clock.spec.ts' },
  );

  expect(result?.messages.map((message) => message.ruleId)).toContain(
    'no-restricted-imports',
  );
}, 30_000);

test('AC-84.3 the clock itself may import it', async () => {
  const [result] = await new ESLint().lintText(
    "import { test } from '@playwright/test';\n\nexport { test };\n",
    { filePath: 'e2e/clock.ts' },
  );

  expect(result?.messages.map((message) => message.ruleId)).not.toContain(
    'no-restricted-imports',
  );
}, 30_000);
