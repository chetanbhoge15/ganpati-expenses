// =====================================================
// GANPATI MANDAL ACCOUNTS + SUPABASE AUTH
// =====================================================

import { supabase, supabaseConfigured } from "./supabase.js";

async function startApp(element) {
  // ===================================================
  // STATE
  // ===================================================

  let selectedYear =
    localStorage.getItem("ganpati_selected_year") ||
    String(new Date().getFullYear());

  let cloudReady = supabaseConfigured;

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
      return JSON.parse(localStorage.getItem(key(type))) || [];
    } catch {
      return [];
    }
  }

  // ===================================================
// LOCAL + SUPABASE CLOUD STORAGE
// ===================================================

async function syncYearToCloud() {
  if (!cloudReady) return;

  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return;

    const payload = {
      boys: getData("boys"),
      main: getData("main"),
      family: getData("family"),
      visarjan: getData("visarjan"),
      expenses: getData("expenses")
    };

    const { error } = await supabase
      .from("ganpati_year_data")
      .upsert(
        {
          user_id: user.id,
          year: Number(selectedYear),
          data: payload,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: "user_id,year"
        }
      );

    if (error) {
      console.error("Cloud sync error:", error);
    }
  } catch (error) {
    console.error("Cloud sync failed:", error);
  }
}

async function loadYearFromCloud() {
  if (!cloudReady) return;

  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("ganpati_year_data")
      .select("data")
      .eq("user_id", user.id)
      .eq("year", Number(selectedYear))
      .maybeSingle();

    if (error) {
      console.error("Cloud load error:", error);
      return;
    }

    if (data?.data) {
      const cloudData = data.data;

      ["boys", "main", "family", "visarjan", "expenses"]
        .forEach((type) => {
          localStorage.setItem(
            key(type),
            JSON.stringify(cloudData[type] || [])
          );
        });

      console.log(
        `Cloud data loaded for year ${selectedYear}`
      );
    } else {
      // First time for this year:
      // upload existing local data to cloud.
      await syncYearToCloud();
    }
  } catch (error) {
    console.error("Cloud load failed:", error);
  }
}

function saveData(type, data) {
  localStorage.setItem(
    key(type),
    JSON.stringify(data)
  );

  // Save to Supabase also
  syncYearToCloud();
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

  // Load this year's data from Supabase after the cloud helpers are declared.
  if (cloudReady) {
    await loadYearFromCloud();
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
  // CALCULATIONS
  // ===================================================

  function getCollectionSummary(type) {
    const data = getData(type);

    const total = data.reduce(
      (sum, item) => sum + num(item.total),
      0
    );

    const paid = data.reduce(
      (sum, item) => sum + num(item.paid),
      0
    );

    return {
      total,
      paid,
      remaining: total - paid,
      count: data.length
    };
  }

  function getBandPaid(item) {
    // New records use `paid`. Older saved records used `advance`,
    // so both are supported to avoid losing existing data.
    return num(item.paid ?? item.advance);
  }

  function getVisarjanSummary() {
    const data = getData("visarjan");

    const total = data.reduce(
      (sum, item) => sum + num(item.total),
      0
    );

    const paid = data.reduce(
      (sum, item) => sum + getBandPaid(item),
      0
    );

    return {
      total,
      paid,
      remaining: total - paid,
      count: data.length
    };
  }

  function getExpenseSummary() {
    const data = getData("expenses");

    const total = data.reduce(
      (sum, item) => sum + num(item.total),
      0
    );

    const paid = data.reduce(
      (sum, item) => sum + num(item.paid),
      0
    );

    return {
      total,
      paid,
      remaining: total - paid,
      count: data.length
    };
  }

  function getOverallSummary() {
    let total = 0;
    let paid = 0;

    Object.keys(collectionTypes).forEach(type => {
      const s = getCollectionSummary(type);

      total += s.total;
      paid += s.paid;
    });

    const visarjan = getVisarjanSummary();

    // Visarjan is a booking commitment,
    // so it is shown separately and not added
    // to normal Vargani collection.

    const expenses = getExpenseSummary();

    return {
      collectionTotal: total,
      collectionPaid: paid,
      collectionRemaining: total - paid,

      visarjanTotal: visarjan.total,
      visarjanAdvance: visarjan.paid,
      visarjanRemaining: visarjan.remaining,

      expenseTotal: expenses.total,
      expensePaid: expenses.paid,
      expenseRemaining: expenses.remaining,

      // Actual cash available = Vargani Paid - Haat Karach Paid - Band Paid.
      // Band is separate from Vargani totals, but its paid amount is actual cash outflow.
      cashInHand: paid - expenses.paid - visarjan.paid
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

            <div>
              <h2>Ganpati</h2>
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
              "जमा-खर्च"
            )}

          </nav>


          <div class="sidebar-bottom">

            <div class="selected-year">

              <span>📅</span>

              <div>
                <small>Selected Year</small>
                <strong>${selectedYear}</strong>
              </div>

            </div>

            <div class="sidebar-footer">
              Develop by Chetan Bhoge

              <button
                id="logoutBtn"
                type="button"
                style="
                  margin-top:12px;
                  width:100%;
                  padding:9px 12px;
                  border:1px solid rgba(255,255,255,.22);
                  border-radius:10px;
                  background:rgba(255,255,255,.08);
                  color:inherit;
                  cursor:pointer;
                "
              >
                Logout
              </button>

            </div>

          </div>

        </aside>


        <main class="main-area">

          <header class="topbar">

            <div>

              <h1>
                ${pageTitle()}
              </h1>

              <p>
                Ganpati Mandal Accounts
              </p>

            </div>


            <div class="topbar-actions">

              <label class="year-selector">

                <span>Year</span>

                <select id="yearSelect">

                  ${yearOptions()}

                </select>

              </label>

            </div>

          </header>


          <section class="content-area">

            ${content}

          </section>

        </main>

      </div>
    `;
  }


  // ===================================================
  // NAVIGATION
  // ===================================================

  function navButton(page, icon, label) {

    return `
      <button
        type="button"
        class="nav-item ${
          currentPage === page ? "active" : ""
        }"
        data-page="${page}"
      >

        <span class="nav-icon">
          ${icon}
        </span>

        <span>
          ${label}
        </span>

      </button>
    `;
  }


  function pageTitle() {

    if (currentPage === "home") {
      return "Dashboard";
    }

    if (collectionTypes[currentPage]) {
      return collectionTypes[currentPage].title;
    }

    if (currentPage === "visarjan") {
      return "Band / Visarjan";
    }

    if (currentPage === "expenses") {
      return "Haat Karach / खर्च";
    }

    if (currentPage === "report") {
      return "जमा-खर्च Report";
    }

    return "Ganpati Accounts";
  }


  function yearOptions() {

    const current =
      Number(new Date().getFullYear());

    let html = "";

    for (
      let year = current - 2;
      year <= current + 3;
      year++
    ) {

      html += `
        <option
          value="${year}"
          ${
            String(year) === String(selectedYear)
              ? "selected"
              : ""
          }
        >
          ${year}
        </option>
      `;

    }

    return html;
  }


  // ===================================================
  // HOME PAGE
  // ===================================================

  function renderHome() {

    const summary =
      getOverallSummary();

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


    return `

      <div class="page-header">

        <div>

          <h2>
            नमस्कार 🙏
          </h2>

          <p>
            ${selectedYear} Ganpati Mandal Accounts
          </p>

        </div>

        <div class="header-badge">
          🪔 ${selectedYear}
        </div>

      </div>


      <!-- CASH IN HAND -->

      <div class="cash-card">

        <div class="cash-card-main">

          <div class="cash-icon">
            💰
          </div>

          <div>

            <span>
              हातातील रक्कम
            </span>

            <strong>
              ${money(summary.cashInHand)}
            </strong>

            <small>
              Vargani Paid − Haat Karach Paid − Band Paid
            </small>

          </div>

        </div>


        <div class="cash-mini-stats">

          <div>
            <span>Vargani Paid</span>
            <strong>
              ${money(summary.collectionPaid)}
            </strong>
          </div>

          <div>
            <span>Haat Karach Paid</span>
            <strong>
              ${money(summary.expensePaid)}
            </strong>
          </div>

          <div>
            <span>Band Paid</span>
            <strong>
              ${money(summary.visarjanAdvance)}
            </strong>
          </div>

        </div>

      </div>


      <!-- COLLECTION SUMMARY -->

      <div class="section-title">

        <div>
          <h3>
            Vargani Summary
          </h3>

          <p>
            वर्गणीचे एकूण जमा / बाकी
          </p>
        </div>

      </div>


      <div class="summary-grid">

        ${summaryCard(
          "👦",
          "Boys Vargani",
          boys.total,
          boys.paid,
          boys.remaining
        )}

        ${summaryCard(
          "⭐",
          "Main Vargani",
          main.total,
          main.paid,
          main.remaining
        )}

        ${summaryCard(
          "👨‍👩‍👧",
          "Family Vargani",
          family.total,
          family.paid,
          family.remaining
        )}

        ${summaryCard(
          "💰",
          "Total Vargani",
          summary.collectionTotal,
          summary.collectionPaid,
          summary.collectionRemaining
        )}

      </div>


      <!-- BAND / EXPENSE -->

      <div class="section-title">

        <div>
          <h3>
            Other Accounts
          </h3>

          <p>
            Band आणि Haat Karach स्वतंत्र ठेवले आहेत
          </p>
        </div>

      </div>


      <div class="summary-grid">

        ${summaryCard(
          "🎺",
          "Band / Visarjan",
          band.total,
          band.paid,
          band.remaining
        )}

        ${summaryCard(
          "💸",
          "Haat Karach / खर्च",
          expenses.total,
          expenses.paid,
          expenses.remaining
        )}

      </div>


      <!-- RECENT -->

      ${renderRecentActivity()}

    `;
  }


  function summaryCard(
    icon,
    title,
    total,
    paid,
    remaining
  ) {

    return `
      <div class="summary-card">

        <div class="summary-card-top">

          <div class="summary-icon">
            ${icon}
          </div>

          <div>

            <h4>
              ${title}
            </h4>

            <span>
              Total
            </span>

          </div>

        </div>


        <div class="summary-total">
          ${money(total)}
        </div>


        <div class="summary-row">

          <div>
            <span>Paid / जमा</span>
            <strong>
              ${money(paid)}
            </strong>
          </div>

          <div>
            <span>Remaining / बाकी</span>
            <strong>
              ${money(remaining)}
            </strong>
          </div>

        </div>

      </div>
    `;
  }


  // ===================================================
  // RECENT ACTIVITY
  // ===================================================

  function renderRecentActivity() {

    const all = [];

    Object.keys(collectionTypes)
      .forEach(type => {

        getData(type)
          .slice(-5)
          .forEach(item => {

            all.push({
              ...item,
              section:
                collectionTypes[type].title,
              icon:
                collectionTypes[type].icon
            });

          });

      });


    getData("visarjan")
      .slice(-5)
      .forEach(item => {

        all.push({
          ...item,
          section: "Band / Visarjan",
          icon: "🎺"
        });

      });


    getData("expenses")
      .slice(-5)
      .forEach(item => {

        all.push({
          ...item,
          section: "Haat Karach / खर्च",
          icon: "💸"
        });

      });


    const recent =
      all.slice(-8).reverse();


    if (!recent.length) {

      return `
        <div class="empty-card">

          <div>
            📋
          </div>

          <h3>
            No transactions yet
          </h3>

          <p>
            Add your first Vargani, Band or Expense entry.
          </p>

        </div>
      `;

    }


    return `

      <div class="section-title">

        <div>

          <h3>
            Recent Activity
          </h3>

          <p>
            अलीकडील नोंदी
          </p>

        </div>

      </div>


      <div class="activity-card">

        ${recent.map(item => `

          <div class="activity-row">

            <div class="activity-icon">
              ${item.icon}
            </div>

            <div class="activity-info">

              <strong>
                ${escapeHTML(
                  item.name ||
                  item.person ||
                  item.bandName ||
                  item.title ||
                  "Entry"
                )}
              </strong>

              <span>
                ${item.section}
              </span>

            </div>

            <div class="activity-amount">

              <strong>
                ${money(item.paid)}
              </strong>

              <span>
                Paid
              </span>

            </div>

          </div>

        `).join("")}

      </div>

    `;
  }  // ===================================================
  // COLLECTION PAGE
  // ===================================================

  function renderCollectionPage(type) {

    const config =
      collectionTypes[type];

    const summary =
      getCollectionSummary(type);

    const data =
      getData(type);


    return `

      <div class="page-header">

        <div>

          <h2>
            ${config.icon} ${config.title}
          </h2>

          <p>
            ${selectedYear} मधील सर्व नोंदी
          </p>

        </div>


        <button
          type="button"
          class="primary-button"
          data-action="add-entry"
          data-type="${type}"
        >
          + Add Entry
        </button>

      </div>


      <!-- SUMMARY -->

      <div class="summary-grid">

        ${summaryCard(
          "💰",
          "Total",
          summary.total,
          summary.paid,
          summary.remaining
        )}

        ${smallStatCard(
          "जमा / Paid",
          summary.paid,
          "💵"
        )}

        ${smallStatCard(
          "बाकी / Remaining",
          summary.remaining,
          "⏳"
        )}

        ${smallStatCard(
          "Entries",
          summary.count,
          "📋",
          true
        )}

      </div>


      <!-- ENTRY FORM -->

      <div id="${type}FormContainer"></div>


      <!-- TABLE -->

      <div class="table-card">

        <div class="table-card-header">

          <div>

            <h3>
              ${config.title} Entries
            </h3>

            <p>
              Total ${data.length} entries
            </p>

          </div>

          <div class="table-total">

            <span>
              Total
            </span>

            <strong>
              ${money(summary.total)}
            </strong>

          </div>

        </div>


        ${
          data.length
            ? collectionTable(type, data)
            : emptyTable(config.title)
        }

      </div>

    `;
  }


  function smallStatCard(
    title,
    value,
    icon,
    plainNumber = false
  ) {

    return `
      <div class="small-stat-card">

        <div class="small-stat-icon">
          ${icon}
        </div>

        <div>

          <span>
            ${title}
          </span>

          <strong>
            ${
              plainNumber
                ? value
                : money(value)
            }
          </strong>

        </div>

      </div>
    `;
  }


  // ===================================================
  // COLLECTION TABLE
  // ===================================================

  function collectionTable(type, data) {

    return `

      <div class="table-responsive">

        <table class="data-table">

          <thead>

            <tr>

              <th>#</th>

              <th>Name</th>

              <th>Mobile</th>

              <th>Total</th>

              <th>Paid / जमा</th>

              <th>Remaining / बाकी</th>

              <th>Remarks</th>

              <th>Actions</th>

            </tr>

          </thead>


          <tbody>

            ${data.map((item, index) => {

              const total =
                num(item.total);

              const paid =
                num(item.paid);

              const remaining =
                total - paid;


              return `

                <tr>

                  <td>
                    ${index + 1}
                  </td>


                  <td>

                    <div class="person-cell">

                      <div class="person-avatar">
                        ${
                          collectionTypes[type]
                            .icon
                        }
                      </div>

                      <strong>
                        ${escapeHTML(
                          item.name || ""
                        )}
                      </strong>

                    </div>

                  </td>


                  <td>
                    ${escapeHTML(
                      item.mobile || "-"
                    )}
                  </td>


                  <td>
                    <strong>
                      ${money(total)}
                    </strong>
                  </td>


                  <td>
                    <span class="paid-badge">
                      ${money(paid)}
                    </span>
                  </td>


                  <td>

                    <span class="${
                      remaining > 0
                        ? "remaining-badge"
                        : "paid-full-badge"
                    }">

                      ${money(remaining)}

                    </span>

                  </td>


                  <td>

                    <span class="remarks-text">
                      ${escapeHTML(
                        item.remarks || "-"
                      )}
                    </span>

                  </td>


                  <td>

                    <div class="table-actions">

                      <button
                        type="button"
                        class="icon-button edit"
                        data-action="edit-entry"
                        data-type="${type}"
                        data-id="${item.id}"
                        title="Edit"
                      >
                        ✏️
                      </button>


                      <button
                        type="button"
                        class="icon-button delete"
                        data-action="delete-entry"
                        data-type="${type}"
                        data-id="${item.id}"
                        title="Delete"
                      >
                        🗑️
                      </button>

                    </div>

                  </td>

                </tr>

              `;

            }).join("")}

          </tbody>

        </table>

      </div>

    `;
  }


  function emptyTable(title) {

    return `

      <div class="empty-table">

        <div class="empty-icon">
          📋
        </div>

        <h3>
          No ${escapeHTML(title)} entries
        </h3>

        <p>
          Add your first entry using the button above.
        </p>

      </div>

    `;
  }


  // ===================================================
  // COLLECTION FORM
  // ===================================================

  function collectionForm(
    type,
    editItem = null
  ) {

    const editing =
      Boolean(editItem);

    return `

      <div class="form-card">

        <div class="form-card-header">

          <div>

            <h3>
              ${
                editing
                  ? "✏️ Edit Entry"
                  : "➕ Add New Entry"
              }
            </h3>

            <p>
              ${
                collectionTypes[type]
                  .title
              }
            </p>

          </div>


          <button
            type="button"
            class="close-form"
            data-action="close-form"
            data-type="${type}"
          >
            ✕
          </button>

        </div>


        <form
          id="${type}EntryForm"
          class="entry-form"
          data-type="${type}"
          data-edit-id="${
            editing
              ? editItem.id
              : ""
          }"
        >


          <div class="form-grid">


            <div class="form-group">

              <label>
                Name *
              </label>

              <input
                type="text"
                name="name"
                placeholder="Enter name"
                value="${
                  escapeHTML(
                    editItem?.name || ""
                  )
                }"
                required
              />

            </div>


            <div class="form-group">

              <label>
                Mobile
              </label>

              <input
                type="tel"
                name="mobile"
                placeholder="Mobile number"
                value="${
                  escapeHTML(
                    editItem?.mobile || ""
                  )
                }"
              />

            </div>


            <div class="form-group">

              <label>
                Total Amount *
              </label>

              <input
                type="number"
                name="total"
                min="0"
                step="1"
                placeholder="₹ Total"
                value="${
                  editItem?.total ?? ""
                }"
                required
              />

            </div>


            <div class="form-group">

              <label>
                Paid / जमा *
              </label>

              <input
                type="number"
                name="paid"
                min="0"
                step="1"
                placeholder="₹ Paid"
                value="${
                  editItem?.paid ?? ""
                }"
                required
              />

            </div>


            <div class="form-group form-full">

              <label>
                Remaining / बाकी
              </label>

              <input
                type="number"
                name="remaining"
                value="${
                  editItem
                    ? num(editItem.total) -
                      num(editItem.paid)
                    : 0
                }"
                readonly
              />

            </div>


            <div class="form-group form-full">

              <label>
                Remarks
              </label>

              <textarea
                name="remarks"
                rows="3"
                placeholder="Any remarks..."
              >${
                escapeHTML(
                  editItem?.remarks || ""
                )
              }</textarea>

            </div>


          </div>


          <div class="form-actions">

            <button
              type="button"
              class="secondary-button"
              data-action="close-form"
              data-type="${type}"
            >
              Cancel
            </button>


            <button
              type="submit"
              class="primary-button"
            >
              ${
                editing
                  ? "Update Entry"
                  : "Save Entry"
              }
            </button>

          </div>


        </form>

      </div>

    `;
  }


  // ===================================================
  // BAND / VISARJAN PAGE
  // ===================================================

  function renderVisarjanPage() {

    const data =
      getData("visarjan");

    const summary =
      getVisarjanSummary();


    return `

      <div class="page-header">

        <div>

          <h2>
            🎺 Band / Visarjan
          </h2>

          <p>
            Band booking स्वतंत्र section
          </p>

        </div>


        <button
          type="button"
          class="primary-button"
          data-action="add-band"
        >
          + Add Band
        </button>

      </div>


      <div class="summary-grid">

        ${summaryCard(
          "🎺",
          "Band Total",
          summary.total,
          summary.paid,
          summary.remaining
        )}

        ${smallStatCard(
          "Paid / जमा",
          summary.paid,
          "💵"
        )}

        ${smallStatCard(
          "Remaining / बाकी",
          summary.remaining,
          "⏳"
        )}

        ${smallStatCard(
          "Band Entries",
          summary.count,
          "📋",
          true
        )}

      </div>


      <div id="visarjanFormContainer"></div>


      <div class="table-card">

        <div class="table-card-header">

          <div>

            <h3>
              Band Bookings
            </h3>

            <p>
              Band money is kept separate from Vargani.
            </p>

          </div>


          <div class="table-total">

            <span>
              Band Total
            </span>

            <strong>
              ${money(summary.total)}
            </strong>

          </div>

        </div>


        ${
          data.length
            ? bandTable(data)
            : emptyTable(
                "Band / Visarjan"
              )
        }

      </div>

    `;
  }


  // ===================================================
  // BAND TABLE
  // ===================================================

  function bandTable(data) {

    return `

      <div class="table-responsive">

        <table class="data-table">

          <thead>

            <tr>

              <th>#</th>

              <th>Band Name</th>

              <th>Total</th>

              <th>Paid / जमा</th>

              <th>Remaining / बाकी</th>

              <th>Remarks</th>

              <th>Actions</th>

            </tr>

          </thead>


          <tbody>

            ${data.map((item, index) => {

              const total =
                num(item.total);

              const paid =
                getBandPaid(item);

              const remaining =
                total - paid;


              return `

                <tr>

                  <td>
                    ${index + 1}
                  </td>


                  <td>

                    <div class="person-cell">

                      <div class="person-avatar">
                        🎺
                      </div>

                      <strong>
                        ${escapeHTML(
                          item.bandName ||
                          item.name ||
                          ""
                        )}
                      </strong>

                    </div>

                  </td>


                  <td>
                    <strong>
                      ${money(total)}
                    </strong>
                  </td>


                  <td>
                    <span class="paid-badge">
                      ${money(paid)}
                    </span>
                  </td>


                  <td>

                    <span class="${
                      remaining > 0
                        ? "remaining-badge"
                        : "paid-full-badge"
                    }">

                      ${money(remaining)}

                    </span>

                  </td>


                  <td>

                    <span class="remarks-text">
                      ${escapeHTML(
                        item.remarks || "-"
                      )}
                    </span>

                  </td>


                  <td>

                    <div class="table-actions">

                      <button
                        type="button"
                        class="icon-button edit"
                        data-action="edit-band"
                        data-id="${item.id}"
                        title="Edit"
                      >
                        ✏️
                      </button>


                      <button
                        type="button"
                        class="icon-button delete"
                        data-action="delete-band"
                        data-id="${item.id}"
                        title="Delete"
                      >
                        🗑️
                      </button>

                    </div>

                  </td>

                </tr>

              `;

            }).join("")}

          </tbody>

        </table>

      </div>

    `;
  }


  // ===================================================
  // BAND FORM
  // ===================================================

  function bandForm(editItem = null) {

    const editing =
      Boolean(editItem);

    const paid =
      editing
        ? getBandPaid(editItem)
        : 0;


    return `

      <div class="form-card">

        <div class="form-card-header">

          <div>

            <h3>
              ${
                editing
                  ? "✏️ Edit Band"
                  : "➕ Add Band Booking"
              }
            </h3>

            <p>
              Band booking details
            </p>

          </div>


          <button
            type="button"
            class="close-form"
            data-action="close-band-form"
          >
            ✕
          </button>

        </div>


        <form
          id="bandEntryForm"
          class="entry-form"
          data-edit-id="${
            editing
              ? editItem.id
              : ""
          }"
        >


          <div class="form-grid">


            <div class="form-group">

              <label>
                Band Name *
              </label>

              <input
                type="text"
                name="bandName"
                placeholder="Enter Band Name"
                value="${
                  escapeHTML(
                    editItem?.bandName ||
                    editItem?.name ||
                    ""
                  )
                }"
                required
              />

            </div>


            <div class="form-group">

              <label>
                Total Amount *
              </label>

              <input
                type="number"
                name="total"
                min="0"
                step="1"
                placeholder="₹ Total"
                value="${
                  editItem?.total ?? ""
                }"
                required
              />

            </div>


            <div class="form-group">

              <label>
                Paid / जमा
              </label>

              <input
                type="number"
                name="paid"
                min="0"
                step="1"
                placeholder="₹ Paid"
                value="${
                  editing ? paid : ""
                }"
              />

            </div>


            <div class="form-group">

              <label>
                Remaining / बाकी
              </label>

              <input
                type="number"
                name="remaining"
                value="${
                  editing
                    ? num(editItem.total) -
                      paid
                    : 0
                }"
                readonly
              />

            </div>


            <div class="form-group form-full">

              <label>
                Remarks
              </label>

              <textarea
                name="remarks"
                rows="3"
                placeholder="Band booking remarks..."
              >${
                escapeHTML(
                  editItem?.remarks || ""
                )
              }</textarea>

            </div>


          </div>


          <div class="form-actions">

            <button
              type="button"
              class="secondary-button"
              data-action="close-band-form"
            >
              Cancel
            </button>


            <button
              type="submit"
              class="primary-button"
            >
              ${
                editing
                  ? "Update Band"
                  : "Save Band"
              }
            </button>

          </div>


        </form>

      </div>

    `;
  }  // ===================================================
  // HAAT KARACH / EXPENSES PAGE
  // ===================================================

  function renderExpensesPage() {

    const data =
      getData("expenses");

    const summary =
      getExpenseSummary();


    return `

      <div class="page-header">

        <div>

          <h2>
            💸 Haat Karach / खर्च
          </h2>

          <p>
            मंडळाचे सर्व खर्च स्वतंत्र नोंदवा
          </p>

        </div>


        <button
          type="button"
          class="primary-button"
          data-action="add-expense"
        >
          + Add Expense
        </button>

      </div>


      <div class="summary-grid">

        ${summaryCard(
          "💸",
          "Expense Total",
          summary.total,
          summary.paid,
          summary.remaining
        )}

        ${smallStatCard(
          "Paid / जमा",
          summary.paid,
          "💵"
        )}

        ${smallStatCard(
          "Remaining / बाकी",
          summary.remaining,
          "⏳"
        )}

        ${smallStatCard(
          "Expenses",
          summary.count,
          "📋",
          true
        )}

      </div>


      <div id="expensesFormContainer"></div>


      <div class="table-card">

        <div class="table-card-header">

          <div>

            <h3>
              Haat Karach Entries
            </h3>

            <p>
              खर्चाच्या सर्व नोंदी
            </p>

          </div>


          <div class="table-total">

            <span>
              Total Expense
            </span>

            <strong>
              ${money(summary.total)}
            </strong>

          </div>

        </div>


        ${
          data.length
            ? expenseTable(data)
            : emptyTable(
                "Haat Karach / खर्च"
              )
        }

      </div>

    `;
  }


  // ===================================================
  // EXPENSE TABLE
  // ===================================================

  function expenseTable(data) {

    return `

      <div class="table-responsive">

        <table class="data-table">

          <thead>

            <tr>

              <th>#</th>

              <th>Expense Name</th>

              <th>Total</th>

              <th>Paid / जमा</th>

              <th>Remaining / बाकी</th>

              <th>Remarks</th>

              <th>Actions</th>

            </tr>

          </thead>


          <tbody>

            ${data.map((item, index) => {

              const total =
                num(item.total);

              const paid =
                num(item.paid);

              const remaining =
                total - paid;


              return `

                <tr>

                  <td>
                    ${index + 1}
                  </td>


                  <td>

                    <div class="person-cell">

                      <div class="person-avatar">
                        💸
                      </div>

                      <strong>
                        ${escapeHTML(
                          item.title ||
                          item.name ||
                          ""
                        )}
                      </strong>

                    </div>

                  </td>


                  <td>
                    <strong>
                      ${money(total)}
                    </strong>
                  </td>


                  <td>
                    <span class="paid-badge">
                      ${money(paid)}
                    </span>
                  </td>


                  <td>

                    <span class="${
                      remaining > 0
                        ? "remaining-badge"
                        : "paid-full-badge"
                    }">

                      ${money(remaining)}

                    </span>

                  </td>


                  <td>

                    <span class="remarks-text">
                      ${escapeHTML(
                        item.remarks || "-"
                      )}
                    </span>

                  </td>


                  <td>

                    <div class="table-actions">

                      <button
                        type="button"
                        class="icon-button edit"
                        data-action="edit-expense"
                        data-id="${item.id}"
                        title="Edit"
                      >
                        ✏️
                      </button>


                      <button
                        type="button"
                        class="icon-button delete"
                        data-action="delete-expense"
                        data-id="${item.id}"
                        title="Delete"
                      >
                        🗑️
                      </button>

                    </div>

                  </td>

                </tr>

              `;

            }).join("")}

          </tbody>

        </table>

      </div>

    `;
  }


  // ===================================================
  // EXPENSE FORM
  // ===================================================

  function expenseForm(editItem = null) {

    const editing =
      Boolean(editItem);


    return `

      <div class="form-card">

        <div class="form-card-header">

          <div>

            <h3>
              ${
                editing
                  ? "✏️ Edit Expense"
                  : "➕ Add Expense"
              }
            </h3>

            <p>
              Haat Karach / खर्च
            </p>

          </div>


          <button
            type="button"
            class="close-form"
            data-action="close-expense-form"
          >
            ✕
          </button>

        </div>


        <form
          id="expenseEntryForm"
          class="entry-form"
          data-edit-id="${
            editing
              ? editItem.id
              : ""
          }"
        >


          <div class="form-grid">


            <div class="form-group">

              <label>
                Expense Name *
              </label>

              <input
                type="text"
                name="title"
                placeholder="उदा. Decoration, Light, Sound..."
                value="${
                  escapeHTML(
                    editItem?.title ||
                    editItem?.name ||
                    ""
                  )
                }"
                required
              />

            </div>


            <div class="form-group">

              <label>
                Total Amount *
              </label>

              <input
                type="number"
                name="total"
                min="0"
                step="1"
                placeholder="₹ Total"
                value="${
                  editItem?.total ?? ""
                }"
                required
              />

            </div>


            <div class="form-group">

              <label>
                Paid / जमा
              </label>

              <input
                type="number"
                name="paid"
                min="0"
                step="1"
                placeholder="₹ Paid"
                value="${
                  editItem?.paid ?? ""
                }"
              />

            </div>


            <div class="form-group">

              <label>
                Remaining / बाकी
              </label>

              <input
                type="number"
                name="remaining"
                value="${
                  editing
                    ? num(editItem.total) -
                      num(editItem.paid)
                    : 0
                }"
                readonly
              />

            </div>


            <div class="form-group form-full">

              <label>
                Remarks
              </label>

              <textarea
                name="remarks"
                rows="3"
                placeholder="खर्चाबद्दल काही remarks..."
              >${
                escapeHTML(
                  editItem?.remarks || ""
                )
              }</textarea>

            </div>


          </div>


          <div class="form-actions">

            <button
              type="button"
              class="secondary-button"
              data-action="close-expense-form"
            >
              Cancel
            </button>


            <button
              type="submit"
              class="primary-button"
            >
              ${
                editing
                  ? "Update Expense"
                  : "Save Expense"
              }
            </button>

          </div>


        </form>

      </div>

    `;
  }


  // ===================================================
  // REPORT PAGE
  // ===================================================

  function renderReportPage() {

    const summary =
      getOverallSummary();


    const boys =
      getCollectionSummary("boys");

    const main =
      getCollectionSummary("main");

    const family =
      getCollectionSummary("family");


    return `

      <div class="page-header">

        <div>

          <h2>
            📊 जमा-खर्च Report
          </h2>

          <p>
            ${selectedYear} चे संपूर्ण आर्थिक सारांश
          </p>

        </div>


        <button
          type="button"
          class="primary-button"
          data-action="print-report"
        >
          🖨️ PDF / Print
        </button>

      </div>


      <div class="report-sheet">

        <div class="report-heading">

          <div>

            <h1>
              गणपती मंडळ जमा-खर्च
            </h1>

            <p>
              वर्ष ${selectedYear}
            </p>

          </div>

          <div class="report-date">
            Generated: ${today()}
          </div>

        </div>


        <!-- COLLECTION -->

        <div class="report-section">

          <h3>
            💰 Vargani Collection
          </h3>


          <table class="report-table">

            <thead>

              <tr>

                <th>Section</th>

                <th>Total</th>

                <th>Paid / जमा</th>

                <th>Remaining / बाकी</th>

              </tr>

            </thead>


            <tbody>

              ${reportRow(
                "👦 Boys Vargani",
                boys
              )}

              ${reportRow(
                "⭐ Main Vargani",
                main
              )}

              ${reportRow(
                "👨‍👩‍👧 Family Vargani",
                family
              )}


              <tr class="report-total">

                <td>
                  Total Vargani
                </td>

                <td>
                  ${money(
                    summary.collectionTotal
                  )}
                </td>

                <td>
                  ${money(
                    summary.collectionPaid
                  )}
                </td>

                <td>
                  ${money(
                    summary.collectionRemaining
                  )}
                </td>

              </tr>

            </tbody>

          </table>

        </div>


        <!-- BAND -->

        <div class="report-section">

          <h3>
            🎺 Band / Visarjan
          </h3>


          <table class="report-table">

            <thead>

              <tr>

                <th>Section</th>

                <th>Total</th>

                <th>Paid / जमा</th>

                <th>Remaining / बाकी</th>

              </tr>

            </thead>


            <tbody>

              <tr>

                <td>
                  Band / Visarjan
                </td>

                <td>
                  ${money(
                    summary.visarjanTotal
                  )}
                </td>

                <td>
                  ${money(
                    summary.visarjanAdvance
                  )}
                </td>

                <td>
                  ${money(
                    summary.visarjanRemaining
                  )}
                </td>

              </tr>

            </tbody>

          </table>

        </div>


        <!-- EXPENSE -->

        <div class="report-section">

          <h3>
            💸 Haat Karach / खर्च
          </h3>


          <table class="report-table">

            <thead>

              <tr>

                <th>Section</th>

                <th>Total</th>

                <th>Paid / जमा</th>

                <th>Remaining / बाकी</th>

              </tr>

            </thead>


            <tbody>

              <tr>

                <td>
                  Haat Karach / खर्च
                </td>

                <td>
                  ${money(
                    summary.expenseTotal
                  )}
                </td>

                <td>
                  ${money(
                    summary.expensePaid
                  )}
                </td>

                <td>
                  ${money(
                    summary.expenseRemaining
                  )}
                </td>

              </tr>

            </tbody>

          </table>

        </div>


        <!-- CASH -->

        <div class="report-cash">

          <div>

            <span>
              हातातील रक्कम
            </span>

            <small>
              Vargani Paid − Haat Karach Paid − Band Paid
            </small>

          </div>


          <strong>
            ${money(
              summary.cashInHand
            )}
          </strong>

        </div>


        <div class="report-note">

          <strong>
            Note:
          </strong>

          Band Total हा Vargani Total मध्ये
          समाविष्ट केलेला नाही. Band Paid आणि
          Haat Karach Paid हे हातातील रक्कम
          calculate करताना वजा केले जातात.

        </div>


        <div class="report-footer">

          🙏 गणपती बाप्पा मोरया 🙏

        </div>

      </div>

    `;
  }


  function reportRow(
    name,
    summary
  ) {

    return `

      <tr>

        <td>
          ${name}
        </td>

        <td>
          ${money(summary.total)}
        </td>

        <td>
          ${money(summary.paid)}
        </td>

        <td>
          ${money(summary.remaining)}
        </td>

      </tr>

    `;
  }  // ===================================================
  // MAIN RENDER
  // ===================================================

  function render() {

    let content = "";

    if (currentPage === "home") {

      content = renderHome();

    } else if (
      collectionTypes[currentPage]
    ) {

      content =
        renderCollectionPage(
          currentPage
        );

    } else if (
      currentPage === "visarjan"
    ) {

      content =
        renderVisarjanPage();

    } else if (
      currentPage === "expenses"
    ) {

      content =
        renderExpensesPage();

    } else if (
      currentPage === "report"
    ) {

      content =
        renderReportPage();

    } else {

      currentPage = "home";

      content =
        renderHome();

    }


    element.innerHTML =
      layout(content);


    attachEvents();

  }


  // ===================================================
  // EVENT LISTENERS
  // ===================================================

  function attachEvents() {function attachEvents(element) {

  // -----------------------------------------------
  // LOGOUT
  // -----------------------------------------------

  const logoutBtn =
    element.querySelector("#logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener(
      "click",
      async () => {
        const originalText =
          logoutBtn.textContent;

        try {
          logoutBtn.disabled = true;
          logoutBtn.textContent =
            "Logging out...";

          const { error } =
            await supabase.auth.signOut();

          if (error) {
            console.error(
              "Logout error:",
              error
            );

            alert(
              error.message ||
              "Logout failed. Please try again."
            );

            logoutBtn.disabled = false;
            logoutBtn.textContent =
              originalText;

            return;
          }

          // SIGNED_OUT auth listener
          // automatically opens Login screen.
        } catch (error) {
          console.error(
            "Logout error:",
            error
          );

          alert(
            error?.message ||
            "Logout failed. Please try again."
          );

          logoutBtn.disabled = false;
          logoutBtn.textContent =
            originalText;
        }
      }
    );
  }

  // इथून तुझा existing code सुरू राहू दे

    // -----------------------------------------------
    // NAVIGATION
    // -----------------------------------------------

    element
      .querySelectorAll(".nav-item")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            currentPage =
              button.dataset.page;

            render();

          }
        );

      });


    // -----------------------------------------------
    // YEAR SELECTOR
    // -----------------------------------------------

    const yearSelect =
      element.querySelector(
        "#yearSelect"
      );


    if (yearSelect) {

      yearSelect.addEventListener("change", async (e) => {
  selectedYear = e.target.value;

  localStorage.setItem(
    "ganpati_selected_year",
    selectedYear
  );

  await loadYearFromCloud();

  render("home");
});;

    }


    // -----------------------------------------------
    // ADD COLLECTION ENTRY
    // -----------------------------------------------

    element
      .querySelectorAll(
        '[data-action="add-entry"]'
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const type =
              button.dataset.type;

            const container =
              element.querySelector(
                `#${type}FormContainer`
              );

            if (container) {

              container.innerHTML =
                collectionForm(type);

              attachFormEvents();

              container.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });

            }

          }
        );

      });


    // -----------------------------------------------
    // ADD BAND
    // -----------------------------------------------

    element
      .querySelectorAll(
        '[data-action="add-band"]'
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const container =
              element.querySelector(
                "#visarjanFormContainer"
              );

            if (container) {

              container.innerHTML =
                bandForm();

              attachFormEvents();

              container.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });

            }

          }
        );

      });


    // -----------------------------------------------
    // ADD EXPENSE
    // -----------------------------------------------

    element
      .querySelectorAll(
        '[data-action="add-expense"]'
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const container =
              element.querySelector(
                "#expensesFormContainer"
              );

            if (container) {

              container.innerHTML =
                expenseForm();

              attachFormEvents();

              container.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });

            }

          }
        );

      });


    // -----------------------------------------------
    // EDIT COLLECTION
    // -----------------------------------------------

    element
      .querySelectorAll(
        '[data-action="edit-entry"]'
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const type =
              button.dataset.type;

            const id =
              button.dataset.id;

            const data =
              getData(type);

            const item =
              data.find(
                x => String(x.id) === String(id)
              );

            if (!item) {
              return;
            }


            const container =
              element.querySelector(
                `#${type}FormContainer`
              );


            if (container) {

              container.innerHTML =
                collectionForm(
                  type,
                  item
                );

              attachFormEvents();

              container.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });

            }

          }
        );

      });


    // -----------------------------------------------
    // EDIT BAND
    // -----------------------------------------------

    element
      .querySelectorAll(
        '[data-action="edit-band"]'
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset.id;

            const data =
              getData("visarjan");

            const item =
              data.find(
                x => String(x.id) === String(id)
              );

            if (!item) {
              return;
            }


            const container =
              element.querySelector(
                "#visarjanFormContainer"
              );


            if (container) {

              container.innerHTML =
                bandForm(item);

              attachFormEvents();

              container.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });

            }

          }
        );

      });


    // -----------------------------------------------
    // EDIT EXPENSE
    // -----------------------------------------------

    element
      .querySelectorAll(
        '[data-action="edit-expense"]'
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset.id;

            const data =
              getData("expenses");

            const item =
              data.find(
                x => String(x.id) === String(id)
              );

            if (!item) {
              return;
            }


            const container =
              element.querySelector(
                "#expensesFormContainer"
              );


            if (container) {

              container.innerHTML =
                expenseForm(item);

              attachFormEvents();

              container.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });

            }

          }
        );

      });


    // -----------------------------------------------
    // DELETE COLLECTION
    // -----------------------------------------------

    element
      .querySelectorAll(
        '[data-action="delete-entry"]'
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const type =
              button.dataset.type;

            const id =
              button.dataset.id;


            if (
              !confirm(
                "ही नोंद delete करायची आहे का?"
              )
            ) {

              return;

            }


            const data =
              getData(type);


            const updated =
              data.filter(
                item =>
                  String(item.id) !==
                  String(id)
              );


            saveData(
              type,
              updated
            );


            render();

          }
        );

      });


    // -----------------------------------------------
    // DELETE BAND
    // -----------------------------------------------

    element
      .querySelectorAll(
        '[data-action="delete-band"]'
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset.id;


            if (
              !confirm(
                "हा Band record delete करायचा आहे का?"
              )
            ) {

              return;

            }


            const data =
              getData("visarjan");


            const updated =
              data.filter(
                item =>
                  String(item.id) !==
                  String(id)
              );


            saveData(
              "visarjan",
              updated
            );


            render();

          }
        );

      });


    // -----------------------------------------------
    // DELETE EXPENSE
    // -----------------------------------------------

    element
      .querySelectorAll(
        '[data-action="delete-expense"]'
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset.id;


            if (
              !confirm(
                "हा expense delete करायचा आहे का?"
              )
            ) {

              return;

            }


            const data =
              getData("expenses");


            const updated =
              data.filter(
                item =>
                  String(item.id) !==
                  String(id)
              );


            saveData(
              "expenses",
              updated
            );


            render();

          }
        );

      });


    // -----------------------------------------------
    // PRINT REPORT
    // -----------------------------------------------

    element
      .querySelectorAll(
        '[data-action="print-report"]'
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            window.print();

          }
        );

      });


    // -----------------------------------------------
    // FORM CLOSE BUTTONS
    // -----------------------------------------------

    element
      .querySelectorAll(
        '[data-action="close-form"]'
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const type =
              button.dataset.type;

            const container =
              element.querySelector(
                `#${type}FormContainer`
              );

            if (container) {

              container.innerHTML = "";

            }

          }
        );

      });


    element
      .querySelectorAll(
        '[data-action="close-band-form"]'
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const container =
              element.querySelector(
                "#visarjanFormContainer"
              );

            if (container) {

              container.innerHTML = "";

            }

          }
        );

      });


    element
      .querySelectorAll(
        '[data-action="close-expense-form"]'
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const container =
              element.querySelector(
                "#expensesFormContainer"
              );

            if (container) {

              container.innerHTML = "";

            }

          }
        );

      });

  }


  // ===================================================
  // FORM EVENTS
  // ===================================================

  function attachFormEvents() {

    // -----------------------------------------------
    // COLLECTION FORMS
    // -----------------------------------------------

    element
      .querySelectorAll(
        ".entry-form[data-type]"
      )
      .forEach(form => {

        const type =
          form.dataset.type;


        const totalInput =
          form.querySelector(
            '[name="total"]'
          );


        const paidInput =
          form.querySelector(
            '[name="paid"]'
          );


        const remainingInput =
          form.querySelector(
            '[name="remaining"]'
          );


        function updateRemaining() {

          const total =
            num(totalInput?.value);

          const paid =
            num(paidInput?.value);

          if (remainingInput) {

            remainingInput.value =
              Math.max(
                total - paid,
                0
              );

          }

        }


        totalInput?.addEventListener(
          "input",
          updateRemaining
        );


        paidInput?.addEventListener(
          "input",
          updateRemaining
        );


        form.addEventListener(
          "submit",
          event => {

            event.preventDefault();

            updateRemaining();


            const formData =
              new FormData(form);


            const name =
              String(
                formData.get("name") || ""
              ).trim();


            const mobile =
              String(
                formData.get("mobile") || ""
              ).trim();


            const total =
              num(
                formData.get("total")
              );


            const paid =
              num(
                formData.get("paid")
              );


            const remarks =
              String(
                formData.get("remarks") || ""
              ).trim();


            if (!name) {

              alert(
                "Please enter name."
              );

              return;

            }


            if (paid > total) {

              alert(
                "Paid amount Total पेक्षा जास्त असू शकत नाही."
              );

              return;

            }


            const data =
              getData(type);


            const editId =
              form.dataset.editId;


            if (editId) {

              const index =
                data.findIndex(
                  item =>
                    String(item.id) ===
                    String(editId)
                );


              if (index !== -1) {

                data[index] = {
                  ...data[index],

                  name,
                  mobile,
                  total,
                  paid,
                  remaining:
                    total - paid,
                  remarks,

                  updatedAt:
                    new Date().toISOString()
                };

              }

            } else {

              data.push({

                id:
                  Date.now().toString(),

                name,
                mobile,
                total,
                paid,

                remaining:
                  total - paid,

                remarks,

                createdAt:
                  new Date().toISOString(),

                updatedAt:
                  new Date().toISOString()

              });

            }


            saveData(
              type,
              data
            );


            render();

          }
        );

      });


    // -----------------------------------------------
    // BAND FORM
    // -----------------------------------------------

    const bandFormElement =
      element.querySelector(
        "#bandEntryForm"
      );


    if (bandFormElement) {

      const totalInput =
        bandFormElement.querySelector(
          '[name="total"]'
        );


      const paidInput =
        bandFormElement.querySelector(
          '[name="paid"]'
        );


      const remainingInput =
        bandFormElement.querySelector(
          '[name="remaining"]'
        );


      function updateBandRemaining() {

        const total =
          num(totalInput?.value);

        const paid =
          num(paidInput?.value);


        if (remainingInput) {

          remainingInput.value =
            Math.max(
              total - paid,
              0
            );

        }

      }


      totalInput?.addEventListener(
        "input",
        updateBandRemaining
      );


      paidInput?.addEventListener(
        "input",
        updateBandRemaining
      );


      bandFormElement.addEventListener(
        "submit",
        event => {

          event.preventDefault();

          updateBandRemaining();


          const formData =
            new FormData(
              bandFormElement
            );


          const bandName =
            String(
              formData.get("bandName") || ""
            ).trim();


          const total =
            num(
              formData.get("total")
            );


          const paid =
            num(
              formData.get("paid")
            );


          const remarks =
            String(
              formData.get("remarks") || ""
            ).trim();


          if (!bandName) {

            alert(
              "Please enter Band Name."
            );

            return;

          }


          if (paid > total) {

            alert(
              "Paid amount Total पेक्षा जास्त असू शकत नाही."
            );

            return;

          }


          const data =
            getData("visarjan");


          const editId =
            bandFormElement.dataset.editId;


          if (editId) {

            const index =
              data.findIndex(
                item =>
                  String(item.id) ===
                  String(editId)
              );


            if (index !== -1) {

              data[index] = {
                ...data[index],

                bandName,
                total,
                paid,

                // Keep remaining calculated.
                remaining:
                  total - paid,

                remarks,

                updatedAt:
                  new Date().toISOString()
              };

            }

          } else {

            data.push({

              id:
                Date.now().toString(),

              bandName,

              total,
              paid,

              remaining:
                total - paid,

              remarks,

              createdAt:
                new Date().toISOString(),

              updatedAt:
                new Date().toISOString()

            });

          }


          saveData(
            "visarjan",
            data
          );


          render();

        }
      );

    }


    // -----------------------------------------------
    // EXPENSE FORM
    // -----------------------------------------------

    const expenseFormElement =
      element.querySelector(
        "#expenseEntryForm"
      );


    if (expenseFormElement) {

      const totalInput =
        expenseFormElement.querySelector(
          '[name="total"]'
        );


      const paidInput =
        expenseFormElement.querySelector(
          '[name="paid"]'
        );


      const remainingInput =
        expenseFormElement.querySelector(
          '[name="remaining"]'
        );


      function updateExpenseRemaining() {

        const total =
          num(totalInput?.value);

        const paid =
          num(paidInput?.value);


        if (remainingInput) {

          remainingInput.value =
            Math.max(
              total - paid,
              0
            );

        }

      }


      totalInput?.addEventListener(
        "input",
        updateExpenseRemaining
      );


      paidInput?.addEventListener(
        "input",
        updateExpenseRemaining
      );


      expenseFormElement.addEventListener(
        "submit",
        event => {

          event.preventDefault();

          updateExpenseRemaining();


          const formData =
            new FormData(
              expenseFormElement
            );


          const title =
            String(
              formData.get("title") || ""
            ).trim();


          const total =
            num(
              formData.get("total")
            );


          const paid =
            num(
              formData.get("paid")
            );


          const remarks =
            String(
              formData.get("remarks") || ""
            ).trim();


          if (!title) {

            alert(
              "Please enter Expense Name."
            );

            return;

          }


          if (paid > total) {

            alert(
              "Paid amount Total पेक्षा जास्त असू शकत नाही."
            );

            return;

          }


          const data =
            getData("expenses");


          const editId =
            expenseFormElement.dataset.editId;


          if (editId) {

            const index =
              data.findIndex(
                item =>
                  String(item.id) ===
                  String(editId)
              );


            if (index !== -1) {

              data[index] = {
                ...data[index],

                title,
                total,
                paid,

                remaining:
                  total - paid,

                remarks,

                updatedAt:
                  new Date().toISOString()
              };

            }

          } else {

            data.push({

              id:
                Date.now().toString(),

              title,

              total,
              paid,

              remaining:
                total - paid,

              remarks,

              createdAt:
                new Date().toISOString(),

              updatedAt:
                new Date().toISOString()

            });

          }


          saveData(
            "expenses",
            data
          );


          render();

        }
      );

    }

  }


  // ===================================================
  // INITIAL RENDER
  // ===================================================

  render();

}// =====================================================
// SUPABASE AUTHENTICATION
// =====================================================

async function showLoginScreen(element) {

  element.innerHTML = `

    <div class="auth-page">

      <div class="auth-card">

        <div class="auth-logo">
          🪔
        </div>

        <h1>
          Ganpati Accounts
        </h1>

        <p class="auth-subtitle">
          Secure Mandal Accounts
        </p>


        <div id="authMessage"></div>


        <form id="loginForm">

          <div class="auth-field">

            <label>
              Login ID / Email
            </label>

            <input
              id="loginEmail"
              type="email"
              placeholder="Enter your email"
              autocomplete="email"
              required
            />

          </div>


          <div class="auth-field">

            <label>
              Password
            </label>

            <input
              id="loginPassword"
              type="password"
              placeholder="Enter password"
              autocomplete="current-password"
              required
            />

          </div>


          <button
            type="submit"
            class="auth-primary-button"
            id="loginButton"
          >
            Login
          </button>

        </form>


        <div class="auth-links">

          <button
            type="button"
            id="showSignupButton"
          >
            Create Account
          </button>


          <button
            type="button"
            id="showForgotButton"
          >
            Forgot Password?
          </button>

        </div>


        <div class="auth-footer">

          🔐 Your accounts data is protected.

        </div>

      </div>

    </div>

  `;


  attachLoginEvents(element);

}


// =====================================================
// LOGIN EVENTS
// =====================================================

function attachLoginEvents(element) {

  const loginForm =
    element.querySelector("#loginForm");


  const message =
    element.querySelector("#authMessage");


  function showMessage(
    text,
    type = "error"
  ) {

    if (!message) {
      return;
    }


    message.innerHTML = `

      <div class="auth-message ${type}">
        ${escapeAuthHTML(text)}
      </div>

    `;

  }


  loginForm?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const email =
        element
          .querySelector("#loginEmail")
          ?.value
          .trim();


      const password =
        element
          .querySelector("#loginPassword")
          ?.value;


      const loginButton =
        element.querySelector(
          "#loginButton"
        );


      if (!email || !password) {

        showMessage(
          "Email आणि Password दोन्ही भरा."
        );

        return;

      }


      if (!supabaseConfigured) {

        showMessage(
          "Supabase configuration missing. Please check src/supabase.js."
        );

        return;

      }


      if (loginButton) {

        loginButton.disabled = true;
        loginButton.textContent =
          "Logging in...";

      }


      const {
        error
      } =
        await supabase.auth.signInWithPassword({
          email,
          password
        });


      if (error) {

        showMessage(
          error.message ||
          "Login failed. Please check your email and password."
        );


        if (loginButton) {

          loginButton.disabled = false;
          loginButton.textContent =
            "Login";

        }


        return;

      }


      // Auth state listener will start the application.

    }
  );


  element
    .querySelector(
      "#showSignupButton"
    )
    ?.addEventListener(
      "click",
      () => {

        showSignupScreen(element);

      }
    );


  element
    .querySelector(
      "#showForgotButton"
    )
    ?.addEventListener(
      "click",
      () => {

        showForgotPasswordScreen(
          element
        );

      }
    );

}


// =====================================================
// SIGN UP SCREEN
// =====================================================

function showSignupScreen(element) {

  element.innerHTML = `

    <div class="auth-page">

      <div class="auth-card">

        <div class="auth-logo">
          🪔
        </div>

        <h1>
          Create Account
        </h1>

        <p class="auth-subtitle">
          Ganpati Accounts
        </p>


        <div id="authMessage"></div>


        <form id="signupForm">

          <div class="auth-field">

            <label>
              Email
            </label>

            <input
              id="signupEmail"
              type="email"
              placeholder="Enter email"
              autocomplete="email"
              required
            />

          </div>


          <div class="auth-field">

            <label>
              Password
            </label>

            <input
              id="signupPassword"
              type="password"
              placeholder="Minimum 6 characters"
              autocomplete="new-password"
              minlength="6"
              required
            />

          </div>


          <div class="auth-field">

            <label>
              Confirm Password
            </label>

            <input
              id="signupConfirmPassword"
              type="password"
              placeholder="Confirm password"
              autocomplete="new-password"
              minlength="6"
              required
            />

          </div>


          <button
            type="submit"
            class="auth-primary-button"
            id="signupButton"
          >
            Create Account
          </button>

        </form>


        <div class="auth-links">

          <button
            type="button"
            id="backToLoginButton"
          >
            ← Back to Login
          </button>

        </div>


      </div>

    </div>

  `;


  const form =
    element.querySelector(
      "#signupForm"
    );


  const message =
    element.querySelector(
      "#authMessage"
    );


  function showMessage(
    text,
    type = "error"
  ) {

    if (!message) {
      return;
    }


    message.innerHTML = `

      <div class="auth-message ${type}">
        ${escapeAuthHTML(text)}
      </div>

    `;

  }


  form?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const email =
        element
          .querySelector(
            "#signupEmail"
          )
          ?.value
          .trim();


      const password =
        element
          .querySelector(
            "#signupPassword"
          )
          ?.value;


      const confirmPassword =
        element
          .querySelector(
            "#signupConfirmPassword"
          )
          ?.value;


      const signupButton =
        element.querySelector(
          "#signupButton"
        );


      if (
        password !==
        confirmPassword
      ) {

        showMessage(
          "Passwords match होत नाहीत."
        );

        return;

      }


      if (password.length < 6) {

        showMessage(
          "Password किमान 6 characters चा असावा."
        );

        return;

      }


      if (!supabaseConfigured) {

        showMessage(
          "Supabase configuration missing."
        );

        return;

      }


      if (signupButton) {

        signupButton.disabled = true;
        signupButton.textContent =
          "Creating...";

      }


      const {
        data,
        error
      } =
        await supabase.auth.signUp({
          email,
          password
        });


      if (error) {

        showMessage(
          error.message ||
          "Account create failed."
        );


        if (signupButton) {

          signupButton.disabled = false;
          signupButton.textContent =
            "Create Account";

        }


        return;

      }


      if (data?.session) {

        // Session available immediately.
        // Auth state listener will handle app startup.

        showMessage(
          "Account created successfully!",
          "success"
        );

      } else {

        showMessage(
          "Account created. Please check your email for verification.",
          "success"
        );


        if (signupButton) {

          signupButton.disabled = false;
          signupButton.textContent =
            "Create Account";

        }

      }

    }
  );


  element
    .querySelector(
      "#backToLoginButton"
    )
    ?.addEventListener(
      "click",
      () => {

        showLoginScreen(element);

      }
    );

}


// =====================================================
// FORGOT PASSWORD
// =====================================================

function showForgotPasswordScreen(
  element
) {

  element.innerHTML = `

    <div class="auth-page">

      <div class="auth-card">

        <div class="auth-logo">
          🔐
        </div>

        <h1>
          Forgot Password?
        </h1>

        <p class="auth-subtitle">
          Reset your Ganpati Accounts password
        </p>


        <div id="authMessage"></div>


        <form id="forgotPasswordForm">

          <div class="auth-field">

            <label>
              Email
            </label>

            <input
              id="forgotEmail"
              type="email"
              placeholder="Enter registered email"
              autocomplete="email"
              required
            />

          </div>


          <button
            type="submit"
            class="auth-primary-button"
            id="forgotButton"
          >
            Send Reset Link
          </button>

        </form>


        <div class="auth-links">

          <button
            type="button"
            id="backToLoginButton"
          >
            ← Back to Login
          </button>

        </div>

      </div>

    </div>

  `;


  const form =
    element.querySelector(
      "#forgotPasswordForm"
    );


  const message =
    element.querySelector(
      "#authMessage"
    );


  function showMessage(
    text,
    type = "error"
  ) {

    if (!message) {
      return;
    }


    message.innerHTML = `

      <div class="auth-message ${type}">
        ${escapeAuthHTML(text)}
      </div>

    `;

  }


  form?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const email =
        element
          .querySelector(
            "#forgotEmail"
          )
          ?.value
          .trim();


      const button =
        element.querySelector(
          "#forgotButton"
        );


      if (!supabaseConfigured) {

        showMessage(
          "Supabase configuration missing."
        );

        return;

      }


      if (button) {

        button.disabled = true;
        button.textContent =
          "Sending...";

      }


      const redirectTo =
        window.location.origin +
        window.location.pathname;


      const {
        error
      } =
        await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo
          }
        );


      if (error) {

        showMessage(
          error.message ||
          "Unable to send reset link."
        );


        if (button) {

          button.disabled = false;
          button.textContent =
            "Send Reset Link";

        }


        return;

      }


      showMessage(
        "Password reset link email वर पाठवला आहे.",
        "success"
      );


      if (button) {

        button.disabled = false;
        button.textContent =
          "Send Reset Link";

      }

    }
  );


  element
    .querySelector(
      "#backToLoginButton"
    )
    ?.addEventListener(
      "click",
      () => {

        showLoginScreen(element);

      }
    );

}


// =====================================================
// PASSWORD UPDATE SCREEN
// =====================================================

function showUpdatePasswordScreen(
  element
) {

  element.innerHTML = `

    <div class="auth-page">

      <div class="auth-card">

        <div class="auth-logo">
          🔐
        </div>

        <h1>
          Set New Password
        </h1>

        <p class="auth-subtitle">
          Enter your new password
        </p>


        <div id="authMessage"></div>


        <form id="updatePasswordForm">

          <div class="auth-field">

            <label>
              New Password
            </label>

            <input
              id="newPassword"
              type="password"
              placeholder="Minimum 6 characters"
              autocomplete="new-password"
              minlength="6"
              required
            />

          </div>


          <div class="auth-field">

            <label>
              Confirm Password
            </label>

            <input
              id="confirmNewPassword"
              type="password"
              placeholder="Confirm password"
              autocomplete="new-password"
              minlength="6"
              required
            />

          </div>


          <button
            type="submit"
            class="auth-primary-button"
            id="updatePasswordButton"
          >
            Update Password
          </button>

        </form>

      </div>

    </div>

  `;


  const form =
    element.querySelector(
      "#updatePasswordForm"
    );


  const message =
    element.querySelector(
      "#authMessage"
    );


  function showMessage(
    text,
    type = "error"
  ) {

    if (!message) {
      return;
    }


    message.innerHTML = `

      <div class="auth-message ${type}">
        ${escapeAuthHTML(text)}
      </div>

    `;

  }


  form?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const password =
        element
          .querySelector(
            "#newPassword"
          )
          ?.value;


      const confirmPassword =
        element
          .querySelector(
            "#confirmNewPassword"
          )
          ?.value;


      const button =
        element.querySelector(
          "#updatePasswordButton"
        );


      if (
        password !==
        confirmPassword
      ) {

        showMessage(
          "Passwords match होत नाहीत."
        );

        return;

      }


      if (password.length < 6) {

        showMessage(
          "Password किमान 6 characters चा असावा."
        );

        return;

      }


      if (button) {

        button.disabled = true;
        button.textContent =
          "Updating...";

      }


      const {
        error
      } =
        await supabase.auth.updateUser({
          password
        });


      if (error) {

        showMessage(
          error.message ||
          "Password update failed."
        );


        if (button) {

          button.disabled = false;
          button.textContent =
            "Update Password";

        }


        return;

      }


      showMessage(
        "Password successfully updated. Please login again.",
        "success"
      );


      await supabase.auth.signOut();


      setTimeout(
        () => {

          showLoginScreen(
            element
          );

        },
        1200
      );

    }
  );

}


// =====================================================
// AUTH HTML ESCAPE
// =====================================================

function escapeAuthHTML(
  value
) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


// =====================================================
// START APPLICATION AFTER LOGIN
// =====================================================

async function bootAuthenticatedApp(
  element
) {

  try {

    await startApp(element);

  } catch (error) {

    console.error(
      "Application startup error:",
      error
    );


    element.innerHTML = `

      <div
        style="
          padding:40px;
          font-family:Arial,sans-serif;
          text-align:center;
        "
      >

        <h2>
          Something went wrong
        </h2>

        <p>
          ${escapeAuthHTML(
            error?.message ||
            "Unknown application error"
          )}
        </p>

      </div>

    `;

  }

}


// =====================================================
// AUTH BOOT
// =====================================================

export async function setupApp(
  element
) {

  if (!element) {

    console.error(
      "App element not found."
    );

    return;

  }


  // ---------------------------------------------------
  // Supabase must be configured
  // ---------------------------------------------------

  if (!supabaseConfigured) {

    element.innerHTML = `

      <div
        style="
          min-height:100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:30px;
          font-family:Arial,sans-serif;
          background:#f7efe3;
        "
      >

        <div
          style="
            max-width:520px;
            width:100%;
            background:#fff;
            padding:32px;
            border-radius:20px;
            box-shadow:0 12px 40px rgba(0,0,0,.12);
          "
        >

          <h2>
            Supabase Configuration Required
          </h2>

          <p>
            Please check your
            <strong>
              src/supabase.js
            </strong>
            file.
          </p>

          <p>
            SUPABASE_URL आणि publishable key
            properly configured आहेत का ते तपासा.
          </p>

        </div>

      </div>

    `;

    return;

  }


  // ---------------------------------------------------
  // Check current session
  // ---------------------------------------------------

  const {
    data,
    error
  } =
    await supabase.auth.getSession();


  if (error) {

    console.error(
      "Session error:",
      error
    );


    await showLoginScreen(
      element
    );

    return;

  }


  // ---------------------------------------------------
  // Existing session
  // ---------------------------------------------------

  if (data?.session) {

    await bootAuthenticatedApp(
      element
    );

  } else {

    await showLoginScreen(
      element
    );

  }


  // ---------------------------------------------------
  // Auth state listener
  // ---------------------------------------------------

  supabase.auth.onAuthStateChange(
    async (
      event,
      session
    ) => {

      console.log(
        "Auth event:",
        event
      );


      if (
        event ===
        "SIGNED_IN"
      ) {

        if (session) {

          await bootAuthenticatedApp(
            element
          );

        }

      }


      if (
        event ===
        "SIGNED_OUT"
      ) {

        await showLoginScreen(
          element
        );

      }


      if (
        event ===
        "PASSWORD_RECOVERY"
      ) {

        showUpdatePasswordScreen(
          element
        );

      }

    }
  );

}