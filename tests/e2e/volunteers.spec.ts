import { expect, test } from "@playwright/test";

const token = process.env.ADMIN_API_TOKEN;
const testCpf = "98765432100";

test("shows the Home introduction and links on desktop and mobile", async ({ page }) => {
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/#/home");

    const intro = page.getByRole("region", { name: "Quem nós somos" });
    const phrase = intro.getByText("Educação, esporte e apoio na Vila Aparecida");
    const photo = intro.getByRole("img");
    const projects = intro.getByRole("link", { name: "Conhecer os projetos" });
    const volunteer = intro.getByRole("link", { name: "Quero ser voluntário" });

    await expect(phrase).toBeVisible();
    await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await expect(projects).toBeVisible();
    await expect(volunteer).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

    const phraseBox = (await phrase.boundingBox())!;
    const photoBox = (await photo.boundingBox())!;
    if (width === 320) {
      expect(photoBox.y).toBeGreaterThan(phraseBox.y + phraseBox.height);
    } else {
      expect(photoBox.x).toBeGreaterThanOrEqual(phraseBox.x + phraseBox.width);
    }

    await projects.click();
    await expect(page.getByRole("heading", { name: "Nossos Projetos" })).toBeVisible();
    await page.goBack();
    await volunteer.click();
    await expect(page.getByRole("heading", { name: "Formulário de Cadastro" })).toBeVisible();
  }
});

test("navigates the mobile site and closes the donation dialog with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Quem nós somos" })).toBeVisible();
  const menu = page.getByRole("button", { name: "Menu" });
  await expect(page.getByRole("link", { name: "Projetos", exact: true })).toBeHidden();
  await menu.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Modo escuro" })).toBeFocused();
  await menu.click();
  await page.getByRole("link", { name: "Projetos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cestas Solidárias" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const trigger = page.getByRole("button", { name: "Ver orientações para doação" });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(trigger).toBeFocused();
});

for (const width of [320, 1440]) {
  test(`validates registration with the keyboard at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/#/cadastro");
    const form = page.locator("form");
    for (const name of ["Identificação", "Contato", "Endereço", "Motivação"]) {
      await expect(form.getByRole("group", { name })).toBeVisible();
    }
    const name = form.getByLabel("Nome completo");
    const birth = form.getByLabel("Data de nascimento");
    const cpf = form.getByLabel("CPF");
    const [nameBox, birthBox] = await form.getByRole("group", { name: "Identificação" })
      .locator("input").evaluateAll((inputs) => inputs.map((input) => input.getBoundingClientRect().toJSON()));
    if (width === 320) {
      expect(birthBox.y).toBeGreaterThan(nameBox.y + nameBox.height);
    } else {
      expect(birthBox.x).toBeGreaterThan(nameBox.x + nameBox.width);
    }
    await name.focus();
    await page.keyboard.type("Pessoa Teste");
    await page.keyboard.press("Tab");
    await expect(birth).toBeFocused();
    await form.getByRole("button", { name: "Cadastrar" }).focus();
    await page.keyboard.press("Enter");
    await expect(birth).toBeFocused();
    await expect(birth).toHaveAccessibleDescription("Preencha este campo.");
    await expect(cpf).toHaveAttribute("aria-invalid", "true");
    await expect(name).toHaveValue("Pessoa Teste");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}

test("registers, reloads, edits and deletes a volunteer through the UI", async ({ page, request }) => {
  if (!token || !process.env.DATABASE_URL?.split("?")[0].endsWith("_test")) {
    throw new Error("Configure ADMIN_API_TOKEN e um banco dedicado com nome terminado em _test.");
  }
  const headers = { Authorization: `Bearer ${token}` };
  async function cleanupPreviousRun() {
    const response = await request.get("/api/admin/volunteers?limit=100", { headers });
    expect(response.ok()).toBeTruthy();
    const records: { id: string; nome: string }[] = await response.json();
    for (const record of records.filter((item) => item.nome === "Pessoa Teste Navegador")) {
      const details = await request.get(`/api/admin/volunteers/${record.id}`, { headers });
      if ((await details.json()).cpf === testCpf) {
        await request.delete(`/api/admin/volunteers/${record.id}`, { headers });
      }
    }
  }

  await cleanupPreviousRun();
  try {
    await page.goto("/#/cadastro");
    const form = page.locator("form");
    const name = form.getByLabel("Nome completo");
    const cpf = form.getByLabel("CPF");
    await name.fill("Pessoa");
    await form.getByLabel("Email").fill("navegador@example.org");
    await form.getByLabel("Data de nascimento").fill("1990-03-15");
    await cpf.fill("11111111111");
    await form.getByLabel("Telefone").fill("48912345678");
    await form.getByLabel("CEP").fill("88000000");
    await form.getByLabel("Endereço (rua e número)").fill("Rua de Exemplo, 42");
    await form.getByLabel("Cidade").fill("Florianópolis");
    await form.getByLabel("Estado").selectOption("SC");
    await form.getByLabel("Por que quer ser voluntário?").fill("Gostaria de apoiar as atividades da comunidade.");
    const validation = page.waitForResponse((response) =>
      response.url().endsWith("/api/volunteers") && response.status() === 422);
    await form.getByRole("button", { name: "Cadastrar" }).click();
    await validation;
    await expect(name).toBeFocused();
    await expect(name).toHaveAccessibleDescription("Informe seu nome completo.");
    await expect(cpf).toHaveAccessibleDescription("Informe um CPF válido.");
    await expect(form.getByLabel("Cidade")).toHaveValue("Florianópolis");
    await name.fill("Pessoa Teste Navegador");
    await cpf.fill(testCpf);
    await expect(cpf).toHaveAttribute("aria-invalid", "false");
    await form.getByRole("button", { name: "Cadastrar" }).click();
    await expect(page.getByRole("heading", { name: "Solicitação de cadastro recebida." })).toBeFocused();
    await expect(page.getByText(/A equipe do Instituto avalia os cadastros/)).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Iniciar outro cadastro" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Formulário de Cadastro" })).toBeFocused();
    await expect(name).toHaveValue("");
    await page.reload();
    await expect(page.getByText(/Voluntários cadastrados:/)).toBeVisible();

    await page.getByRole("link", { name: "Área administrativa" }).click();
    await page.getByLabel("Token administrativo").fill("invalid-token");
    await page.getByRole("button", { name: "Acessar" }).click();
    await expect(page.getByRole("alert")).toHaveText("Credencial administrativa inválida.");
    await page.getByLabel("Token administrativo").fill(token);
    await page.getByRole("button", { name: "Acessar" }).click();
    await page.getByRole("button", { name: "Pessoa Teste Navegador" }).click();
    await expect(form.getByLabel("Cidade")).toHaveValue("Florianópolis");
    await form.getByLabel("Cidade").fill("São José");
    let allowSave = () => {};
    const saveGate = new Promise<void>((resolve) => { allowSave = resolve; });
    await page.route("**/api/admin/volunteers/*", async (route) => {
      if (route.request().method() === "PUT") await saveGate;
      await route.continue();
    });
    try {
      await form.getByRole("button", { name: "Salvar alterações" }).click();
      await expect(page.getByRole("button", { name: "Sair" })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Voltar à lista" })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Excluir cadastro" })).toBeDisabled();
    } finally {
      allowSave();
    }
    await expect(page.getByText("Cadastro atualizado.")).toBeVisible();
    await page.getByRole("button", { name: "Voltar à lista" }).click();
    await page.getByRole("button", { name: "Pessoa Teste Navegador" }).click();
    await expect(form.getByLabel("Cidade")).toHaveValue("São José");
    await page.getByRole("button", { name: "Excluir cadastro" }).click();
    await page.getByRole("button", { name: "Confirmar exclusão" }).click();
    await expect(page.getByText("Cadastro excluído.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pessoa Teste Navegador" })).toHaveCount(0);
  } finally {
    await cleanupPreviousRun();
  }
});

test("aligns the header and project cards and exposes the registration link", async ({ page }) => {
  await page.goto("/#/projetos");
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(3);
  const theme = page.getByRole("button", { name: "Modo escuro" });
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const content = (await page.getByRole("main").boundingBox())!;
    const brand = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
    const themeBox = (await theme.boundingBox())!;
    expect(brand.x).toBeGreaterThan(content.x);
    expect(themeBox.x + themeBox.width).toBeLessThanOrEqual(content.x + content.width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  for (const card of await cards.all()) {
    const statusBeforeTitle = await card.evaluate((element) => {
      const status = element.querySelector(".badge")!.getBoundingClientRect();
      const title = element.querySelector("h3")!.getBoundingClientRect();
      return status.bottom <= title.top;
    });
    expect(statusBeforeTitle).toBe(true);
  }
  await theme.click();
  const registration = page.getByRole("link", { name: "Quero me cadastrar como voluntário" });
  await expect(registration).toHaveCSS("color", "rgb(255, 255, 255)");
  await registration.click();
  await expect(page.getByRole("heading", { name: "Formulário de Cadastro" })).toBeVisible();
});
