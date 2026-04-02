const { chromium } = require("playwright");

(async () => {
  const result = {
    clientUrl: "http://localhost:5173/",
    apiHealthUrl: "http://localhost:5001/api/health",
    apiHealth: null,
    appShell: null,
    action: null,
    consoleErrorsBeforeAction: [],
    consoleErrorsAfterAction: [],
    ignoredConsoleErrorsAfterAction: [],
    blockingConsoleErrorsAfterAction: [],
    pageErrorsBeforeAction: [],
    pageErrorsAfterAction: []
  };

  try {
    const apiRes = await fetch(result.apiHealthUrl);
    const apiBody = await apiRes.text();
    result.apiHealth = {
      status: apiRes.status,
      ok: apiRes.ok,
      bodySnippet: apiBody.slice(0, 200)
    };

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    let phase = "load";
    const consoleErrors = [];
    const pageErrors = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push({ phase, text: msg.text() });
      }
    });

    page.on("pageerror", (err) => {
      pageErrors.push({ phase, text: String(err && err.message ? err.message : err) });
    });

    const response = await page.goto(result.clientUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    if (!response || !response.ok()) {
      throw new Error("Home page did not load successfully: " + (response ? response.status() : "no response"));
    }

    await page.waitForFunction(() => {
      const root = document.querySelector("#root");
      return Boolean(root && root.childElementCount > 0);
    }, { timeout: 12000 });

    const shell = await page.evaluate(() => {
      const root = document.querySelector("#root");
      const rootText = (root && root.textContent ? root.textContent : "").trim();
      const rootChildren = root ? root.childElementCount : 0;
      const hasShellElement = Boolean(
        document.querySelector("main, nav, header, form, [data-testid*='app'], [id*='app']")
      );
      return {
        title: document.title,
        rootExists: Boolean(root),
        rootChildren,
        hasContent: rootText.length > 0 || rootChildren > 0,
        hasShellElement,
        textSnippet: rootText.slice(0, 160)
      };
    });

    result.appShell = shell;

    if (!shell.rootExists || !shell.hasContent) {
      throw new Error("Main app shell did not render in #root. Details: " + JSON.stringify(shell));
    }

    try {
      await page.waitForFunction(() => {
        return document.querySelectorAll("button, a[href], [role='button']").length > 0;
      }, { timeout: 15000 });
    } catch (_timeoutError) {
      // Continue and attempt fallback interaction discovery below.
    }

    const candidates = [
      { name: "Login button", locator: page.getByRole("button", { name: /login|sign in/i }) },
      { name: "Register button", locator: page.getByRole("button", { name: /register|sign up|create account/i }) },
      { name: "Login link", locator: page.getByRole("link", { name: /login|sign in/i }) },
      { name: "Register link", locator: page.getByRole("link", { name: /register|sign up/i }) },
      { name: "First nav link", locator: page.locator("nav a").first() },
      { name: "First button", locator: page.locator("button").first() },
      { name: "First link", locator: page.locator("a[href]").first() }
    ];

    let chosen = null;
    for (const candidate of candidates) {
      try {
        const count = await candidate.locator.count();
        if (count < 1) {
          continue;
        }
        const target = candidate.locator.first();
        const visible = await target.isVisible();
        if (!visible) {
          continue;
        }
        chosen = { name: candidate.name, locator: target };
        break;
      } catch (_err) {
        // Continue searching for an actionable element.
      }
    }

    if (!chosen) {
      throw new Error("No interactive button/link found for smoke interaction.");
    }

    result.consoleErrorsBeforeAction = consoleErrors.filter((entry) => entry.phase !== "action");
    result.pageErrorsBeforeAction = pageErrors.filter((entry) => entry.phase !== "action");

    const beforeUrl = page.url();
    phase = "action";
    await chosen.locator.click({ timeout: 10000 });
    await page.waitForTimeout(1500);
    const afterUrl = page.url();

    result.action = {
      selected: chosen.name,
      urlBefore: beforeUrl,
      urlAfter: afterUrl,
      navigated: beforeUrl !== afterUrl
    };

    result.consoleErrorsAfterAction = consoleErrors.filter((entry) => entry.phase === "action");
    result.pageErrorsAfterAction = pageErrors.filter((entry) => entry.phase === "action");

    const hasGoogleOriginWarning = result.consoleErrorsAfterAction.some((entry) =>
      entry.text.includes("[GSI_LOGGER]: The given origin is not allowed for the given client ID.")
    );

    result.ignoredConsoleErrorsAfterAction = result.consoleErrorsAfterAction.filter((entry) => {
      if (entry.text.includes("[GSI_LOGGER]: The given origin is not allowed for the given client ID.")) {
        return true;
      }
      if (
        hasGoogleOriginWarning &&
        entry.text.includes("Failed to load resource: the server responded with a status of 403")
      ) {
        return true;
      }
      return false;
    });

    result.blockingConsoleErrorsAfterAction = result.consoleErrorsAfterAction.filter(
      (entry) => !result.ignoredConsoleErrorsAfterAction.includes(entry)
    );

    await browser.close();

    if (result.pageErrorsAfterAction.length > 0) {
      throw new Error("Runtime page errors detected after action: " + JSON.stringify(result.pageErrorsAfterAction));
    }

    if (result.blockingConsoleErrorsAfterAction.length > 0) {
      throw new Error(
        "Blocking console errors detected after action: " +
          JSON.stringify(result.blockingConsoleErrorsAfterAction)
      );
    }

    console.log("SMOKE_RESULT=" + JSON.stringify(result));
  } catch (error) {
    console.log("SMOKE_FAILURE=" + JSON.stringify({
      message: error && error.message ? error.message : String(error),
      partialResult: result
    }));
    process.exit(1);
  }
})();
