import {test,expect} from '@playwright/test';

test('constrained librarian recommendations can be saved and resumed',async({page})=>{
  await page.goto('/librarian');
  await expect(page.getByText('Hello, curious reader. What would you like to find?')).toBeVisible();
  await page.getByLabel('Message your librarian').fill('A clever mystery under 350 pages available in the library');
  await page.getByRole('button',{name:'Send request',exact:true}).click();
  await expect(page.getByText('max pages: 350')).toBeVisible();
  await expect(page.getByRole('link',{name:'The Murder of Roger Ackroyd',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Save The Murder of Roger Ackroyd',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Added to your reading shelf.');
  await page.getByRole('link',{name:'My shelf',exact:true}).click();
  await expect(page.getByRole('link',{name:'The Murder of Roger Ackroyd',exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link',{name:'The Murder of Roger Ackroyd',exact:true})).toBeVisible();
});

test('an unsupported language does not borrow availability from another edition',async({page})=>{
  await page.goto('/search?language=hin&available_only=true');
  await expect(page.getByRole('heading',{name:'A little too specific?'})).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
});

test('evidence modal supports keyboard closing',async({page})=>{
  await page.goto('/books/alchemist');
  await page.getByRole('button',{name:'Explore its themes and evidence',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('probability');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
