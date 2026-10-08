import { test, expect } from "@playwright/test";

/**
 * Flusso autenticato. Richiede un utente di prova:
 *   E2E_USER_EMAIL, E2E_USER_PASSWORD
 * Senza queste variabili il file viene saltato, così la CI resta verde.
 */
const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const configured = Boolean(email && password);

test.describe("utente autenticato", () => {
  test.skip(!configured, "E2E_USER_EMAIL / E2E_USER_PASSWORD non configurate");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Entra" }).click();
    await expect(page).toHaveURL(/\/(\?.*)?$/);
  });

  test("la home mostra la prossima partita o un invito", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("il profilo mostra il campo 2D con i tre formati", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("tab", { name: /calcio a 5/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /calcio a 8/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /calcio a 11/i })).toBeVisible();

    // Il portiere del calcio a 8 è un bottone del campo.
    await page.getByRole("button", { name: /Difensore centrale — a 8/i }).click();
    await expect(page.getByRole("button", { name: /Difensore centrale — a 8/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Si può togliere dal riepilogo testuale.
    await page.getByRole("button", { name: /Togli questa posizione/i }).first().click();
    await expect(
      page.getByRole("button", { name: /Difensore centrale — a 8/i }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  test("i sondaggi sono raggiungibili dalla sezione partite", async ({ page }) => {
    await page.goto("/matches");
    // Il tab può portare il pallino dei voti in sospeso, quindi il nome
    // accessibile è "Sondaggi: N sondaggi in attesa del tuo voto".
    await page.getByRole("tab", { name: /^Sondaggi/ }).click();
    await expect(page).toHaveURL(/\/polls/);
    await expect(page.getByRole("heading", { level: 1, name: "Sondaggi" })).toBeVisible();
  });

  test("la navigazione principale è percorribile", async ({ page, isMobile }) => {
    test.skip(!isMobile, "controllo specifico della bottom nav");

    for (const label of ["Home", "Programma", "Chat", "Giocatori", "Profilo"]) {
      // Stessa ragione: «Programma» può diventare «Programma: 1 sondaggio…».
      await page
        .getByRole("link", { name: new RegExp(`^${label}`) })
        .first()
        .click();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });
});
