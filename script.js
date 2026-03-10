/**
 * AI Emergency Triage Assistant - Main Script
 * Handles form submission, AI triage analysis, localStorage, and dashboard rendering.
 */

const STORAGE_KEY = 'triage_patients';

// ========== TRIAGE PAGE ==========

/**
 * Initialize triage form - only runs on triage.html
 */
function initTriageForm() {
    const form = document.querySelector('.triage-form');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const patient = getFormData();
        const priority = await analyzeTriage(patient);

        patient.priority = priority;
        patient.id = Date.now().toString();

        savePatient(patient);
        window.location.href = 'dashboard.html';
    });
}

/**
 * Read all form field values from the triage form
 */
function getFormData() {
    return {
        name: document.getElementById('patient-name').value.trim(),
        age: document.getElementById('patient-age').value,
        gender: document.getElementById('patient-gender').value,
        symptoms: document.getElementById('symptoms').value.trim(),
        heartRate: document.getElementById('heart-rate').value,
        bloodPressure: document.getElementById('blood-pressure').value.trim(),
        temperature: document.getElementById('temperature').value,
        weight: document.getElementById('weight').value,
        history: document.getElementById('history').value.trim()
    };
}

/**
 * AI triage analysis (backend-powered).
 * Sends patient data to triage-ai.php and returns:
 * 'critical' | 'high' | 'medium' | 'low'
 */
async function analyzeTriage(patient) {
    try {
        const res = await fetch('triage-ai.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patient)
        });

        if (!res.ok) {
            throw new Error(`AI endpoint failed: ${res.status}`);
        }

        const data = await res.json();
        const priority = (data && data.priority ? String(data.priority) : '').trim().toLowerCase();

        if (['critical', 'high', 'medium', 'low'].includes(priority)) {
            return priority;
        }
    } catch (err) {
        console.error('AI triage error:', err);
    }

    // Safe fallback if AI endpoint is unavailable or returns unexpected output
    return 'medium';
}

/**
 * Save a patient to localStorage (append to existing list)
 */
function savePatient(patient) {
    const patients = getPatients();
    patients.push(patient);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
}

/**
 * Load all patients from localStorage
 */
function getPatients() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

// ========== DASHBOARD PAGE ==========

/**
 * Initialize dashboard - only runs on dashboard.html
 */
function initDashboard() {
    const board = document.querySelector('.triage-board');
    if (!board) return;

    const patients = getPatients();
    renderDashboard(patients);
    updateStats(patients);
}

/**
 * Render patient cards into the correct priority columns
 */
function renderDashboard(patients) {
    const listSelectors = {
        critical: '.priority-critical .patient-cards',
        high: '.priority-high .patient-cards',
        medium: '.priority-medium .patient-cards',
        low: '.priority-low .patient-cards'
    };

    // Clear existing cards in each column
    for (const selector of Object.values(listSelectors)) {
        const container = document.querySelector(selector);
        if (container) container.innerHTML = '';
    }

    // Insert each patient into the correct column
    for (const patient of patients) {
        const card = createPatientCard(patient);
        const selector = listSelectors[patient.priority];
        const container = document.querySelector(selector);
        if (container) container.appendChild(card);
    }
}

/**
 * Create a patient card DOM element
 */
function createPatientCard(patient) {
    const card = document.createElement('div');
    card.className = 'patient-card';

    const nameEl = document.createElement('div');
    nameEl.className = 'patient-name';
    nameEl.textContent = patient.name || 'Unknown';

    const symptomsEl = document.createElement('div');
    symptomsEl.className = 'patient-symptoms';
    symptomsEl.textContent = patient.symptoms || '—';

    const vitalsEl = document.createElement('div');
    vitalsEl.className = 'patient-vitals';
    vitalsEl.textContent = `HR: ${patient.heartRate || '—'} | BP: ${patient.bloodPressure || '—'}`;

    const badge = document.createElement('span');
    badge.className = `priority-badge ${patient.priority}`;
    badge.textContent = patient.priority.charAt(0).toUpperCase() + patient.priority.slice(1);

    card.appendChild(nameEl);
    card.appendChild(symptomsEl);
    card.appendChild(vitalsEl);
    card.appendChild(badge);

    return card;
}

/**
 * Update the stats row (Total Patients, Critical Cases, Average Waiting Time)
 */
function updateStats(patients) {
    const total = patients.length;
    const critical = patients.filter(p => p.priority === 'critical').length;

    const totalEl = document.querySelector('.stats-row .stat-card:nth-child(1) .stat-value');
    const criticalEl = document.querySelector('.stats-row .stat-card:nth-child(2) .stat-value');
    const avgEl = document.querySelector('.stats-row .stat-card:nth-child(3) .stat-value');

    if (totalEl) totalEl.textContent = total.toString();
    if (criticalEl) criticalEl.textContent = critical.toString();
    if (avgEl) avgEl.textContent = total > 0 ? Math.round(5 + total * 0.5) + ' min' : '—';
}

// ========== INIT ==========

document.addEventListener('DOMContentLoaded', function () {
    if (document.querySelector('.triage-form')) {
        initTriageForm();
    }
    if (document.querySelector('.triage-board')) {
        initDashboard();
    }
});
