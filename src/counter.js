// =====================================================
// GANPATI MANDAL ACCOUNTS
// FULL UPDATED counter.js
// =====================================================

export function setupApp(element) {

  // ===================================================
  // STATE
  // ===================================================

  let selectedYear =
    localStorage.getItem("ganpati_selected_year") ||
    String(new Date().getFullYear());

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

                <strong>
                  ${selectedYear}
                </strong>

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