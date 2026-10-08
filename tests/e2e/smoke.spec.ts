import { expect, test } from "@playwright/test";

test("la home protetta rimanda al login quando non c'è sessione", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Entra" })).toBeVisible();
});

test("il login mostra i campi e i link di recupero", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("link", { name: /password/i })).toBeVisible();
});

test("la registrazione chiede nickname, email e password", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByLabel("Nickname")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});

test("il form di registrazione valida lato client", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Nickname").fill("a");
  await page.getByLabel("Email").fill("non-una-email");
  await page.getByRole("button", { name: "Registrati" }).click();

  // Il browser blocca l'invio: restiamo sulla pagina di registrazione.
  await expect(page).toHaveURL(/\/register/);
});
