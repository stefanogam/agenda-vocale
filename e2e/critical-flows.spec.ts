// e2e/critical-flows.spec.ts
//
// Esegui con: npm run build && npm run preview (in un terminale)
// poi: npx playwright test (in un altro)
//
// L'app parte senza dati precaricati (niente account, niente seed di
// esempio): ogni test crea da sé quello che gli serve.

import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("crea un appuntamento manualmente e lo trova in Lista", async ({ page }) => {
  await page.getByRole("button", { name: "Crea manualmente" }).click();

  await page.getByPlaceholder("Titolo").fill("Visita oculistica");
  await page.getByRole("button", { name: "Crea" }).click();

  await expect(page.getByText("Visita oculistica")).toBeVisible();
});

test("il pulsante Crea resta disabilitato senza titolo", async ({ page }) => {
  await page.getByRole("button", { name: "Crea manualmente" }).click();
  await expect(page.getByRole("button", { name: "Crea" })).toBeDisabled();
});

test("un appuntamento ricorrente mostra la scelta occorrenza/serie all'eliminazione", async ({ page }) => {
  // crea un appuntamento ricorrente
  await page.getByRole("button", { name: "Crea manualmente" }).click();
  await page.getByPlaceholder("Titolo").fill("Palestra");
  await page.getByText("Si ripete").click();
  await page.getByRole("button", { name: "Crea" }).click();
  await expect(page.getByText("Palestra")).toBeVisible();

  // apre il dettaglio ed elimina
  await page.getByText("Palestra").click();
  await page.getByRole("button", { name: "Elimina" }).click();

  await expect(page.getByText("Eliminare cosa?")).toBeVisible();
  await expect(page.getByText("Solo questo evento")).toBeVisible();
  await expect(page.getByText("Questo e i successivi")).toBeVisible();
  await expect(page.getByText("Tutta la serie")).toBeVisible();
});

test("eliminare un appuntamento singolo NON mostra la scelta occorrenza/serie", async ({ page }) => {
  await page.getByRole("button", { name: "Crea manualmente" }).click();
  await page.getByPlaceholder("Titolo").fill("Dentista");
  await page.getByRole("button", { name: "Crea" }).click();
  await expect(page.getByText("Dentista")).toBeVisible();

  await page.getByText("Dentista").click();
  await page.getByRole("button", { name: "Elimina" }).click();

  await expect(page.getByText("Eliminare cosa?")).not.toBeVisible();
  await expect(page.getByText("Dentista")).not.toBeVisible();
});

test("la ricerca trova un appuntamento per titolo parziale", async ({ page }) => {
  await page.getByRole("button", { name: "Crea manualmente" }).click();
  await page.getByPlaceholder("Titolo").fill("Riunione di team");
  await page.getByRole("button", { name: "Crea" }).click();

  await page.getByRole("button", { name: "Cerca" }).click();
  await page.getByPlaceholder("Cerca appuntamenti, scadenze, radar…").fill("riunione");

  await expect(page.getByText("Riunione di team")).toBeVisible();
});

test("una nuova categoria creata nelle impostazioni compare nel form di creazione", async ({ page }) => {
  await page.getByRole("button", { name: "Impostazioni" }).click();
  await page.getByRole("button", { name: "Nuova categoria" }).click();
  await page.getByPlaceholder("Nome categoria (es. Viaggi)").fill("Viaggi");
  await page.getByRole("button", { name: "Crea categoria" }).click();
  await expect(page.getByText("Viaggi")).toBeVisible();

  await page.getByRole("button", { name: "Agenda" }).click();
  await page.getByRole("button", { name: "Crea manualmente" }).click();
  await expect(page.getByText("Viaggi")).toBeVisible();
});
