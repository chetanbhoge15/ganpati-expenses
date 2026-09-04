// =====================================================
// GANPATI MANDAL ACCOUNTS
// FULL UPDATED counter.js
// =====================================================

export function setupApp(element) {

  const authKey = "ganpati_auth";
  let isUnlocked = sessionStorage.getItem("ganpati_unlocked") === "true";

  // ===================================================
  // STATE
  // ===================================================

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from(
    { length: 10 },
    (_, index) => String(currentYear + index)
  );
  let selectedYear =
    availableYears.includes(localStorage.getItem("ganpati_selected_year"))
      ? localStorage.getItem("ganpati_selected_year")
      : availableYears[0];

  let currentPage = "home";

  // ===================================================
  // CONFIG
  // ===================================================

  const collectionTypes = {
    boys: {
      title: "Boys Vargani",
      icon: "👦",
      label: "Boys"
    },

    main: {
      title: "Main Vargani",
      icon: "⭐",
      label: "Main"
    },

    family: {
      title: "Family Vargani",
      icon: "👨‍👩‍👧",
      label: "Family"
    }
  };

  // ===================================================
  // STORAGE
  // ===================================================

  function key(type) {
    return `ganpati_${selectedYear}_${type}`;
  }

  function getData(type) {
    try {
      return JSON.parse(
        localStorage.getItem(key(type))
      ) || [];
    } catch {
      return [];
    }
  }

  function saveData(type, data) {
    localStorage.setItem(
      key(type),
      JSON.stringify(data)
    );

    void saveCloudData(type, data);
  }

  const cloudTypes = ["boys", "main", "family", "visarjan", "expenses"];

  function getLocalAccount() {
    try {
      return JSON.parse(localStorage.getItem(authKey) || "null");
    } catch {
      return null;
    }
  }

  async function cloudRequest(body) {
    const response = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const result = await readResponse(response);
    if (!response.ok || !result) throw new Error(result?.error || "Shared data service is unavailable.");
    return result;
  }

  async function saveCloudData(type, data) {
    const account = getLocalAccount();
    if (!account?.loginId || !account?.passwordHash) return;

    try {
      await cloudRequest({
        action: "save",
        loginId: account.loginId,
        passwordHash: account.passwordHash,
        year: selectedYear,
        type,
        data
      });
    } catch {
      // Local storage remains available when the shared service is offline.
    }
  }

  async function syncCloudData(account) {
    if (!account?.loginId || !account?.passwordHash) return;

    for (const type of cloudTypes) {
      try {
        const result = await cloudRequest({
          action: "get",
          loginId: account.loginId,
          passwordHash: account.passwordHash,
          year: selectedYear,
          type
        });
        const localData = getData(type);
        const remoteData = Array.isArray(result.data) ? result.data : [];
        const merged = [...remoteData, ...localData.filter(localItem => !remoteData.some(remoteItem => String(remoteItem.id) === String(localItem.id)))];
        localStorage.setItem(key(type), JSON.stringify(merged));
        if (merged.length !== remoteData.length) await saveCloudData(type, merged);
      } catch {
        // Keep cached records usable if synchronization is unavailable.
      }
    }
  }

  // ===================================================
  // HELPERS
  // ===================================================

  function money(value) {
    return (
      "₹" +
      Number(value || 0).toLocaleString("en-IN")
    );
  }

  function num(value) {
    return Number(value || 0);
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function readResponse(response) {
    const text = await response.text();

    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return null;
    }
  }

  function hashValue(value) {
    let hash = 2166136261;

    for (const character of value) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(16);
  }

  function authScreen() {
    const savedAuth = localStorage.getItem(authKey);
    let account = null;

    try {
      account = savedAuth ? JSON.parse(savedAuth) : null;
    } catch {
      account = null;
    }

    const hasAccount = Boolean(account?.loginId && account?.passwordHash);
    const savedLoginId = account?.loginId || "";
    const savedEmail = account?.email || "";

    return authFormScreen(hasAccount, savedLoginId, savedEmail);
  }

  function authFormScreen(hasAccount, savedLoginId = "", savedEmail = "", mode = hasAccount ? "login" : "create") {
    const isResetRequest = mode === "reset-request";
    const isResetVerify = mode === "reset-verify";
    const isCreate = mode === "create";

    return `
      <main class="auth-screen">
        <section class="auth-card">
          <div class="auth-mark">ॐ</div>
          <span class="section-tag">GANPATI MANDAL ACCOUNTS</span>
          <h1>${isResetRequest || isResetVerify ? "Reset password" : isCreate ? "Create your login" : "Welcome back"}</h1>
          <p>
            ${isResetRequest
              ? "We will send a one-time password to your registered email."
              : isResetVerify
                ? "Enter the one-time password sent to your email."
              : isCreate
                ? "Create a login ID and password for this browser."
                : "Sign in to view the expense records."}
          </p>
          <form id="authForm" class="auth-form" data-auth-mode="${mode}">
            <label>
              <span>Login ID</span>
              <input id="authLoginId" type="text" minlength="3" maxlength="30" value="${isCreate ? "" : escapeHTML(savedLoginId)}" autocomplete="username" ${isResetVerify ? "readonly" : ""} required />
            </label>
            ${isCreate || isResetRequest || mode === "login" ? `
              <label>
                <span>Email address</span>
                <input id="authEmail" type="email" value="${isCreate ? "" : escapeHTML(savedEmail)}" autocomplete="email" required />
              </label>
            ` : ""}
            ${isResetVerify ? `
              <label>
                <span>One-time password</span>
                <input id="authOtp" type="text" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="one-time-code" required />
              </label>
            ` : ""}
            ${!isResetRequest ? `
              <label>
                <span>${isCreate ? "Create password" : isResetVerify ? "New password" : "Password"}</span>
                <input id="authPassword" type="password" minlength="6" maxlength="64" autocomplete="${isCreate || isResetVerify ? "new-password" : "current-password"}" required />
              </label>
            ` : ""}
            ${isCreate || isResetVerify ? `
              <label>
                <span>Confirm password</span>
                <input id="authConfirmPassword" type="password" minlength="6" maxlength="64" autocomplete="new-password" required />
              </label>
            ` : ""}
            <p id="authError" class="auth-error" role="alert"></p>
            <button type="submit" class="save-btn">${isResetRequest ? "Send OTP" : isResetVerify ? "Reset password" : isCreate ? "Create account" : "Log in"}</button>
          </form>
          <div class="auth-links">
            ${hasAccount && !isCreate && !isResetRequest && !isResetVerify ? `
              <button type="button" class="auth-link" data-auth-mode="reset-request">Forgot password?</button>
              <button type="button" class="auth-link" data-auth-mode="create">Create new account</button>
            ` : !hasAccount && isCreate ? `
              <button type="button" class="auth-link" data-auth-mode="login">Already have an account? Log in</button>
            ` : `
              <button type="button" class="auth-link" data-auth-mode="login">Back to login</button>
            `}
          </div>
          <small class="auth-note">${isCreate ? "Your email is used only for password recovery." : "This protects access on this browser. OTPs expire after 10 minutes."}</small>
        </section>
      </main>
    `;
  }

  function setupAuth() {
    const form = document.querySelector("#authForm");
    if (!form) return;

    document.querySelectorAll("button[data-auth-mode]").forEach(button => {
      button.addEventListener("click", () => {
        const savedAuth = localStorage.getItem(authKey);
        let account = null;

        try {
          account = savedAuth ? JSON.parse(savedAuth) : null;
        } catch {
          account = null;
        }

        element.innerHTML = authFormScreen(Boolean(account?.loginId && account?.passwordHash), account?.loginId || "", account?.email || "", button.dataset.authMode);
        setupAuth();
      });
    });

    form.addEventListener("submit", async event => {
      event.preventDefault();

      const loginId = document.querySelector("#authLoginId").value.trim();
      const email = document.querySelector("#authEmail")?.value.trim().toLowerCase();
      const password = document.querySelector("#authPassword")?.value || "";
      const confirmPassword = document.querySelector("#authConfirmPassword");
      const otp = document.querySelector("#authOtp")?.value.trim();
      const error = document.querySelector("#authError");
      const savedAuth = localStorage.getItem(authKey);
      let account = null;
      const mode = form.dataset.authMode;

      if (savedAuth) {
        try {
          account = JSON.parse(savedAuth);
        } catch {
          account = null;
        }
      }

      if (!loginId || loginId.length < 3) {
        error.textContent = "Login ID must be at least 3 characters.";
        return;
      }

      if ((mode === "create" || mode === "reset-verify") && confirmPassword && password !== confirmPassword.value) {
        error.textContent = "Passwords do not match.";
        return;
      }

      if (mode === "reset-request") {
        if (!account || account.loginId !== loginId || account.email !== email) {
          error.textContent = "Login ID and registered email do not match.";
          return;
        }

        try {
          const response = await fetch("/api/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ loginId, email })
          });
          const result = await readResponse(response);
          if (!response.ok || !result) throw new Error(result?.error || "OTP service is unavailable. Deploy the API and configure its environment variables.");
          element.innerHTML = authFormScreen(true, loginId, email, "reset-verify");
          setupAuth();
        } catch (requestError) {
          error.textContent = requestError.message;
        }
        return;
      }

      if (savedAuth && mode !== "create") {
        if (mode === "login" && (!account || account.loginId !== loginId || account.passwordHash !== hashValue(password))) {
          error.textContent = "Incorrect login ID or password.";
          return;
        }

        if (mode === "login" && account.email && account.email !== email) {
          error.textContent = "Incorrect login ID or password.";
          return;
        }

        if (mode === "login" && !account.email) {
          account.email = email;
          localStorage.setItem(authKey, JSON.stringify(account));
        }

        if (mode === "login") {
          try {
            await fetch("/api/account", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "create", ...account })
            });
          } catch {
            // Existing local accounts can still log in while the service is offline.
          }
        }
      }

      if (mode === "reset-verify") {
        if (!/^\d{6}$/.test(otp)) {
          error.textContent = "Enter the 6-digit OTP.";
          return;
        }

        try {
          const response = await fetch("/api/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ loginId, email: account.email, otp })
          });
          const result = await readResponse(response);
          if (!response.ok || !result) throw new Error(result?.error || "OTP service is unavailable. Deploy the API and configure its environment variables.");
        } catch (requestError) {
          error.textContent = requestError.message;
          return;
        }
      }

      if (mode === "login" && !account) {
        try {
          const response = await fetch("/api/account", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "login", loginId, email, passwordHash: hashValue(password) })
          });
          const result = await readResponse(response);
          if (!response.ok || !result?.account) throw new Error(result?.error || "Incorrect login ID, email, or password.");
          account = result.account;
          localStorage.setItem(authKey, JSON.stringify(account));
        } catch (requestError) {
          error.textContent = requestError.message;
          return;
        }
      }

      if (mode === "create" || mode === "reset-verify") {
        const nextAccount = {
          loginId,
          email: mode === "create" ? email : account.email,
          passwordHash: hashValue(password)
        };

        if (mode === "create") {
          try {
            const response = await fetch("/api/account", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "create", ...nextAccount })
            });
            const result = await readResponse(response);
            if (!response.ok || !result?.account) throw new Error(result?.error || "Unable to create shared account.");
          } catch (requestError) {
            error.textContent = requestError.message;
            return;
          }
          localStorage.setItem(authKey, JSON.stringify(nextAccount));
        }
        localStorage.setItem(authKey, JSON.stringify(nextAccount));
      }

      sessionStorage.setItem("ganpati_unlocked", "true");
      isUnlocked = true;
      await syncCloudData(getLocalAccount());
      render("home");
    });
  }

  function today() {
    return new Date().toLocaleDateString("en-IN");
  }

  // ===================================================
  // VARGANI SUMMARY
  // ===================================================

  function getCollectionSummary(type) {

    const data = getData(type);

    const total = data.reduce(
      (sum, item) =>
        sum + num(item.total),
      0
    );

    const paid = data.reduce(
      (sum, item) =>
        sum + num(item.paid),
      0
    );

    return {
      total,
      paid,
      remaining: Math.max(0, total - paid),
      count: data.length
    };
  }

  // ===================================================
  // BAND SUMMARY
  // ===================================================

  function getBandPaid(item) {

    // New records use paid.
    // Old records may have advance.
    // Both are supported.

    if (
      item.paid !== undefined &&
      item.paid !== null
    ) {
      return num(item.paid);
    }

    return num(item.advance);
  }

  function getVisarjanSummary() {

    const data = getData("visarjan");

    const total = data.reduce(
      (sum, item) =>
        sum + num(item.total),
      0
    );

    const paid = data.reduce(
      (sum, item) =>
        sum + getBandPaid(item),
      0
    );

    return {
      total,
      paid,
      remaining: Math.max(0, total - paid),
      count: data.length
    };
  }

  // ===================================================
  // HAAT KARACH / EXPENSE SUMMARY
  // ===================================================

  function getExpenseSummary() {

    const data = getData("expenses");

    const total = data.reduce(
      (sum, item) =>
        sum + num(item.total),
      0
    );

    const paid = data.reduce(
      (sum, item) =>
        sum + num(item.paid),
      0
    );

    return {
      total,
      paid,
      remaining: Math.max(0, total - paid),
      count: data.length
    };
  }

  // ===================================================
  // OVERALL SUMMARY
  // ===================================================

  function getOverallSummary() {

    let collectionTotal = 0;
    let collectionPaid = 0;

    Object.keys(collectionTypes)
      .forEach(type => {

        const summary =
          getCollectionSummary(type);

        collectionTotal += summary.total;
        collectionPaid += summary.paid;
      });

    const collectionRemaining =
      Math.max(
        0,
        collectionTotal - collectionPaid
      );

    const band =
      getVisarjanSummary();

    const expenses =
      getExpenseSummary();

    // ===============================================
    // IMPORTANT ACCOUNTING
    //
    // Band Total is NOT part of Vargani.
    //
    // Cash in hand:
    //
    // Vargani Paid
    // - Haat Karach Paid
    // - Band Paid
    //
    // ===============================================

    const cashInHand =
      collectionPaid -
      expenses.paid -
      band.paid;

    return {

      collectionTotal,

      collectionPaid,

      collectionRemaining,

      visarjanTotal:
        band.total,

      visarjanAdvance:
        band.paid,

      visarjanRemaining:
        band.remaining,

      expenseTotal:
        expenses.total,

      expensePaid:
        expenses.paid,

      expenseRemaining:
        expenses.remaining,

      cashInHand

    };
  }

  // ===================================================
  // LAYOUT
  // ===================================================

  function layout(content) {

    return `
      <div class="app-shell">

        <aside class="sidebar">

          <div class="brand">

            <div class="brand-logo">
              🪔
            </div>

            <div class="brand-text">
              <h2>नवयुवक गणेश मंडळ 🙏</h2>
              <span>Accounts Book</span>
            </div>

          </div>


          <div class="menu-label">
            MAIN MENU
          </div>


          <nav class="sidebar-menu">

            ${navButton(
              "home",
              "🏠",
              "Home"
            )}

            <div class="nav-group-title">
              💰 वर्गणी
            </div>

            ${navButton(
              "boys",
              "👦",
              "Boys Vargani"
            )}

            ${navButton(
              "main",
              "⭐",
              "Main Vargani"
            )}

            ${navButton(
              "family",
              "👨‍👩‍👧",
              "Family Vargani"
            )}

            <div class="nav-group-title">
              💸 जमा-खर्च
            </div>

            ${navButton(
              "visarjan",
              "🎺",
              "Band / Visarjan"
            )}

            ${navButton(
              "expenses",
              "💸",
              "Haat Karach / खर्च"
            )}

            ${navButton(
              "report",
              "📊",
              "जमा-खर्च Report"
            )}

          </nav>


          <div class="sidebar-bottom">

            <div class="selected-year">

              <span>📅</span>

              <div>
                <small>
                  Selected Year
                </small>

                <strong>
                  ${selectedYear}
                </strong>
              </div>

            </div>

            <button
              id="logoutApp"
              class="logout-sidebar-btn"
              type="button"
              title="Logout"
            >
              🚪 Logout
            </button>

            <div class="sidebar-footer">
              Develop by Chetan Bhoge
            </div>

          </div>

        </aside>


        <main class="main-area">

          <header class="top-header">

            <div>

              <span class="header-overline">
                GANPATI MANDAL · ACCOUNTS
              </span>

              <h1>
                Ganpati Accounts Dashboard
              </h1>

            </div>


            <div class="header-actions">

              <div class="header-year">

                <small>
                  Accounting Year
                </small>

                <select id="yearSelector" aria-label="Accounting Year">
                  ${availableYears.map(year => `
                    <option value="${year}" ${year === selectedYear ? "selected" : ""}>
                      ${year}
                    </option>
                  `).join("")}
                </select>

              </div>

            </div>

          </header>


          ${content}


          <footer class="app-footer">
            🔒 Your data is saved securely in this browser ·
            Ganpati Mandal Accounts ${selectedYear}
          </footer>

        </main>

      </div>
    `;
  }

  // ===================================================
  // NAV BUTTON
  // ===================================================

  function navButton(
    page,
    icon,
    text
  ) {

    return `
      <button
        class="nav-btn ${
          currentPage === page
            ? "active"
            : ""
        }"
        data-page="${page}"
      >

        <span class="nav-icon">
          ${icon}
        </span>

        <span>
          ${text}
        </span>

      </button>
    `;
  }

  // ===================================================
  // MAIN RENDER
  // ===================================================

  function render(page = "home") {

    if (!isUnlocked) {
      element.innerHTML = authScreen();
      setupAuth();
      return;
    }

    currentPage = page;

    let content = "";

    if (page === "home") {
      content = homePage();
    }

    if (page === "boys") {
      content = varganiPage("boys");
    }

    if (page === "main") {
      content = varganiPage("main");
    }

    if (page === "family") {
      content = varganiPage("family");
    }

    if (page === "visarjan") {
      content = visarjanPage();
    }

    if (page === "expenses") {
      content = expensesPage();
    }

    if (page === "report") {
      content = reportPage();
    }

    element.innerHTML =
      layout(content);

    bindNavigation();

    if (page === "home") {
      setupHome();
    }

    if (
      page === "boys" ||
      page === "main" ||
      page === "family"
    ) {
      setupVargani(page);
    }

    if (page === "visarjan") {
      setupVisarjan();
    }

    if (page === "expenses") {
      setupExpenses();
    }

    if (page === "report") {
      setupReport();
    }
  }

  // ===================================================
  // NAVIGATION
  // ===================================================

  function bindNavigation() {

    document
      .querySelectorAll("[data-page]")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const page =
              button.dataset.page;

            render(page);
          }
        );

      });

    const logoutButton = document.querySelector("#logoutApp");

    const yearSelector = document.querySelector("#yearSelector");

    if (yearSelector) {
      yearSelector.addEventListener("change", event => {
        selectedYear = event.target.value;
        localStorage.setItem("ganpati_selected_year", selectedYear);
        render(currentPage);
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener("click", () => {
        sessionStorage.removeItem("ganpati_unlocked");
        isUnlocked = false;
        render();
      });
    }
  }

  // ===================================================
  // SUMMARY CARD
  // ===================================================

  function summaryCard(
    icon,
    title,
    amount,
    subtitle
  ) {

    return `
      <div class="summary-card">

        <div class="summary-icon">
          ${icon}
        </div>

        <div>

          <span>
            ${title}
          </span>

          <strong>
            ${money(amount)}
          </strong>

          <small>
            ${subtitle}
          </small>

        </div>

      </div>
    `;
  }

  // ===================================================
  // HOME PAGE
  // ===================================================

  function homePage() {

    const boys =
      getCollectionSummary("boys");

    const main =
      getCollectionSummary("main");

    const family =
      getCollectionSummary("family");

    const band =
      getVisarjanSummary();

    const expenses =
      getExpenseSummary();

    const overall =
      getOverallSummary();

    return `
      <section class="page">

        <div class="hero">

          <div>

            <span class="section-tag">
              🙏 गणपती बाप्पा मोरया
            </span>

            <h2>
              Namaste, Organizer 👋
            </h2>

            <p>
              Manage your Ganpati Mandal
              collections and expenses easily.
            </p>

          </div>


          <button
            class="primary-btn"
            data-page="boys"
          >
            + Add Vargani
          </button>

        </div>


        <!-- ===================================== -->
        <!-- MAIN VARGANI SUMMARY -->
        <!-- ===================================== -->

        <div class="section-heading">

          <div>
            <span class="section-tag">
              💰 VARGANI
            </span>

            <h3>
              Vargani Overview
            </h3>
          </div>

        </div>


        <div class="summary-grid four">

          ${summaryCard(
            "💰",
            "Total Vargani",
            overall.collectionTotal,
            "Boys + Main + Family"
          )}

          ${summaryCard(
            "✅",
            "Vargani Paid",
            overall.collectionPaid,
            "Total जमा"
          )}

          ${summaryCard(
            "⏳",
            "Vargani Remaining",
            overall.collectionRemaining,
            "बाकी वर्गणी"
          )}

          ${summaryCard(
            "👥",
            "Total Records",
            boys.count +
              main.count +
              family.count,
            "All Vargani records"
          )}

        </div>


        <!-- ===================================== -->
        <!-- HAND CASH CARD -->
        <!-- ===================================== -->

        <div class="cash-in-hand-card">

          <div class="overview-top">

            <div class="overview-icon">
              💵
            </div>

            <div>

              <span>
                हातातील रक्कम
              </span>

              <strong>
                ${money(
                  overall.cashInHand
                )}
              </strong>

              <small>
                Vargani Paid − Haat Karach Paid − Band Paid
              </small>

            </div>

          </div>


          <div class="mini-stats">

            <div>
              <span>
                Vargani Paid
              </span>

              <strong>
                ${money(
                  overall.collectionPaid
                )}
              </strong>
            </div>


            <div>
              <span>
                Haat Karach Paid
              </span>

              <strong>
                ${money(
                  overall.expensePaid
                )}
              </strong>
            </div>


            <div>
              <span>
                Band Paid
              </span>

              <strong>
                ${money(
                  overall.visarjanAdvance
                )}
              </strong>
            </div>

          </div>

        </div>


        <!-- ===================================== -->
        <!-- VARGANI DETAILS -->
        <!-- ===================================== -->

        <div class="section-heading">

          <div>
            <span class="section-tag">
              📋 DETAILS
            </span>

            <h3>
              Vargani Sections
            </h3>
          </div>

        </div>


        <div class="overview-grid">

          ${overviewCard(
            "👦",
            "Boys Vargani",
            boys,
            "boys"
          )}

          ${overviewCard(
            "⭐",
            "Main Vargani",
            main,
            "main"
          )}

          ${overviewCard(
            "👨‍👩‍👧",
            "Family Vargani",
            family,
            "family"
          )}

        </div>


        <!-- ===================================== -->
        <!-- HAAT KARACH + BAND -->
        <!-- ===================================== -->

        <div class="section-heading">

          <div>
            <span class="section-tag">
              💸 EXPENSES
            </span>

            <h3>
              Haat Karach & Band
            </h3>
          </div>

        </div>


        <div class="overview-grid">

          ${overviewCard(
            "💸",
            "Haat Karach",
            expenses,
            "expenses"
          )}

          ${overviewCard(
            "🎺",
            "Band / Visarjan",
            {
              total: band.total,
              paid: band.paid,
              remaining: band.remaining,
              count: band.count
            },
            "visarjan"
          )}

        </div>


        <!-- ===================================== -->
        <!-- ACCOUNTING NOTE -->
        <!-- ===================================== -->

        <div class="card">

          <div class="overview-top">

            <div class="overview-icon">
              ℹ️
            </div>

            <div>

              <span>
                Accounting Note
              </span>

              <p>
                Band booking Vargani मध्ये
                add होत नाही. पण Band ला दिलेली
                Paid / जमा रक्कम हातातील
                पैशातून deduct होते.
              </p>

            </div>

          </div>

        </div>

      </section>
    `;
  }

  // ===================================================
  // OVERVIEW CARD
  // ===================================================

  function overviewCard(
    icon,
    title,
    summary,
    page
  ) {

    return `
      <div class="overview-card">

        <div class="overview-top">

          <div class="overview-icon">
            ${icon}
          </div>

          <div>

            <span>
              ${title}
            </span>

            <strong>
              ${money(summary.total)}
            </strong>

          </div>

        </div>


        <div class="mini-stats">

          <div>
            <span>
              Paid / जमा
            </span>

            <strong>
              ${money(summary.paid)}
            </strong>
          </div>


          <div>
            <span>
              Remaining
            </span>

            <strong>
              ${money(summary.remaining)}
            </strong>
          </div>

        </div>


        <button
          class="view-link"
          data-page="${page}"
        >
          View Details →
        </button>

      </div>
    `;
  }

  // ===================================================
  // HOME SETUP
  // ===================================================

  function setupHome() {
    // Home buttons use data-page.
    // Navigation is already bound.
  }

  // ===================================================
  // VARGANI PAGE
  // ===================================================

  function varganiPage(type) {

    const config =
      collectionTypes[type];

    const summary =
      getCollectionSummary(type);

    return `
      <section class="page">

        <div class="page-heading">

          <button
            class="back-btn"
            data-page="home"
          >
            ← Home
          </button>

          <span class="section-tag">
            ${config.icon} VARGANI
          </span>

          <h2>
            ${config.title}
          </h2>

          <p>
            Add and manage ${config.label}
            Vargani records.
          </p>

        </div>


        <div class="summary-grid three">

          ${summaryCard(
            "💰",
            "Total",
            summary.total,
            `${summary.count} records`
          )}

          ${summaryCard(
            "✅",
            "Paid / जमा",
            summary.paid,
            "Amount received"
          )}

          ${summaryCard(
            "⏳",
            "Remaining",
            summary.remaining,
            "Amount pending"
          )}

        </div>


        <div class="form-card">

          <div class="form-title">

            <div>

              <span>
                ${config.label.toUpperCase()}
                VARGANI
              </span>

              <h3>
                + Add ${config.title}
              </h3>

            </div>

          </div>


          <form
            id="varganiForm"
            class="data-form"
          >

            <div class="form-grid">

              <label>

                <span>
                  Name *
                </span>

                <input
                  id="recordName"
                  type="text"
                  placeholder="Enter name"
                  required
                />

              </label>


              <label>

                <span>
                  Total Amount *
                </span>

                <input
                  id="recordTotal"
                  type="number"
                  min="0"
                  placeholder="₹ Total"
                  required
                />

              </label>


              <label>

                <span>
                  Paid / जमा *
                </span>

                <input
                  id="recordPaid"
                  type="number"
                  min="0"
                  placeholder="₹ Paid"
                  required
                />

              </label>


              <label>

                <span>
                  Remaining
                </span>

                <input
                  id="recordRemaining"
                  type="number"
                  readonly
                  value="0"
                />

              </label>


              <label class="full">

                <span>
                  Remarks
                </span>

                <textarea
                  id="recordRemarks"
                  rows="2"
                  placeholder="Enter remarks..."
                ></textarea>

              </label>

            </div>


            <div class="form-actions">

              <button
                type="submit"
                class="save-btn"
              >
                💾 Save Vargani
              </button>

              <button
                type="reset"
                class="cancel-btn"
              >
                Clear
              </button>

            </div>

          </form>

        </div>


        <div class="table-card">

          <div class="table-heading">

            <div>

              <span>
                RECORDS
              </span>

              <h3>
                ${config.title} List
              </h3>

            </div>

            <strong>
              ${summary.count} Records
            </strong>

          </div>


          <div class="table-scroll">

            <table>

              <thead>

                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Total</th>
                  <th>Paid / जमा</th>
                  <th>Remaining</th>
                  <th>Remarks</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>

              </thead>

              <tbody id="varganiTable"></tbody>

            </table>

          </div>

        </div>

      </section>
    `;
  }

  // ===================================================
  // SETUP VARGANI
  // ===================================================

  function setupVargani(type) {

    const form =
      document.querySelector(
        "#varganiForm"
      );

    if (!form) return;

    const totalInput =
      document.querySelector(
        "#recordTotal"
      );

    const paidInput =
      document.querySelector(
        "#recordPaid"
      );

    const remainingInput =
      document.querySelector(
        "#recordRemaining"
      );

    function calculateRemaining() {

      const total =
        num(totalInput.value);

      const paid =
        num(paidInput.value);

      remainingInput.value =
        Math.max(
          0,
          total - paid
        );
    }

    totalInput.addEventListener(
      "input",
      calculateRemaining
    );

    paidInput.addEventListener(
      "input",
      calculateRemaining
    );

    form.addEventListener(
      "submit",
      event => {

        event.preventDefault();

        const name =
          document
            .querySelector(
              "#recordName"
            )
            .value
            .trim();

        const total =
          num(totalInput.value);

        const paid =
          num(paidInput.value);

        const remarks =
          document
            .querySelector(
              "#recordRemarks"
            )
            .value
            .trim();

        if (
          !name ||
          total <= 0
        ) {

          alert(
            "Please enter Name and Total Amount."
          );

          return;
        }

        if (paid > total) {

          alert(
            "Paid amount cannot be greater than Total."
          );

          return;
        }

        const data =
          getData(type);

        data.push({

          id: Date.now(),

          name,

          total,

          paid,

          remaining:
            total - paid,

          remarks,

          date:
            today()

        });

        saveData(
          type,
          data
        );

        render(type);
      }
    );

    renderVarganiTable(type);
  }

  // ===================================================
  // VARGANI TABLE
  // ===================================================

  function renderVarganiTable(type) {

    const table =
      document.querySelector(
        "#varganiTable"
      );

    if (!table) return;

    const data =
      getData(type);

    if (!data.length) {

      table.innerHTML = `
        <tr>
          <td
            colspan="8"
            class="empty"
          >
            No records added yet.
          </td>
        </tr>
      `;

      return;
    }

    table.innerHTML =
      data.map(
        (item, index) => `

          <tr>

            <td>
              ${index + 1}
            </td>

            <td>
              <strong>
                ${escapeHTML(item.name)}
              </strong>
            </td>

            <td>
              ${money(item.total)}
            </td>

            <td class="paid-text">
              ${money(item.paid)}
            </td>

            <td class="remaining-text">
              ${money(
                num(item.total) -
                num(item.paid)
              )}
            </td>

            <td class="remarks-cell">
              ${escapeHTML(
                item.remarks || "-"
              )}
            </td>

            <td>
              ${item.date || "-"}
            </td>

            <td>

              <div class="action-buttons">

                <button
                  class="edit-btn"
                  data-edit-vargani="${item.id}"
                  data-type="${type}"
                >
                  ✏️
                </button>

                <button
                  class="delete-btn"
                  data-delete-vargani="${item.id}"
                  data-type="${type}"
                >
                  🗑️
                </button>

              </div>

            </td>

          </tr>

        `
      ).join("");


    // DELETE

    table
      .querySelectorAll(
        "[data-delete-vargani]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            if (
              !confirm(
                "Delete this record?"
              )
            ) {
              return;
            }

            const id =
              Number(
                button.dataset
                  .deleteVargani
              );

            const updated =
              getData(type)
                .filter(
                  item =>
                    item.id !== id
                );

            saveData(
              type,
              updated
            );

            render(type);
          }
        );

      });


    // EDIT

    table
      .querySelectorAll(
        "[data-edit-vargani]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            editVargani(
              type,
              Number(
                button.dataset
                  .editVargani
              )
            );

          }
        );

      });
  }

  // ===================================================
  // EDIT VARGANI
  // ===================================================

  function editVargani(
    type,
    id
  ) {

    const data =
      getData(type);

    const item =
      data.find(
        record =>
          record.id === id
      );

    if (!item) return;

    const name =
      prompt(
        "Name:",
        item.name
      );

    if (name === null) return;

    const total =
      prompt(
        "Total Amount:",
        item.total
      );

    if (total === null) return;

    const paid =
      prompt(
        "Paid / जमा Amount:",
        item.paid
      );

    if (paid === null) return;

    const remarks =
      prompt(
        "Remarks:",
        item.remarks || ""
      );

    if (remarks === null) return;

    const newTotal =
      num(total);

    const newPaid =
      num(paid);

    if (
      newTotal <= 0
    ) {

      alert(
        "Invalid total amount."
      );

      return;
    }

    if (
      newPaid > newTotal
    ) {

      alert(
        "Paid cannot be greater than Total."
      );

      return;
    }

    item.name =
      name.trim();

    item.total =
      newTotal;

    item.paid =
      newPaid;

    item.remaining =
      newTotal - newPaid;

    item.remarks =
      remarks.trim();

    saveData(
      type,
      data
    );

    render(type);
  }

  // ===================================================
  // BAND / VISARJAN PAGE
  // ===================================================

  function visarjanPage() {

    const summary =
      getVisarjanSummary();

    return `
      <section class="page">

        <div class="page-heading">

          <button
            class="back-btn"
            data-page="home"
          >
            ← Home
          </button>

          <span class="section-tag">
            🎺 BAND / VISARJAN
          </span>

          <h2>
            Visarjan Band Booking
          </h2>

          <p>
            Manage Band booking,
            Total, Paid / जमा and
            Remaining amount.
          </p>

        </div>


        <div class="summary-grid three">

          ${summaryCard(
            "🎺",
            "Total Booking",
            summary.total,
            `${summary.count} Band bookings`
          )}

          ${summaryCard(
            "💵",
            "Paid / जमा",
            summary.paid,
            "Amount paid to Band"
          )}

          ${summaryCard(
            "⏳",
            "Remaining",
            summary.remaining,
            "Amount to pay"
          )}

        </div>


        <div class="form-card">

          <div class="form-title">

            <div>

              <span>
                BAND BOOKING
              </span>

              <h3>
                + Add Band Booking
              </h3>

            </div>

          </div>


          <form
            id="visarjanForm"
            class="data-form"
          >

            <div class="form-grid">

              <label>

                <span>
                  Band Name *
                </span>

                <input
                  id="bandName"
                  type="text"
                  placeholder="Example: Shivshakti Band"
                  required
                />

              </label>


              <label>

                <span>
                  Total Booking Amount *
                </span>

                <input
                  id="bandTotal"
                  type="number"
                  min="0"
                  placeholder="₹ Total"
                  required
                />

              </label>


              <label>

                <span>
                  Paid / जमा *
                </span>

                <input
                  id="bandPaid"
                  type="number"
                  min="0"
                  placeholder="₹ Paid"
                  required
                />

              </label>


              <label>

                <span>
                  Remaining
                </span>

                <input
                  id="bandRemaining"
                  type="number"
                  readonly
                  value="0"
                />

              </label>


              <label class="full">

                <span>
                  Remarks
                </span>

                <textarea
                  id="bandRemarks"
                  rows="2"
                  placeholder="Example: Booking confirmed..."
                ></textarea>

              </label>

            </div>


            <div class="form-actions">

              <button
                type="submit"
                class="save-btn"
              >
                💾 Save Band Booking
              </button>

              <button
                type="reset"
                class="cancel-btn"
              >
                Clear
              </button>

            </div>

          </form>

        </div>


        <div class="table-card">

          <div class="table-heading">

            <div>

              <span>
                BAND BOOKINGS
              </span>

              <h3>
                Band Booking List
              </h3>

            </div>

            <strong>
              ${summary.count} Bookings
            </strong>

          </div>


          <div class="table-scroll">

            <table>

              <thead>

                <tr>

                  <th>#</th>
                  <th>Band Name</th>
                  <th>Total</th>
                  <th>Paid / जमा</th>
                  <th>Remaining</th>
                  <th>Remarks</th>
                  <th>Date</th>
                  <th>Action</th>

                </tr>

              </thead>


              <tbody
                id="visarjanTable"
              ></tbody>

            </table>

          </div>

        </div>


        <div class="card">

          <div class="overview-top">

            <div class="overview-icon">
              ℹ️
            </div>

            <div>

              <span>
                Band Accounting
              </span>

              <p>
                Band चे Total Vargani मध्ये
                add होत नाही. Band ला दिलेली
                Paid / जमा रक्कम मात्र
                हातातील रकमेतून deduct होते.
              </p>

            </div>

          </div>

        </div>

      </section>
    `;
  }

  // ===================================================
  // SETUP BAND
  // ===================================================

  function setupVisarjan() {

    const form =
      document.querySelector(
        "#visarjanForm"
      );

    if (!form) return;

    const total =
      document.querySelector(
        "#bandTotal"
      );

    const paid =
      document.querySelector(
        "#bandPaid"
      );

    const remaining =
      document.querySelector(
        "#bandRemaining"
      );

    function calculate() {

      remaining.value =
        Math.max(
          0,
          num(total.value) -
          num(paid.value)
        );
    }

    total.addEventListener(
      "input",
      calculate
    );

    paid.addEventListener(
      "input",
      calculate
    );


    form.addEventListener(
      "submit",
      event => {

        event.preventDefault();

        const name =
          document
            .querySelector(
              "#bandName"
            )
            .value
            .trim();

        const totalAmount =
          num(total.value);

        const paidAmount =
          num(paid.value);

        const remarks =
          document
            .querySelector(
              "#bandRemarks"
            )
            .value
            .trim();

        if (
          !name ||
          totalAmount <= 0
        ) {

          alert(
            "Please enter Band Name and Total."
          );

          return;
        }

        if (
          paidAmount >
          totalAmount
        ) {

          alert(
            "Paid cannot be greater than Total."
          );

          return;
        }

        const data =
          getData("visarjan");

        data.push({

          id: Date.now(),

          name,

          total:
            totalAmount,

          // IMPORTANT:
          // Band Paid is stored separately.
          paid:
            paidAmount,

          remaining:
            totalAmount -
            paidAmount,

          remarks,

          date:
            today()

        });

        saveData(
          "visarjan",
          data
        );

        render("visarjan");
      }
    );

    renderVisarjanTable();
  }

  // ===================================================
  // BAND TABLE
  // ===================================================

  function renderVisarjanTable() {

    const table =
      document.querySelector(
        "#visarjanTable"
      );

    if (!table) return;

    const data =
      getData("visarjan");

    if (!data.length) {

      table.innerHTML = `
        <tr>

          <td
            colspan="8"
            class="empty"
          >
            No Band bookings added yet.
          </td>

        </tr>
      `;

      return;
    }

    table.innerHTML =
      data.map(
        (item, index) => {

          const paid =
            getBandPaid(item);

          const remaining =
            Math.max(
              0,
              num(item.total) -
              paid
            );

          return `

            <tr>

              <td>
                ${index + 1}
              </td>

              <td>
                <strong>
                  ${escapeHTML(
                    item.name
                  )}
                </strong>
              </td>

              <td>
                ${money(
                  item.total
                )}
              </td>

              <td class="paid-text">
                ${money(paid)}
              </td>

              <td class="remaining-text">
                ${money(
                  remaining
                )}
              </td>

              <td class="remarks-cell">
                ${escapeHTML(
                  item.remarks || "-"
                )}
              </td>

              <td>
                ${item.date || "-"}
              </td>

              <td>

                <div class="action-buttons">

                  <button
                    class="edit-btn"
                    data-edit-band="${item.id}"
                  >
                    ✏️
                  </button>

                  <button
                    class="delete-btn"
                    data-delete-band="${item.id}"
                  >
                    🗑️
                  </button>

                </div>

              </td>

            </tr>

          `;
        }
      ).join("");


    // DELETE BAND

    table
      .querySelectorAll(
        "[data-delete-band]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            if (
              !confirm(
                "Delete this Band booking?"
              )
            ) {
              return;
            }

            const id =
              Number(
                button.dataset
                  .deleteBand
              );

            const updated =
              getData("visarjan")
                .filter(
                  item =>
                    item.id !== id
                );

            saveData(
              "visarjan",
              updated
            );

            render("visarjan");
          }
        );

      });


    // EDIT BAND

    table
      .querySelectorAll(
        "[data-edit-band]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            editBand(
              Number(
                button.dataset
                  .editBand
              )
            );

          }
        );

      });
  }

  // ===================================================
  // EDIT BAND
  // ===================================================

  function editBand(id) {

    const data =
      getData("visarjan");

    const item =
      data.find(
        record =>
          record.id === id
      );

    if (!item) return;

    const currentPaid =
      getBandPaid(item);

    const name =
      prompt(
        "Band Name:",
        item.name
      );

    if (name === null) return;

    const total =
      prompt(
        "Total Booking Amount:",
        item.total
      );

    if (total === null) return;

    const paid =
      prompt(
        "Paid / जमा Amount:",
        currentPaid
      );

    if (paid === null) return;

    const remarks =
      prompt(
        "Remarks:",
        item.remarks || ""
      );

    if (remarks === null) return;

    const newTotal =
      num(total);

    const newPaid =
      num(paid);

    if (
      newTotal <= 0
    ) {

      alert(
        "Invalid Total amount."
      );

      return;
    }

    if (
      newPaid > newTotal
    ) {

      alert(
        "Paid cannot be greater than Total."
      );

      return;
    }

    item.name =
      name.trim();

    item.total =
      newTotal;

    item.paid =
      newPaid;

    item.remaining =
      newTotal - newPaid;

    item.remarks =
      remarks.trim();

    saveData(
      "visarjan",
      data
    );

    render("visarjan");
  }

  // ===================================================
  // HAAT KARACH / EXPENSE PAGE
  // ===================================================

  function expensesPage() {

    const summary =
      getExpenseSummary();

    return `
      <section class="page">

        <div class="page-heading">

          <button
            class="back-btn"
            data-page="home"
          >
            ← Home
          </button>

          <span class="section-tag">
            💸 HAAT KARACH
          </span>

          <h2>
            खर्च
          </h2>

          <p>
            Manage Haat Karach,
            Total, Paid / जमा and
            Remaining amount.
          </p>

        </div>


        <div class="summary-grid three">

          ${summaryCard(
            "💰",
            "Total खर्च",
            summary.total,
            `${summary.count} records`
          )}

          ${summaryCard(
            "✅",
            "Paid / जमा",
            summary.paid,
            "Amount paid"
          )}

          ${summaryCard(
            "⏳",
            "Remaining",
            summary.remaining,
            "Expense pending"
          )}

        </div>


        <div class="form-card">

          <div class="form-title">

            <div>

              <span>
                HAAT KARACH
              </span>

              <h3>
                + Add खर्च
              </h3>

            </div>

          </div>


          <form
            id="expenseForm"
            class="data-form"
          >

            <div class="form-grid">

              <label>

                <span>
                  Expense Name *
                </span>

                <input
                  id="expenseName"
                  type="text"
                  placeholder="Decoration / Sound / Mandap..."
                  required
                />

              </label>


              <label>

                <span>
                  Total Amount *
                </span>

                <input
                  id="expenseTotal"
                  type="number"
                  min="0"
                  placeholder="₹ Total"
                  required
                />

              </label>


              <label>

                <span>
                  Paid / जमा *
                </span>

                <input
                  id="expensePaid"
                  type="number"
                  min="0"
                  placeholder="₹ Paid"
                  required
                />

              </label>


              <label>

                <span>
                  Remaining
                </span>

                <input
                  id="expenseRemaining"
                  type="number"
                  readonly
                  value="0"
                />

              </label>


              <label class="full">

                <span>
                  Remarks
                </span>

                <textarea
                  id="expenseRemarks"
                  rows="2"
                  placeholder="Enter expense remarks..."
                ></textarea>

              </label>

            </div>


            <div class="form-actions">

              <button
                type="submit"
                class="save-btn"
              >
                💾 Save खर्च
              </button>

              <button
                type="reset"
                class="cancel-btn"
              >
                Clear
              </button>

            </div>

          </form>

        </div>


        <div class="table-card">

          <div class="table-heading">

            <div>

              <span>
                EXPENSE LIST
              </span>

              <h3>
                Haat Karach Records
              </h3>

            </div>

            <strong>
              ${summary.count} Records
            </strong>

          </div>


          <div class="table-scroll">

            <table>

              <thead>

                <tr>

                  <th>#</th>
                  <th>Expense</th>
                  <th>Total</th>
                  <th>Paid / जमा</th>
                  <th>Remaining</th>
                  <th>Remarks</th>
                  <th>Date</th>
                  <th>Action</th>

                </tr>

              </thead>


              <tbody
                id="expenseTable"
              ></tbody>

            </table>

          </div>

        </div>

      </section>
    `;
  }

  // ===================================================
  // SETUP EXPENSES
  // ===================================================

  function setupExpenses() {

    const form =
      document.querySelector(
        "#expenseForm"
      );

    if (!form) return;

    const total =
      document.querySelector(
        "#expenseTotal"
      );

    const paid =
      document.querySelector(
        "#expensePaid"
      );

    const remaining =
      document.querySelector(
        "#expenseRemaining"
      );

    function calculate() {

      remaining.value =
        Math.max(
          0,
          num(total.value) -
          num(paid.value)
        );
    }

    total.addEventListener(
      "input",
      calculate
    );

    paid.addEventListener(
      "input",
      calculate
    );


    form.addEventListener(
      "submit",
      event => {

        event.preventDefault();

        const name =
          document
            .querySelector(
              "#expenseName"
            )
            .value
            .trim();

        const totalAmount =
          num(total.value);

        const paidAmount =
          num(paid.value);

        const remarks =
          document
            .querySelector(
              "#expenseRemarks"
            )
            .value
            .trim();

        if (
          !name ||
          totalAmount <= 0
        ) {

          alert(
            "Please enter Expense and Total."
          );

          return;
        }

        if (
          paidAmount >
          totalAmount
        ) {

          alert(
            "Paid cannot be greater than Total."
          );

          return;
        }

        const data =
          getData("expenses");

        data.push({

          id: Date.now(),

          name,

          total:
            totalAmount,

          paid:
            paidAmount,

          remaining:
            totalAmount -
            paidAmount,

          remarks,

          date:
            today()

        });

        saveData(
          "expenses",
          data
        );

        render("expenses");
      }
    );

    renderExpenseTable();
  }

  // ===================================================
  // EXPENSE TABLE
  // ===================================================

  function renderExpenseTable() {

    const table =
      document.querySelector(
        "#expenseTable"
      );

    if (!table) return;

    const data =
      getData("expenses");

    if (!data.length) {

      table.innerHTML = `
        <tr>

          <td
            colspan="8"
            class="empty"
          >
            No expenses added yet.
          </td>

        </tr>
      `;

      return;
    }

    table.innerHTML =
      data.map(
        (item, index) => `

          <tr>

            <td>
              ${index + 1}
            </td>

            <td>
              <strong>
                ${escapeHTML(
                  item.name
                )}
              </strong>
            </td>

            <td>
              ${money(
                item.total
              )}
            </td>

            <td class="paid-text">
              ${money(
                item.paid
              )}
            </td>

            <td class="remaining-text">
              ${money(
                num(item.total) -
                num(item.paid)
              )}
            </td>

            <td class="remarks-cell">
              ${escapeHTML(
                item.remarks || "-"
              )}
            </td>

            <td>
              ${item.date || "-"}
            </td>

            <td>

              <div class="action-buttons">

                <button
                  class="edit-btn"
                  data-edit-expense="${item.id}"
                >
                  ✏️
                </button>

                <button
                  class="delete-btn"
                  data-delete-expense="${item.id}"
                >
                  🗑️
                </button>

              </div>

            </td>

          </tr>

        `
      ).join("");


    // DELETE

    table
      .querySelectorAll(
        "[data-delete-expense]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            if (
              !confirm(
                "Delete this expense?"
              )
            ) {
              return;
            }

            const id =
              Number(
                button.dataset
                  .deleteExpense
              );

            const updated =
              getData("expenses")
                .filter(
                  item =>
                    item.id !== id
                );

            saveData(
              "expenses",
              updated
            );

            render("expenses");
          }
        );

      });


    // EDIT

    table
      .querySelectorAll(
        "[data-edit-expense]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            editExpense(
              Number(
                button.dataset
                  .editExpense
              )
            );

          }
        );

      });
  }

  // ===================================================
  // EDIT EXPENSE
  // ===================================================

  function editExpense(id) {

    const data =
      getData("expenses");

    const item =
      data.find(
        record =>
          record.id === id
      );

    if (!item) return;

    const name =
      prompt(
        "Expense Name:",
        item.name
      );

    if (name === null) return;

    const total =
      prompt(
        "Total Amount:",
        item.total
      );

    if (total === null) return;

    const paid =
      prompt(
        "Paid / जमा Amount:",
        item.paid
      );

    if (paid === null) return;

    const remarks =
      prompt(
        "Remarks:",
        item.remarks || ""
      );

    if (remarks === null) return;

    const newTotal =
      num(total);

    const newPaid =
      num(paid);

    if (
      newTotal <= 0 ||
      newPaid > newTotal
    ) {

      alert(
        "Invalid amount."
      );

      return;
    }

    item.name =
      name.trim();

    item.total =
      newTotal;

    item.paid =
      newPaid;

    item.remaining =
      newTotal - newPaid;

    item.remarks =
      remarks.trim();

    saveData(
      "expenses",
      data
    );

    render("expenses");
  }

  // ===================================================
  // REPORT PAGE
  // ===================================================

  function reportPage() {

    const overall =
      getOverallSummary();

    return `
      <section class="page report-page">

        <div class="page-heading">

          <button
            class="back-btn"
            data-page="home"
          >
            ← Home
          </button>

          <span class="section-tag">
            📊 COMPLETE REPORT
          </span>

          <h2>
            जमा-खर्च
          </h2>

          <p>
            Complete Ganpati Mandal account
            for ${selectedYear}.
          </p>

        </div>


        <div class="report-actions">

          <button
            id="printReport"
            class="primary-btn"
          >
            📄 Print / Save PDF
          </button>

        </div>


        <div
          id="printArea"
          class="report-document"
        >

          <div class="report-header">

            <div>

              <span>
                GANPATI MANDAL ACCOUNTS
              </span>

              <h2>
                जमा-खर्च अहवाल
              </h2>

              <p>
                Accounting Year
                ${selectedYear}
              </p>

            </div>

            <div class="report-diya">
              🪔
            </div>

          </div>


          <div class="report-summary">

            <div>
              <span>
                Total Vargani
              </span>

              <strong>
                ${money(
                  overall.collectionTotal
                )}
              </strong>
            </div>


            <div>
              <span>
                Vargani Paid
              </span>

              <strong>
                ${money(
                  overall.collectionPaid
                )}
              </strong>
            </div>


            <div>
              <span>
                Vargani Remaining
              </span>

              <strong>
                ${money(
                  overall.collectionRemaining
                )}
              </strong>
            </div>


            <div>
              <span>
                Total Haat Karach
              </span>

              <strong>
                ${money(
                  overall.expenseTotal
                )}
              </strong>
            </div>


            <div>
              <span>
                Haat Karach Paid
              </span>

              <strong>
                ${money(
                  overall.expensePaid
                )}
              </strong>
            </div>


            <div>
              <span>
                Band Total
              </span>

              <strong>
                ${money(
                  overall.visarjanTotal
                )}
              </strong>
            </div>


            <div>
              <span>
                Band Paid
              </span>

              <strong>
                ${money(
                  overall.visarjanAdvance
                )}
              </strong>
            </div>


            <div>
              <span>
                हातातील रक्कम
              </span>

              <strong>
                ${money(
                  overall.cashInHand
                )}
              </strong>
            </div>

          </div>


          ${reportSection(
            "👦 Boys Vargani",
            getData("boys"),
            "vargani"
          )}


          ${reportSection(
            "⭐ Main Vargani",
            getData("main"),
            "vargani"
          )}


          ${reportSection(
            "👨‍👩‍👧 Family Vargani",
            getData("family"),
            "vargani"
          )}


          ${reportSection(
            "🎺 Band / Visarjan Booking",
            getData("visarjan"),
            "visarjan"
          )}


          ${reportSection(
            "💸 Haat Karach / खर्च",
            getData("expenses"),
            "expense"
          )}


          <div class="report-footer">
            🙏 गणपती बाप्पा मोरया 🙏
          </div>

        </div>

      </section>
    `;
  }

  // ===================================================
  // REPORT SECTION
  // ===================================================

  function reportSection(
    title,
    data,
    type
  ) {

    let total = 0;

    let paid = 0;

    data.forEach(item => {

      total +=
        num(item.total);

      paid +=
        type === "visarjan"
          ? getBandPaid(item)
          : num(item.paid);

    });


    return `
      <div class="report-section">

        <div class="report-section-head">

          <h3>
            ${title}
          </h3>

          <div>

            Total:
            <strong>
              ${money(total)}
            </strong>

            &nbsp; | &nbsp;

            Paid:
            <strong>
              ${money(paid)}
            </strong>

            &nbsp; | &nbsp;

            Remaining:
            <strong>
              ${money(
                Math.max(
                  0,
                  total - paid
                )
              )}
            </strong>

          </div>

        </div>


        ${
          data.length

            ? `

              <div class="report-table">

                <table>

                  <thead>

                    <tr>

                      <th>
                        Name
                      </th>

                      <th>
                        Total
                      </th>

                      <th>
                        Paid / जमा
                      </th>

                      <th>
                        Remaining
                      </th>

                      <th>
                        Remarks
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    ${
                      data.map(
                        item => {

                          const itemPaid =
                            type === "visarjan"
                              ? getBandPaid(item)
                              : num(item.paid);

                          return `

                            <tr>

                              <td>
                                ${escapeHTML(
                                  item.name
                                )}
                              </td>

                              <td>
                                ${money(
                                  item.total
                                )}
                              </td>

                              <td>
                                ${money(
                                  itemPaid
                                )}
                              </td>

                              <td>
                                ${money(
                                  Math.max(
                                    0,
                                    num(item.total) -
                                    itemPaid
                                  )
                                )}
                              </td>

                              <td>
                                ${escapeHTML(
                                  item.remarks || "-"
                                )}
                              </td>

                            </tr>

                          `;
                        }
                      ).join("")
                    }

                  </tbody>

                </table>

              </div>

            `

            : `

              <div class="empty-report">
                No records.
              </div>

            `
        }

      </div>
    `;
  }

  // ===================================================
  // REPORT SETUP
  // ===================================================

  function setupReport() {

    const button =
      document.querySelector(
        "#printReport"
      );

    if (!button) return;

    button.addEventListener(
      "click",
      () => {

        window.print();

      }
    );
  }

  // ===================================================
  // START APP
  // ===================================================

  render("home");
}