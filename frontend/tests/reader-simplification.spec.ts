import { test, expect } from "@playwright/test";

test("book acquisition replaces sample inventory in reader pages", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:3000/books/alchemist");
  await expect(
    page.getByRole("heading", { name: "Where to get this book" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Find on Amazon India" }),
  ).toHaveAttribute("href", /^https:\/\/www\.amazon\.in\/s\?k=/);
  await expect(
    page.getByRole("link", { name: "Find on Open Library" }),
  ).toHaveAttribute("href", /^https:\/\/openlibrary\.org\/search\?q=/);
  await expect(page.getByLabel("Select a branch")).toHaveCount(0);
  await expect(
    page.getByText("Availability unverified", { exact: true }),
  ).toHaveCount(0);
  await page.goto("http://127.0.0.1:3000/search");
  await expect(
    page.getByRole("heading", { name: "Find something good." }),
  ).toBeVisible();
  await expect(page.getByText("Library branch", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByText("Available copies only", { exact: true }),
  ).toHaveCount(0);
});

test("homepage handoff submits once and secondary controls start collapsed", async ({
  page,
}) => {
  let sends = 0;
  await page.route("**/api/sessions/*/messages", async (route) => {
    sends++;
    expect(route.request().postDataJSON().text).toBe("A short hopeful book");
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Test response: request received" }),
    });
  });
  await page.goto("http://127.0.0.1:3000/");
  await page.getByLabel("Describe your next read").fill("A short hopeful book");
  await page.getByRole("button", { name: "Find your next book" }).click();
  await expect(page.locator(".inline-error")).toHaveText(
    "Test response: request received",
  );
  expect(sends).toBe(1);
  await expect(
    page
      .locator("details")
      .filter({
        has: page.getByText("How recommendations work", { exact: true }),
      }),
  ).not.toHaveAttribute("open");
  await expect(page.getByLabel("Add a preferred attribute")).not.toBeVisible();
});

test("canceling shelf removal keeps journal data and sends no delete", async ({
  page,
  request,
}) => {
  const response = await request.get(
    "http://127.0.0.1:3000/api/books/alchemist",
  );
  const { book } = await response.json();
  let deletes = 0;
  const entry = {
    book,
    status: "reading",
    rating: 4,
    progress: 45,
    note: "A private note to preserve",
  };
  await page.route("**/api/me/shelf", (route) =>
    route.fulfill({ json: { entries: [entry] } }),
  );
  await page.route("**/api/me/shelf/alchemist", async (route) => {
    if (route.request().method() === "DELETE") deletes++;
    await route.fulfill({ json: { removed: true } });
  });
  await page.goto("http://127.0.0.1:3000/shelf");
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain(
      "private notes, rating, and reading progress",
    );
    await dialog.dismiss();
  });
  await page
    .getByRole("button", { name: "Remove The Alchemist", exact: true })
    .click();
  expect(deletes).toBe(0);
  await expect(
    page.getByRole("link", { name: "The Alchemist", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Notes & progress" }).click();
  await expect(page.getByLabel("Private notes")).toHaveValue(entry.note);
});
