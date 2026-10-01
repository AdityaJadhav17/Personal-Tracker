test('AC-84.4 every test starts on 15 September 2026 at 10:00 local', () => {
  expect(new Date()).toEqual(new Date(2026, 8, 15, 10, 0, 0, 0));
});

test('AC-84.4 timers stay real, so only the date is pinned', async () => {
  await new Promise((resolve) => setTimeout(resolve, 1));
  expect(new Date().getTime()).toBeGreaterThanOrEqual(
    new Date(2026, 8, 15, 10).getTime(),
  );
});
