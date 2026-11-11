"use strict";

/* ==========================================================================
   HOSPITAL MANAGEMENT SYSTEM - FRONTEND LOGIC
   --------------------------------------------------------------------------
   This file uses only the browser's built-in fetch API. Each page reads from
   the Express REST API and re-renders a table after every change.
   ========================================================================== */

const API_BASE = "/api";

const VIEW_META = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Overview of hospital activity"
  },
  departments: {
    title: "Departments",
    subtitle: "Hospital wings, locations and contacts"
  },
  doctors: {
    title: "Doctors",
    subtitle: "Doctor profiles and department assignments"
  },
  patients: {
    title: "Patients",
    subtitle: "Registered patient information"
  },
  appointments: {
    title: "Appointments",
    subtitle: "Scheduling and visit status"
  },
  records: {
    title: "Medical Records",
    subtitle: "Diagnoses, prescriptions and clinical notes"
  }
};

const state = {
  currentView: "dashboard",
  departments: [],
  doctors: [],
  patients: [],
  appointments: []
};

const elements = {};
let lastFocusedElement = null;

document.addEventListener("DOMContentLoaded", init);

function init() {
  elements.appShell = document.getElementById("app-shell");
  elements.sidebar = document.getElementById("sidebar");
  elements.sidebarBackdrop = document.getElementById("sidebar-backdrop");
  elements.menuToggle = document.getElementById("menu-toggle");
  elements.pageTitle = document.getElementById("page-title");
  elements.pageSubtitle = document.getElementById("page-subtitle");
  elements.currentDate = document.getElementById("current-date");

  elements.dashboardStats = document.getElementById("dashboard-stats");
  elements.dashboardTodayBody = document.getElementById("dashboard-today-body");
  elements.dashboardRecords = document.getElementById("dashboard-records");

  elements.departmentsBody = document.getElementById("departments-body");
  elements.departmentsCount = document.getElementById("departments-count");
  elements.doctorsBody = document.getElementById("doctors-body");
  elements.doctorsCount = document.getElementById("doctors-count");
  elements.patientsBody = document.getElementById("patients-body");
  elements.patientsCount = document.getElementById("patients-count");
  elements.appointmentsBody = document.getElementById("appointments-body");
  elements.appointmentsCount = document.getElementById("appointments-count");
  elements.recordsBody = document.getElementById("records-body");
  elements.recordsCount = document.getElementById("records-count");

  elements.modalOverlay = document.getElementById("modal-overlay");
  elements.modalTitle = document.getElementById("modal-title");
  elements.modalBody = document.getElementById("modal-body");
  elements.modalClose = document.getElementById("modal-close");
  elements.toastContainer = document.getElementById("toast-container");

  renderCurrentDate();
  bindNavigation();
  bindButtons();
  bindTableActions();
  bindModal();

  window.addEventListener("hashchange", handleRoute);
  handleRoute();
}

/* ==========================================================================
   NAVIGATION
   ========================================================================== */

function bindNavigation() {
  elements.menuToggle.addEventListener("click", () => {
    const isOpen = elements.appShell.classList.toggle("sidebar-open");
    elements.menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  elements.sidebarBackdrop.addEventListener("click", closeSidebar);

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      closeSidebar();
    }
  });
}

function closeSidebar() {
  elements.appShell.classList.remove("sidebar-open");
  elements.menuToggle.setAttribute("aria-expanded", "false");
}

function handleRoute() {
  const requestedView = window.location.hash.replace(/^#\/?/, "");
  const view = VIEW_META[requestedView] ? requestedView : "dashboard";

  if (requestedView !== view) {
    window.history.replaceState(null, "", `#${view}`);
  }

  state.currentView = view;

  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("hidden", section.id !== `view-${view}`);
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    const isActive = link.dataset.view === view;
    link.classList.toggle("active", isActive);

    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  const meta = VIEW_META[view];
  elements.pageTitle.textContent = meta.title;
  elements.pageSubtitle.textContent = meta.subtitle;

  closeSidebar();

  if (!elements.modalOverlay.classList.contains("hidden")) {
    closeModal();
  }

  loadView(view);
}

async function loadView(view) {
  try {
    if (view === "dashboard") {
      await loadDashboard();
    } else if (view === "departments") {
      await loadDepartments();
    } else if (view === "doctors") {
      await loadDoctors();
    } else if (view === "patients") {
      await loadPatients();
    } else if (view === "appointments") {
      await loadAppointments();
    } else if (view === "records") {
      await loadRecords();
    }
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function refreshCurrentView() {
  await loadView(state.currentView);
}

/* ==========================================================================
   API HELPER
   ========================================================================== */

async function api(path, options = {}) {
  const { method = "GET", body } = options;
  const requestOptions = {
    method,
    headers: {
      Accept: "application/json"
    }
  };

  if (body !== undefined) {
    requestOptions.headers["Content-Type"] = "application/json";
    requestOptions.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, requestOptions);
  const text = await response.text();

  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      data = null;
    }
  }

  if (!response.ok) {
    const message =
      data && data.error
        ? data.error
        : `Request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return data;
}

/* ==========================================================================
   DASHBOARD
   ========================================================================== */

async function loadDashboard() {
  const data = await api("/dashboard");

  renderDashboardStats(data.counts);
  renderTodayAppointments(data.today_appointments);
  renderRecentRecords(data.recent_records);
}

function renderDashboardStats(counts) {
  const cards = [
    {
      label: "Departments",
      value: counts.departments,
      note: "Hospital wings",
      icon: "department",
      tone: "teal"
    },
    {
      label: "Doctors",
      value: counts.doctors,
      note: "Doctor profiles",
      icon: "doctor",
      tone: "blue"
    },
    {
      label: "Patients",
      value: counts.patients,
      note: "Registered patients",
      icon: "patient",
      tone: "violet"
    },
    {
      label: "Today's appointments",
      value: counts.today_appointments,
      note: `${counts.appointments} total appointments`,
      icon: "appointment",
      tone: "amber"
    },
    {
      label: "Medical records",
      value: counts.medical_records,
      note: `${counts.completed_appointments} completed visits`,
      icon: "record",
      tone: "rose"
    }
  ];

  elements.dashboardStats.innerHTML = cards
    .map(
      (card) => `
        <article class="stat-card">
          <div class="stat-icon tone-${card.tone}">
            <svg class="icon"><use href="#icon-${card.icon}"></use></svg>
          </div>
          <div>
            <p class="stat-label">${escapeHtml(card.label)}</p>
            <p class="stat-value">${Number(card.value)}</p>
            <p class="stat-note">${escapeHtml(card.note)}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function renderTodayAppointments(appointments) {
  if (!appointments.length) {
    elements.dashboardTodayBody.innerHTML = emptyRow(
      4,
      "No appointments today",
      "Use the Appointments page to schedule a visit."
    );
    return;
  }

  elements.dashboardTodayBody.innerHTML = appointments
    .map(
      (appointment) => `
        <tr>
          <td><strong>${formatTime(appointment.appointment_time)}</strong></td>
          <td>
            <span class="cell-main">${escapeHtml(
              fullName(appointment.patient_first_name, appointment.patient_last_name)
            )}</span>
          </td>
          <td>
            <span class="cell-main">${escapeHtml(
              fullName(appointment.doctor_first_name, appointment.doctor_last_name)
            )}</span>
            <span class="cell-sub">${escapeHtml(appointment.specialization)}</span>
          </td>
          <td>${statusBadge(appointment.status)}</td>
        </tr>
      `
    )
    .join("");
}

function renderRecentRecords(records) {
  if (!records.length) {
    elements.dashboardRecords.innerHTML = `
      <div class="empty-state">
        <strong>No medical records yet</strong>
        Add a record after a completed appointment.
      </div>
    `;
    return;
  }

  elements.dashboardRecords.innerHTML = records
    .map((record) => {
      const parts = recordDateParts(record.record_date);

      return `
        <div class="record-item">
          <div class="record-date">
            <strong>${parts.day}</strong>
            <span>${parts.month}</span>
          </div>
          <div class="record-info">
            <strong>${escapeHtml(record.diagnosis)}</strong>
            <p>
              ${escapeHtml(
                fullName(record.patient_first_name, record.patient_last_name)
              )}
              &middot; Dr. ${escapeHtml(
                fullName(record.doctor_first_name, record.doctor_last_name)
              )}
            </p>
          </div>
        </div>
      `;
    })
    .join("");
}

/* ==========================================================================
   DEPARTMENTS
   ========================================================================== */

async function loadDepartments() {
  try {
    const departments = await api("/departments");
    state.departments = departments;

    elements.departmentsCount.textContent = recordLabel(departments.length);

    if (!departments.length) {
      elements.departmentsBody.innerHTML = emptyRow(
        6,
        "No departments yet",
        "Click “Add department” to create the first one."
      );
      return;
    }

    elements.departmentsBody.innerHTML = departments
      .map((department) => {
        const doctorCount = Number(department.doctor_count);
        const doctorText = `${doctorCount} ${
          doctorCount === 1 ? "doctor" : "doctors"
        }`;

        return `
          <tr>
            <td>${department.department_id}</td>
            <td><span class="cell-main">${escapeHtml(
              department.department_name
            )}</span></td>
            <td>${escapeHtml(department.location)}</td>
            <td>${escapeHtml(department.phone)}</td>
            <td><span class="mini-tag">${doctorText}</span></td>
            <td>
              <div class="actions-cell">
                ${actionButton("edit", department.department_id, "Edit")}
                ${actionButton(
                  "delete",
                  department.department_id,
                  "Delete",
                  "danger"
                )}
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    elements.departmentsBody.innerHTML = errorRow(6, error.message);
    throw error;
  }
}

/* ==========================================================================
   DOCTORS
   ========================================================================== */

async function loadDoctors() {
  try {
    const doctors = await api("/doctors");
    state.doctors = doctors;

    elements.doctorsCount.textContent = recordLabel(doctors.length);

    if (!doctors.length) {
      elements.doctorsBody.innerHTML = emptyRow(
        7,
        "No doctors yet",
        "Click “Add doctor” to create the first profile."
      );
      return;
    }

    elements.doctorsBody.innerHTML = doctors
      .map(
        (doctor) => `
          <tr>
            <td>${doctor.doctor_id}</td>
            <td>
              <span class="cell-main">Dr. ${escapeHtml(
                fullName(doctor.first_name, doctor.last_name)
              )}</span>
            </td>
            <td>${escapeHtml(doctor.specialization)}</td>
            <td>${escapeHtml(doctor.department_name)}</td>
            <td><strong>${formatCurrency(doctor.consultation_fee)}</strong></td>
            <td>
              <span class="cell-main">${escapeHtml(doctor.phone)}</span>
              <span class="cell-sub">${escapeHtml(doctor.email)}</span>
            </td>
            <td>
              <div class="actions-cell">
                ${actionButton("edit", doctor.doctor_id, "Edit")}
                ${actionButton("delete", doctor.doctor_id, "Delete", "danger")}
              </div>
            </td>
          </tr>
        `
      )
      .join("");
  } catch (error) {
    elements.doctorsBody.innerHTML = errorRow(7, error.message);
    throw error;
  }
}

/* ==========================================================================
   PATIENTS
   ========================================================================== */

async function loadPatients() {
  try {
    const patients = await api("/patients");
    state.patients = patients;

    elements.patientsCount.textContent = recordLabel(patients.length);

    if (!patients.length) {
      elements.patientsBody.innerHTML = emptyRow(
        9,
        "No patients yet",
        "Click “Add patient” to register the first patient."
      );
      return;
    }

    elements.patientsBody.innerHTML = patients
      .map(
        (patient) => `
          <tr>
            <td>${patient.patient_id}</td>
            <td>
              <span class="cell-main">${escapeHtml(
                fullName(patient.first_name, patient.last_name)
              )}</span>
            </td>
            <td>
              <span class="cell-main">${formatDate(patient.date_of_birth)}</span>
              <span class="cell-sub">${calculateAge(
                patient.date_of_birth
              )} years old</span>
            </td>
            <td>${escapeHtml(patient.gender)}</td>
            <td>${
              patient.blood_group
                ? `<span class="mini-tag">${escapeHtml(
                    patient.blood_group
                  )}</span>`
                : '<span class="text-muted">—</span>'
            }</td>
            <td>${escapeHtml(patient.phone)}</td>
            <td>${patient.email ? escapeHtml(patient.email) : "—"}</td>
            <td><div class="cell-wrap">${escapeHtml(patient.address)}</div></td>
            <td>
              <div class="actions-cell">
                ${actionButton("edit", patient.patient_id, "Edit")}
                ${actionButton(
                  "delete",
                  patient.patient_id,
                  "Delete",
                  "danger"
                )}
              </div>
            </td>
          </tr>
        `
      )
      .join("");
  } catch (error) {
    elements.patientsBody.innerHTML = errorRow(9, error.message);
    throw error;
  }
}

/* ==========================================================================
   APPOINTMENTS
   ========================================================================== */

async function loadAppointments() {
  try {
    const appointments = await api("/appointments");
    state.appointments = appointments;

    elements.appointmentsCount.textContent = recordLabel(appointments.length);

    if (!appointments.length) {
      elements.appointmentsBody.innerHTML = emptyRow(
        7,
        "No appointments yet",
        "Click “New appointment” to schedule the first visit."
      );
      return;
    }

    elements.appointmentsBody.innerHTML = appointments
      .map((appointment) => {
        let actions = actionButton("edit", appointment.appointment_id, "Edit");

        if (appointment.status === "Scheduled") {
          actions += actionButton(
            "complete",
            appointment.appointment_id,
            "Complete"
          );
          actions += actionButton(
            "cancel",
            appointment.appointment_id,
            "Cancel",
            "danger"
          );
        }

        actions += actionButton(
          "delete",
          appointment.appointment_id,
          "Delete",
          "danger"
        );

        return `
          <tr>
            <td>${appointment.appointment_id}</td>
            <td>
              <span class="cell-main">${formatDate(
                appointment.appointment_date
              )}</span>
              <span class="cell-sub">${formatTime(
                appointment.appointment_time
              )}</span>
            </td>
            <td>${escapeHtml(
              fullName(
                appointment.patient_first_name,
                appointment.patient_last_name
              )
            )}</td>
            <td>
              <span class="cell-main">Dr. ${escapeHtml(
                fullName(
                  appointment.doctor_first_name,
                  appointment.doctor_last_name
                )
              )}</span>
              <span class="cell-sub">${escapeHtml(
                appointment.specialization
              )}</span>
            </td>
            <td>${statusBadge(appointment.status)}</td>
            <td><div class="cell-wrap">${escapeHtml(appointment.reason)}</div></td>
            <td><div class="actions-cell">${actions}</div></td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    elements.appointmentsBody.innerHTML = errorRow(7, error.message);
    throw error;
  }
}

/* ==========================================================================
   MEDICAL RECORDS
   ========================================================================== */

async function loadRecords() {
  try {
    const records = await api("/medical-records");

    elements.recordsCount.textContent = recordLabel(records.length);

    if (!records.length) {
      elements.recordsBody.innerHTML = emptyRow(
        8,
        "No medical records yet",
        "Click “Add medical record” after a completed appointment."
      );
      return;
    }

    elements.recordsBody.innerHTML = records
      .map(
        (record) => `
          <tr>
            <td>${record.record_id}</td>
            <td>${formatDateTime(record.record_date)}</td>
            <td>${escapeHtml(
              fullName(record.patient_first_name, record.patient_last_name)
            )}</td>
            <td>
              <span class="cell-main">Dr. ${escapeHtml(
                fullName(record.doctor_first_name, record.doctor_last_name)
              )}</span>
              <span class="cell-sub">${escapeHtml(record.specialization)}</span>
            </td>
            <td>${
              record.appointment_id
                ? `<span class="cell-main">${formatDate(
                    record.appointment_date
                  )}</span>
                   <span class="cell-sub">${formatTime(
                     record.appointment_time
                   )}</span>`
                : '<span class="text-muted">Not linked</span>'
            }</td>
            <td><div class="cell-wrap">${escapeHtml(record.diagnosis)}</div></td>
            <td><div class="cell-wrap">${
              record.prescription ? escapeHtml(record.prescription) : "—"
            }</div></td>
            <td><div class="cell-wrap-wide">${
              record.notes ? escapeHtml(record.notes) : "—"
            }</div></td>
          </tr>
        `
      )
      .join("");
  } catch (error) {
    elements.recordsBody.innerHTML = errorRow(8, error.message);
    throw error;
  }
}

/* ==========================================================================
   ADD / EDIT FORMS
   ========================================================================== */

function openDepartmentForm(department = null) {
  const isEditing = Boolean(department);
  const submitLabel = isEditing ? "Save changes" : "Add department";

  openModal(
    isEditing ? "Edit department" : "Add department",
    `
      <form id="entity-form" class="entity-form">
        <div class="form-error hidden" role="alert"></div>
        <p class="form-intro">
          Departments group doctors by specialty. A department cannot be
          deleted while doctors are still assigned to it.
        </p>

        <div class="form-grid">
          ${textField("Department name", "department_name", department?.department_name, {
            required: true,
            maxlength: 100,
            placeholder: "e.g. Cardiology"
          })}
          ${textField("Location", "location", department?.location, {
            required: true,
            maxlength: 100,
            placeholder: "e.g. Block A - 2nd Floor"
          })}
          ${textField("Phone", "phone", department?.phone, {
            required: true,
            maxlength: 15,
            type: "tel",
            placeholder: "08023456701"
          })}
        </div>

        <p class="required-note">Fields marked * are required.</p>
        ${formActions(submitLabel)}
      </form>
    `
  );

  const form = document.getElementById("entity-form");

  wireForm({
    form,
    submitLabel,
    successMessage: isEditing
      ? "Department updated successfully."
      : "Department added successfully.",
    save: async () => {
      await api(
        isEditing
          ? `/departments/${department.department_id}`
          : "/departments",
        {
          method: isEditing ? "PUT" : "POST",
          body: getFormData(form)
        }
      );
    }
  });
}

async function openDoctorForm(doctor = null) {
  try {
    const departments = await api("/departments");

    if (!departments.length) {
      showToast("Add a department before adding a doctor.", "error");
      return;
    }

    const isEditing = Boolean(doctor);
    const submitLabel = isEditing ? "Save changes" : "Add doctor";
    const feeValue = doctor
      ? Number(doctor.consultation_fee).toFixed(2)
      : "0.00";

    openModal(
      isEditing ? "Edit doctor" : "Add doctor",
      `
        <form id="entity-form" class="entity-form">
          <div class="form-error hidden" role="alert"></div>
          <p class="form-intro">
            Every doctor belongs to one department. Email addresses must be
            unique across all doctors.
          </p>

          <div class="form-grid">
            ${textField("First name", "first_name", doctor?.first_name, {
              required: true,
              maxlength: 50,
              placeholder: "e.g. Arjun"
            })}
            ${textField("Last name", "last_name", doctor?.last_name, {
              required: true,
              maxlength: 50,
              placeholder: "e.g. Rao"
            })}
            ${textField("Specialization", "specialization", doctor?.specialization, {
              required: true,
              maxlength: 100,
              placeholder: "e.g. Interventional Cardiology"
            })}
            ${selectField(
              "Department",
              "department_id",
              departments.map((department) => ({
                value: department.department_id,
                label: department.department_name
              })),
              doctor?.department_id,
              { required: true, placeholder: "Select a department" }
            )}
            ${textField("Consultation fee (₹)", "consultation_fee", feeValue, {
              required: true,
              type: "number",
              min: "0",
              step: "0.01",
              hint: "The database rejects negative fees."
            })}
            ${textField("Phone", "phone", doctor?.phone, {
              required: true,
              maxlength: 15,
              type: "tel",
              placeholder: "9845012301"
            })}
            ${textField("Email", "email", doctor?.email, {
              required: true,
              type: "email",
              maxlength: 100,
              placeholder: "doctor@hospital.com"
            })}
          </div>

          <p class="required-note">Fields marked * are required.</p>
          ${formActions(submitLabel)}
        </form>
      `
    );

    const form = document.getElementById("entity-form");

    wireForm({
      form,
      submitLabel,
      successMessage: isEditing
        ? "Doctor updated successfully."
        : "Doctor added successfully.",
      save: async () => {
        await api(
          isEditing ? `/doctors/${doctor.doctor_id}` : "/doctors",
          {
            method: isEditing ? "PUT" : "POST",
            body: getFormData(form)
          }
        );
      }
    });
  } catch (error) {
    showToast(error.message, "error");
  }
}

function openPatientForm(patient = null) {
  const isEditing = Boolean(patient);
  const submitLabel = isEditing ? "Save changes" : "Add patient";

  openModal(
    isEditing ? "Edit patient" : "Add patient",
    `
      <form id="entity-form" class="entity-form">
        <div class="form-error hidden" role="alert"></div>
        <p class="form-intro">
          Register the patient's demographic details. Email is optional, but a
          supplied email must be unique.
        </p>

        <div class="form-grid">
          ${textField("First name", "first_name", patient?.first_name, {
            required: true,
            maxlength: 50,
            placeholder: "e.g. Rohan"
          })}
          ${textField("Last name", "last_name", patient?.last_name, {
            required: true,
            maxlength: 50,
            placeholder: "e.g. Mehta"
          })}
          ${textField("Date of birth", "date_of_birth", patient?.date_of_birth, {
            required: true,
            type: "date",
            max: todayInputValue()
          })}
          ${selectField(
            "Gender",
            "gender",
            [
              { value: "Male", label: "Male" },
              { value: "Female", label: "Female" },
              { value: "Other", label: "Other" }
            ],
            patient?.gender,
            { required: true, placeholder: "Select gender" }
          )}
          ${textField("Phone", "phone", patient?.phone, {
            required: true,
            maxlength: 15,
            type: "tel",
            placeholder: "9900011101"
          })}
          ${textField("Email (optional)", "email", patient?.email, {
            type: "email",
            maxlength: 100,
            placeholder: "patient@example.com"
          })}
          ${selectField(
            "Blood group (optional)",
            "blood_group",
            ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
              (group) => ({ value: group, label: group })
            ),
            patient?.blood_group,
            { required: false, placeholder: "Not known" }
          )}
          ${textareaField("Address", "address", patient?.address, {
            required: true,
            rows: 3,
            full: true,
            placeholder: "House number, street, area, city"
          })}
        </div>

        <p class="required-note">Fields marked * are required.</p>
        ${formActions(submitLabel)}
      </form>
    `
  );

  const form = document.getElementById("entity-form");

  wireForm({
    form,
    submitLabel,
    successMessage: isEditing
      ? "Patient updated successfully."
      : "Patient added successfully.",
    save: async () => {
      await api(
        isEditing ? `/patients/${patient.patient_id}` : "/patients",
        {
          method: isEditing ? "PUT" : "POST",
          body: getFormData(form)
        }
      );
    }
  });
}

async function openAppointmentForm(appointment = null) {
  try {
    const [patients, doctors] = await Promise.all([
      api("/patients"),
      api("/doctors")
    ]);

    if (!patients.length || !doctors.length) {
      showToast(
        "Add at least one patient and one doctor before booking an appointment.",
        "error"
      );
      return;
    }

    const isEditing = Boolean(appointment);
    const submitLabel = isEditing ? "Save changes" : "Book appointment";

    openModal(
      isEditing ? "Edit appointment" : "New appointment",
      `
        <form id="entity-form" class="entity-form">
          <div class="form-error hidden" role="alert"></div>
          <p class="form-intro">
            A doctor cannot have two appointments at the same date and time.
            The database enforces this rule with a unique constraint.
          </p>

          <div class="form-grid">
            ${selectField(
              "Patient",
              "patient_id",
              patients.map((patient) => ({
                value: patient.patient_id,
                label: `${fullName(patient.first_name, patient.last_name)} · ${patient.phone}`
              })),
              appointment?.patient_id,
              { required: true, placeholder: "Select a patient" }
            )}
            ${selectField(
              "Doctor",
              "doctor_id",
              doctors.map((doctor) => ({
                value: doctor.doctor_id,
                label: `Dr. ${fullName(doctor.first_name, doctor.last_name)} · ${doctor.specialization}`
              })),
              appointment?.doctor_id,
              { required: true, placeholder: "Select a doctor" }
            )}
            ${textField(
              "Appointment date",
              "appointment_date",
              appointment?.appointment_date || todayInputValue(),
              { required: true, type: "date" }
            )}
            ${textField(
              "Appointment time",
              "appointment_time",
              appointment?.appointment_time
                ? appointment.appointment_time.slice(0, 5)
                : "",
              { required: true, type: "time" }
            )}
            ${selectField(
              "Status",
              "status",
              [
                { value: "Scheduled", label: "Scheduled" },
                { value: "Completed", label: "Completed" },
                { value: "Cancelled", label: "Cancelled" }
              ],
              appointment?.status || "Scheduled",
              { required: true }
            )}
            ${textareaField("Reason for visit", "reason", appointment?.reason, {
              required: true,
              rows: 3,
              full: true,
              placeholder: "Briefly describe the patient's complaint"
            })}
          </div>

          <p class="required-note">Fields marked * are required.</p>
          ${formActions(submitLabel)}
        </form>
      `
    );

    const form = document.getElementById("entity-form");

    wireForm({
      form,
      submitLabel,
      successMessage: isEditing
        ? "Appointment updated successfully."
        : "Appointment booked successfully.",
      save: async () => {
        await api(
          isEditing
            ? `/appointments/${appointment.appointment_id}`
            : "/appointments",
          {
            method: isEditing ? "PUT" : "POST",
            body: getFormData(form)
          }
        );
      }
    });
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function openMedicalRecordForm() {
  try {
    const [patients, doctors, appointments] = await Promise.all([
      api("/patients"),
      api("/doctors"),
      api("/appointments")
    ]);

    if (!patients.length || !doctors.length) {
      showToast(
        "Add at least one patient and one doctor before creating a medical record.",
        "error"
      );
      return;
    }

    const completedAppointments = appointments.filter(
      (appointment) => appointment.status === "Completed"
    );

    openModal(
      "Add medical record",
      `
        <form id="entity-form" class="entity-form">
          <div class="form-error hidden" role="alert"></div>
          <p class="form-intro">
            Choose a completed appointment to link the record automatically, or
            leave the appointment empty for a standalone consultation.
          </p>

          <div class="form-grid">
            ${selectField(
              "Completed appointment (optional)",
              "appointment_id",
              completedAppointments.map((appointment) => ({
                value: appointment.appointment_id,
                label: `${formatDate(appointment.appointment_date)} · ${formatTime(
                  appointment.appointment_time
                )} — ${fullName(
                  appointment.patient_first_name,
                  appointment.patient_last_name
                )} with Dr. ${fullName(
                  appointment.doctor_first_name,
                  appointment.doctor_last_name
                )}`
              })),
              "",
              {
                required: false,
                full: true,
                placeholder:
                  completedAppointments.length > 0
                    ? "No linked appointment"
                    : "No completed appointments available",
                hint: "Selecting an appointment fills in its patient and doctor."
              }
            )}
            ${selectField(
              "Patient",
              "patient_id",
              patients.map((patient) => ({
                value: patient.patient_id,
                label: fullName(patient.first_name, patient.last_name)
              })),
              "",
              { required: true, placeholder: "Select a patient" }
            )}
            ${selectField(
              "Doctor",
              "doctor_id",
              doctors.map((doctor) => ({
                value: doctor.doctor_id,
                label: `Dr. ${fullName(doctor.first_name, doctor.last_name)} · ${doctor.specialization}`
              })),
              "",
              { required: true, placeholder: "Select a doctor" }
            )}
            ${textareaField("Diagnosis", "diagnosis", "", {
              required: true,
              rows: 3,
              full: true,
              placeholder: "The doctor's formal diagnosis"
            })}
            ${textareaField("Prescription", "prescription", "", {
              rows: 3,
              full: true,
              placeholder: "Medicines, dosage and instructions (optional)"
            })}
            ${textareaField("Clinical notes", "notes", "", {
              rows: 3,
              full: true,
              placeholder: "Additional observations (optional)"
            })}
          </div>

          <p class="required-note">Fields marked * are required.</p>
          ${formActions("Save record")}
        </form>
      `
    );

    const form = document.getElementById("entity-form");
    const appointmentSelect = form.querySelector('[name="appointment_id"]');
    const patientSelect = form.querySelector('[name="patient_id"]');
    const doctorSelect = form.querySelector('[name="doctor_id"]');

    appointmentSelect.addEventListener("change", () => {
      const selected = completedAppointments.find(
        (appointment) =>
          String(appointment.appointment_id) === appointmentSelect.value
      );

      if (!selected) {
        return;
      }

      patientSelect.value = String(selected.patient_id);
      doctorSelect.value = String(selected.doctor_id);
    });

    wireForm({
      form,
      submitLabel: "Save record",
      successMessage: "Medical record added successfully.",
      save: async () => {
        await api("/medical-records", {
          method: "POST",
          body: getFormData(form)
        });
      }
    });
  } catch (error) {
    showToast(error.message, "error");
  }
}

/* ==========================================================================
   BUTTONS + TABLE ACTIONS
   ========================================================================== */

function bindButtons() {
  document
    .getElementById("add-department-btn")
    .addEventListener("click", () => openDepartmentForm());

  document
    .getElementById("add-doctor-btn")
    .addEventListener("click", () => openDoctorForm());

  document
    .getElementById("add-patient-btn")
    .addEventListener("click", () => openPatientForm());

  document
    .getElementById("add-appointment-btn")
    .addEventListener("click", () => openAppointmentForm());

  document
    .getElementById("quick-appointment-btn")
    .addEventListener("click", () => openAppointmentForm());

  document
    .getElementById("add-record-btn")
    .addEventListener("click", () => openMedicalRecordForm());
}

function bindTableActions() {
  elements.departmentsBody.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const department = state.departments.find(
      (item) => String(item.department_id) === button.dataset.id
    );
    if (!department) return;

    if (button.dataset.action === "edit") {
      openDepartmentForm(department);
    } else if (button.dataset.action === "delete") {
      await deleteDepartment(department);
    }
  });

  elements.doctorsBody.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const doctor = state.doctors.find(
      (item) => String(item.doctor_id) === button.dataset.id
    );
    if (!doctor) return;

    if (button.dataset.action === "edit") {
      openDoctorForm(doctor);
    } else if (button.dataset.action === "delete") {
      await deleteDoctor(doctor);
    }
  });

  elements.patientsBody.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const patient = state.patients.find(
      (item) => String(item.patient_id) === button.dataset.id
    );
    if (!patient) return;

    if (button.dataset.action === "edit") {
      openPatientForm(patient);
    } else if (button.dataset.action === "delete") {
      await deletePatient(patient);
    }
  });

  elements.appointmentsBody.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const appointment = state.appointments.find(
      (item) => String(item.appointment_id) === button.dataset.id
    );
    if (!appointment) return;

    if (button.dataset.action === "edit") {
      openAppointmentForm(appointment);
    } else if (button.dataset.action === "complete") {
      await updateAppointmentStatus(appointment, "Completed");
    } else if (button.dataset.action === "cancel") {
      await updateAppointmentStatus(appointment, "Cancelled");
    } else if (button.dataset.action === "delete") {
      await deleteAppointment(appointment);
    }
  });
}

/* ==========================================================================
   DELETE / STATUS ACTIONS
   ========================================================================== */

async function deleteDepartment(department) {
  const confirmed = window.confirm(
    `Delete the "${department.department_name}" department?\n\n` +
      "A department that still has doctors cannot be deleted."
  );

  if (!confirmed) return;

  try {
    await api(`/departments/${department.department_id}`, {
      method: "DELETE"
    });
    showToast("Department deleted successfully.", "success");
    await loadDepartments();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function deleteDoctor(doctor) {
  const name = fullName(doctor.first_name, doctor.last_name);
  const confirmed = window.confirm(
    `Delete Dr. ${name}?\n\n` +
      "This will also delete their appointments and medical records. " +
      "This action cannot be undone."
  );

  if (!confirmed) return;

  try {
    await api(`/doctors/${doctor.doctor_id}`, { method: "DELETE" });
    showToast("Doctor deleted successfully.", "success");
    await loadDoctors();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function deletePatient(patient) {
  const name = fullName(patient.first_name, patient.last_name);
  const confirmed = window.confirm(
    `Delete ${name}?\n\n` +
      "This will also delete all of this patient's appointments and medical " +
      "records. This action cannot be undone."
  );

  if (!confirmed) return;

  try {
    await api(`/patients/${patient.patient_id}`, { method: "DELETE" });
    showToast("Patient deleted successfully.", "success");
    await loadPatients();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function updateAppointmentStatus(appointment, status) {
  const actionLabel =
    status === "Completed" ? "mark as completed" : "cancel";
  const confirmed = window.confirm(
    `Are you sure you want to ${actionLabel} this appointment?\n\n` +
      `Patient: ${fullName(
        appointment.patient_first_name,
        appointment.patient_last_name
      )}\n` +
      `Date: ${formatDate(appointment.appointment_date)} at ${formatTime(
        appointment.appointment_time
      )}`
  );

  if (!confirmed) return;

  try {
    await api(`/appointments/${appointment.appointment_id}/status`, {
      method: "PATCH",
      body: { status }
    });
    showToast(
      status === "Completed"
        ? "Appointment marked as completed."
        : "Appointment cancelled.",
      "success"
    );
    await loadAppointments();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function deleteAppointment(appointment) {
  const confirmed = window.confirm(
    "Delete this appointment permanently?\n\n" +
      "Any linked medical record will be kept, but it will no longer be " +
      "linked to an appointment."
  );

  if (!confirmed) return;

  try {
    await api(`/appointments/${appointment.appointment_id}`, {
      method: "DELETE"
    });
    showToast("Appointment deleted successfully.", "success");
    await loadAppointments();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/* ==========================================================================
   MODAL
   ========================================================================== */

function bindModal() {
  elements.modalClose.addEventListener("click", closeModal);

  elements.modalOverlay.addEventListener("click", (event) => {
    if (event.target === elements.modalOverlay) {
      closeModal();
    }
  });

  elements.modalBody.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-modal]")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      !elements.modalOverlay.classList.contains("hidden")
    ) {
      closeModal();
    }
  });
}

function openModal(title, bodyHtml) {
  lastFocusedElement = document.activeElement;

  elements.modalTitle.textContent = title;
  elements.modalBody.innerHTML = bodyHtml;
  elements.modalOverlay.classList.remove("hidden");
  document.body.classList.add("modal-open");

  window.setTimeout(() => {
    const firstField = elements.modalBody.querySelector(
      "input, select, textarea"
    );
    if (firstField) {
      firstField.focus();
    }
  }, 40);
}

function closeModal() {
  if (elements.modalOverlay.classList.contains("hidden")) {
    return;
  }

  elements.modalOverlay.classList.add("hidden");
  elements.modalBody.innerHTML = "";
  document.body.classList.remove("modal-open");

  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

function wireForm({ form, submitLabel, save, successMessage }) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const errorBox = form.querySelector(".form-error");
    errorBox.textContent = "";
    errorBox.classList.add("hidden");

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Saving...";

    try {
      await save();
      closeModal();
      showToast(successMessage, "success");
      await refreshCurrentView();
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.classList.remove("hidden");
      errorBox.scrollIntoView({ block: "nearest", behavior: "smooth" });
      submitButton.disabled = false;
      submitButton.textContent = submitLabel;
    }
  });
}

/* ==========================================================================
   FORM FIELD BUILDERS
   ========================================================================== */

function textField(label, name, value = "", options = {}) {
  const {
    type = "text",
    required = false,
    placeholder = "",
    maxlength,
    min,
    max,
    step,
    hint = "",
    autocomplete = "off"
  } = options;

  const attributes = [
    `type="${type}"`,
    `name="${name}"`,
    `id="field-${name}"`,
    `value="${escapeHtml(value ?? "")}"`,
    `autocomplete="${autocomplete}"`
  ];

  if (required) attributes.push("required");
  if (placeholder) attributes.push(`placeholder="${escapeHtml(placeholder)}"`);
  if (maxlength) attributes.push(`maxlength="${maxlength}"`);
  if (min !== undefined) attributes.push(`min="${escapeHtml(min)}"`);
  if (max !== undefined) attributes.push(`max="${escapeHtml(max)}"`);
  if (step !== undefined) attributes.push(`step="${escapeHtml(step)}"`);

  return `
    <label class="form-field" for="field-${name}">
      <span>${label}${required ? " <em>*</em>" : ""}</span>
      <input ${attributes.join(" ")}>
      ${hint ? `<small>${hint}</small>` : ""}
    </label>
  `;
}

function selectField(label, name, choices, selectedValue, options = {}) {
  const {
    required = true,
    placeholder = "Select an option",
    hint = "",
    full = false
  } = options;

  const optionHtml = choices
    .map((choice) => {
      const value = String(choice.value);
      const isSelected = String(selectedValue ?? "") === value;
      return `<option value="${escapeHtml(value)}" ${
        isSelected ? "selected" : ""
      }>${escapeHtml(choice.label)}</option>`;
    })
    .join("");

  return `
    <label class="form-field ${full ? "full" : ""}" for="field-${name}">
      <span>${label}${required ? " <em>*</em>" : ""}</span>
      <select name="${name}" id="field-${name}" ${required ? "required" : ""}>
        <option value="">${escapeHtml(placeholder)}</option>
        ${optionHtml}
      </select>
      ${hint ? `<small>${hint}</small>` : ""}
    </label>
  `;
}

function textareaField(label, name, value = "", options = {}) {
  const {
    required = false,
    rows = 3,
    placeholder = "",
    hint = "",
    full = true
  } = options;

  return `
    <label class="form-field ${full ? "full" : ""}" for="field-${name}">
      <span>${label}${required ? " <em>*</em>" : ""}</span>
      <textarea name="${name}" id="field-${name}" rows="${rows}" ${
        required ? "required" : ""
      } placeholder="${escapeHtml(placeholder)}">${escapeHtml(
        value ?? ""
      )}</textarea>
      ${hint ? `<small>${hint}</small>` : ""}
    </label>
  `;
}

function formActions(submitLabel) {
  return `
    <div class="form-actions">
      <button type="button" class="btn btn-ghost" data-close-modal>Cancel</button>
      <button type="submit" class="btn btn-primary">${escapeHtml(
        submitLabel
      )}</button>
    </div>
  `;
}

function getFormData(form) {
  const data = {};

  new FormData(form).forEach((value, key) => {
    data[key] = typeof value === "string" ? value.trim() : value;
  });

  return data;
}

/* ==========================================================================
   RENDERING HELPERS
   ========================================================================== */

function actionButton(action, id, label, extraClass = "") {
  return `<button type="button" class="btn-link ${extraClass}" data-action="${action}" data-id="${id}">${label}</button>`;
}

function statusBadge(status) {
  const className =
    status === "Completed"
      ? "completed"
      : status === "Cancelled"
        ? "cancelled"
        : "scheduled";

  return `<span class="badge badge-${className}">${escapeHtml(status)}</span>`;
}

function emptyRow(colspan, title, message) {
  return `
    <tr>
      <td colspan="${colspan}">
        <div class="empty-state">
          <strong>${escapeHtml(title)}</strong>
          ${escapeHtml(message)}
        </div>
      </td>
    </tr>
  `;
}

function errorRow(colspan, message) {
  return `
    <tr>
      <td colspan="${colspan}">
        <div class="empty-state">
          <strong>Could not load data</strong>
          ${escapeHtml(message)}
        </div>
      </td>
    </tr>
  `;
}

function recordLabel(count) {
  return `${count} ${count === 1 ? "record" : "records"}`;
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 4500);
}

function escapeHtml(value) {
  const replacements = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    return replacements[character];
  });
}

/* ==========================================================================
   DATE + TEXT HELPERS
   ========================================================================== */

function fullName(firstName, lastName) {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim();
}

function formatDate(value) {
  if (!value) return "—";

  const datePart = String(value).split(/[ T]/)[0];
  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) {
    return String(value);
  }

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatTime(value) {
  if (!value) return "—";

  const [hourText, minuteText] = String(value).split(":");
  const hour = Number(hourText);
  const minute = minuteText || "00";
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}

function formatDateTime(value) {
  if (!value) return "—";

  const [datePart, timePart] = String(value).split(/[ T]/);
  return `${formatDate(datePart)}${
    timePart ? `, ${formatTime(timePart)}` : ""
  }`;
}

function recordDateParts(value) {
  const datePart = String(value || "").split(/[ T]/)[0];
  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) {
    return { day: "—", month: "" };
  }

  return {
    day: String(day).padStart(2, "0"),
    month: new Date(year, month - 1, day).toLocaleDateString("en-IN", {
      month: "short"
    })
  };
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return "—";

  const [year, month, day] = String(dateOfBirth).split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;

  const birthdayThisYear = new Date(
    today.getFullYear(),
    month - 1,
    day
  );

  if (today < birthdayThisYear) {
    age -= 1;
  }

  return age;
}

function formatCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2
  }).format(amount);
}

function todayInputValue() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function renderCurrentDate() {
  elements.currentDate.textContent = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date());
}
