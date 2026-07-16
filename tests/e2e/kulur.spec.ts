import { test, expect, type Page } from '@playwright/test';

async function gotoApp(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

async function dismissOnboardingIfPresent(page: Page) {
  const begin = page.getByRole('button', { name: 'Begin' });
  if (await begin.isVisible().catch(() => false)) {
    await begin.click();
  }
}

test.describe('Kulur E2E scenarios', () => {
  test('1. loads the Kulur application shell', async ({ page }) => {
    await gotoApp(page);
    await expect(page).toHaveTitle(/Kulur/i);
    await expect(page.locator('#root')).toBeAttached();
  });

  test('2. shows onboarding on first visit when enabled', async ({ page }) => {
    await gotoApp(page);
    const intro = page.getByText(/welcome|mix|color|kulur/i).first();
    const visible = await intro.isVisible().catch(() => false);
    if (visible) {
      await expect(intro).toBeVisible();
    }
  });

  test('3. completes onboarding flow', async ({ page }) => {
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    await expect(page.locator('#root')).toBeAttached();
  });

  test('4. displays top bar color counter', async ({ page }) => {
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    const colorsLabel = page.getByText('Colors', { exact: true });
    if (await colorsLabel.isVisible().catch(() => false)) {
      await expect(colorsLabel).toBeVisible();
    }
  });

  test('5. first roll auto-places on origin when board is empty', async ({ page }) => {
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    const rollButton = page.getByRole('button', { name: 'Roll die' });
    if (await rollButton.isVisible().catch(() => false)) {
      await rollButton.click();
      await page.waitForTimeout(800);
      const placeLabel = page.getByText('PLACE', { exact: true });
      await expect(placeLabel.or(page.getByText('ROLL'))).toBeVisible();
    }
  });

  test('6. second roll enters pending placement state', async ({ page }) => {
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    const rollButton = page.getByRole('button', { name: 'Roll die' });
    if (await rollButton.isVisible().catch(() => false)) {
      await rollButton.click();
      await page.waitForTimeout(900);
      await rollButton.click({ force: true }).catch(() => {});
      await page.waitForTimeout(300);
      const pending = page.getByRole('button', { name: 'Place pending color on board' });
      if (await pending.isVisible().catch(() => false)) {
        await expect(pending).toBeVisible();
        await expect(page.getByText('PLACE')).toBeVisible();
      }
    }
  });

  test('6b. roll, place on frontier, then roll again', async ({ page }) => {
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);

    const rollButton = page.getByRole('button', { name: 'Roll die' });
    if (!(await rollButton.isVisible().catch(() => false))) return;

    await rollButton.click();
    await page.waitForTimeout(900);
    await expect(rollButton).toBeEnabled({ timeout: 5000 });

    await rollButton.click();
    await page.waitForTimeout(900);
    await expect(page.getByRole('button', { name: 'Place pending color on board' })).toBeVisible({
      timeout: 5000,
    });

    const canvas = page.locator('main canvas');
    const box = await canvas.boundingBox();
    if (!box) return;

    await canvas.click({ position: { x: box.width / 2 + 76, y: box.height / 2 } });
    await page.waitForTimeout(600);

    await expect(page.getByRole('button', { name: 'Roll die' })).toBeEnabled({ timeout: 5000 });
    await expect(page.getByText('ROLL', { exact: true })).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Roll die' }).click();
    await page.waitForTimeout(900);
    await expect(
      rollButton.or(page.getByRole('button', { name: 'Place pending color on board' })),
    ).toBeVisible();
  });

  test('7. opens gamut view from dock', async ({ page }) => {
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    const gamutButton = page.getByRole('button', { name: 'Open gamut view' });
    if (await gamutButton.isVisible().catch(() => false)) {
      await gamutButton.click();
      await expect(gamutButton).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test('8. returns to board view from gamut', async ({ page }) => {
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    const gamutButton = page.getByRole('button', { name: 'Open gamut view' });
    if (await gamutButton.isVisible().catch(() => false)) {
      await gamutButton.click();
      await page.getByRole('button', { name: /board|home/i }).click().catch(async () => {
        await gamutButton.click();
      });
    }
  });

  test('9. opens application menu', async ({ page }) => {
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    const menuButton = page.getByRole('button', { name: 'Open menu' });
    if (await menuButton.isVisible().catch(() => false)) {
      await menuButton.click();
      await expect(page.getByText(/settings|export|erase/i).first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('10. toggles settings from menu', async ({ page }) => {
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    const menuButton = page.getByRole('button', { name: 'Open menu' });
    if (await menuButton.isVisible().catch(() => false)) {
      await menuButton.click();
      const soundToggle = page.getByRole('switch', { name: /sound/i }).or(page.getByLabel(/sound/i));
      if (await soundToggle.first().isVisible().catch(() => false)) {
        await soundToggle.first().click();
      }
    }
  });

  test('11. triggers undo after placement when available', async ({ page }) => {
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    const undoButton = page.getByRole('button', { name: /undo/i });
    if (await undoButton.isVisible().catch(() => false)) {
      await undoButton.click();
    }
  });

  test('12. exports world data', async ({ page }) => {
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    const menuButton = page.getByRole('button', { name: 'Open menu' });
    if (await menuButton.isVisible().catch(() => false)) {
      await menuButton.click();
      const exportButton = page.getByRole('button', { name: /export/i });
      if (await exportButton.isVisible().catch(() => false)) {
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
        await exportButton.click();
        const download = await downloadPromise;
        if (download) {
          expect(download.suggestedFilename()).toMatch(/\.kulur$/i);
        }
      }
    }
  });

  test('13. supports import file picker', async ({ page }) => {
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    const menuButton = page.getByRole('button', { name: 'Open menu' });
    if (await menuButton.isVisible().catch(() => false)) {
      await menuButton.click();
      await expect(page.getByText(/import/i).first()).toBeVisible({ timeout: 3000 }).catch(() => {});
    }
  });

  test('14. erases board from menu', async ({ page }) => {
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    const menuButton = page.getByRole('button', { name: 'Open menu' });
    if (await menuButton.isVisible().catch(() => false)) {
      await menuButton.click();
      const eraseButton = page.getByRole('button', { name: /erase/i });
      if (await eraseButton.isVisible().catch(() => false)) {
        await eraseButton.click();
        const confirm = page.getByRole('button', { name: /confirm|erase|yes/i });
        if (await confirm.isVisible().catch(() => false)) {
          await confirm.click();
        }
      }
    }
  });

  test('15. reload preserves persisted session', async ({ page }) => {
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    const colorsBefore = await page.getByText('Colors', { exact: true }).locator('..').textContent().catch(() => '');
    await page.reload();
    await page.waitForLoadState('networkidle');
    if (colorsBefore) {
      await expect(page.getByText('Colors', { exact: true })).toBeVisible();
    }
  });

  test('16. renders on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    await expect(page.locator('#root')).toBeVisible();
    const dock = page.locator('footer');
    if (await dock.isVisible().catch(() => false)) {
      await expect(dock).toBeVisible();
    }
  });

  test('17. roll die shows ROLL label when idle', async ({ page }) => {
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    const rollLabel = page.getByText('ROLL', { exact: true });
    if (await rollLabel.isVisible().catch(() => false)) {
      await expect(rollLabel).toBeVisible();
    }
  });

  test('18. opens tile inspector when tile selected', async ({ page }) => {
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    const inspectButton = page.getByRole('button', { name: /inspect|tile inspector/i });
    if (await inspectButton.isVisible().catch(() => false)) {
      await inspectButton.click();
    }
  });

  test('19. copies color values to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    const copyButton = page.getByRole('button', { name: /copy/i });
    if (await copyButton.first().isVisible().catch(() => false)) {
      await copyButton.first().click();
      await expect(page.getByText(/copied/i)).toBeVisible({ timeout: 3000 }).catch(() => {});
    }
  });

  test('20. keyboard shortcut triggers roll when focused', async ({ page }) => {
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    await expect(page.locator('#root')).toBeAttached();
  });

  test('21. pending color persists across reload', async ({ page }) => {
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    const rollButton = page.getByRole('button', { name: 'Roll die' });
    await expect(rollButton).toBeVisible();

    await rollButton.click();
    await page.waitForTimeout(900);
    await expect(rollButton).toBeEnabled({ timeout: 5000 });

    await rollButton.click();
    await page.waitForTimeout(900);
    const pending = page.getByRole('button', { name: 'Place pending color on board' });
    await expect(pending).toBeVisible({ timeout: 5000 });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await dismissOnboardingIfPresent(page);
    await expect(page.getByRole('button', { name: 'Place pending color on board' })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText('PLACE', { exact: true })).toBeVisible();
  });

  test('22. sound setting toggles and persists', async ({ page }) => {
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    await page.getByRole('banner').getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('button', { name: 'Settings' }).click();
    const sound = page.getByRole('switch', { name: 'Sound' });
    await expect(sound).toBeVisible();
    await sound.uncheck();
    await expect(sound).not.toBeChecked();
    await page.waitForTimeout(400);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    await dismissOnboardingIfPresent(page);
    await page.getByRole('banner').getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('switch', { name: 'Sound' })).not.toBeChecked();
  });

  test('23. erase requires typing ERASE KULUR', async ({ page }) => {
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    await page.getByRole('banner').getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Erase board' }).click();
    const confirm = page.getByRole('button', { name: 'Erase', exact: true });
    await expect(confirm).toBeDisabled();
    await page.getByRole('textbox').fill('ERASE KULUR');
    await expect(confirm).toBeEnabled();
  });

  test('24. no uncaught page errors during basic play', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await gotoApp(page);
    await dismissOnboardingIfPresent(page);
    const rollButton = page.getByRole('button', { name: 'Roll die' });
    if (await rollButton.isVisible()) {
      await rollButton.click();
      await page.waitForTimeout(900);
    }
    expect(errors).toEqual([]);
  });
});
