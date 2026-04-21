import { test, expect } from "@playwright/test";

test.skip(
  !process.env.PLAYWRIGHT_RUN,
  "Opt-in: PLAYWRIGHT_RUN=1, npx playwright install, npm run dev (frontend)."
);

test("smoke: /auth mostra campo de e-mail", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByPlaceholder(/e-mail|email/i).first()).toBeVisible();
});
