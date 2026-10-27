// Holiday Hangout Planner - Client Application
// Polished Light Theme & Clean User Experience

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    countries: [],
    selectedCountry: { code: 'IN', name: 'India' },
    selectedYear: '2026',
    holidays: [],
    selectedHoliday: null,
    currentActivity: null,
    currentPlan: null
  };

  // DOM Elements
  const navLogo = document.getElementById('navLogo');
  const plannerView = document.getElementById('plannerView');
  const sharedInviteView = document.getElementById('sharedInviteView');
  const heroSection = document.getElementById('heroSection');

  const countrySelect = document.getElementById('countrySelect');
  const yearSelect = document.getElementById('yearSelect');
  const fetchHolidaysBtn = document.getElementById('fetchHolidaysBtn');
  const holidaysStateBox = document.getElementById('holidaysStateBox');
  const holidaysStateText = document.getElementById('holidaysStateText');
  const holidayGridContainer = document.getElementById('holidayGridContainer');
  const holidayGrid = document.getElementById('holidayGrid');
  const holidayCountLabel = document.getElementById('holidayCountLabel');
  const planDayBtn = document.getElementById('planDayBtn');

  const activityCardSection = document.getElementById('activityCardSection');
  const bannerHolidayName = document.getElementById('bannerHolidayName');
  const bannerHolidayDate = document.getElementById('bannerHolidayDate');
  const activityText = document.getElementById('activityText');
  const badgeType = document.getElementById('badgeType');
  const badgeParticipants = document.getElementById('badgeParticipants');
  const badgePrice = document.getElementById('badgePrice');
  const badgeAccessibility = document.getElementById('badgeAccessibility');
  const metaType = document.getElementById('metaType');
  const metaParticipants = document.getElementById('metaParticipants');
  const metaPrice = document.getElementById('metaPrice');
  const metaAccessibility = document.getElementById('metaAccessibility');
  const activityTypeFilter = document.getElementById('activityTypeFilter');
  const participantFilter = document.getElementById('participantFilter');
  const rerollActivityBtn = document.getElementById('rerollActivityBtn');
  const planNotesInput = document.getElementById('planNotesInput');
  const saveAndShareBtn = document.getElementById('saveAndShareBtn');

  const shareCardSection = document.getElementById('shareCardSection');
  const qrCodeImage = document.getElementById('qrCodeImage');
  const sharePlanHeading = document.getElementById('sharePlanHeading');
  const sharePlanSubtext = document.getElementById('sharePlanSubtext');
  const shareUrlInput = document.getElementById('shareUrlInput');
  const copyShareUrlBtn = document.getElementById('copyShareUrlBtn');
  const downloadQrBtn = document.getElementById('downloadQrBtn');
  const previewPlanLink = document.getElementById('previewPlanLink');
  const planAnotherBtn = document.getElementById('planAnotherBtn');
  const recentPlansContainer = document.getElementById('recentPlansContainer');

  const stepIndicator1 = document.getElementById('stepIndicator1');
  const stepIndicator2 = document.getElementById('stepIndicator2');
  const stepIndicator3 = document.getElementById('stepIndicator3');

  // Shared View Elements
  const sharedCountryBadge = document.getElementById('sharedCountryBadge');
  const sharedHolidayTitle = document.getElementById('sharedHolidayTitle');
  const sharedHolidayDate = document.getElementById('sharedHolidayDate');
  const sharedActivityTitle = document.getElementById('sharedActivityTitle');
  const sharedTypeBadge = document.getElementById('sharedTypeBadge');
  const sharedParticipantsBadge = document.getElementById('sharedParticipantsBadge');
  const sharedNotesBox = document.getElementById('sharedNotesBox');
  const rsvpBtn = document.getElementById('rsvpBtn');
  const rsvpSuccessMsg = document.getElementById('rsvpSuccessMsg');

  // Database Modal Elements
  const dbStatusBtn = document.getElementById('dbStatusBtn');
  const dbStatusDot = document.getElementById('dbStatusDot');
  const dbStatusText = document.getElementById('dbStatusText');
  const dbModal = document.getElementById('dbModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalDbProvider = document.getElementById('modalDbProvider');
  const modalDbConnected = document.getElementById('modalDbConnected');
  const modalDbDot = document.getElementById('modalDbDot');

  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  const toastIcon = document.getElementById('toastIcon');

  // Helper: Toast Notifications
  function showToast(message, icon = '📋') {
    toastMsg.textContent = message;
    toastIcon.textContent = icon;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // Format Date (e.g. 2026-08-15 -> Saturday, August 15, 2026)
  function formatDate(dateStr) {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString(undefined, {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  }

  // Check Database Connection & Update Badge
  async function checkDbStatus() {
    try {
      const res = await fetch('/api/db/status');
      if (res.ok) {
        const data = await res.json();
        modalDbProvider.textContent = data.provider;
        modalDbConnected.textContent = data.isConnected ? 'Connected (Active)' : 'Ready (Storage Active)';

        if (data.isConnected) {
          dbStatusDot.className = 'status-dot';
          modalDbDot.className = 'status-dot';
          dbStatusText.textContent = 'Database Active';
        } else {
          dbStatusDot.className = 'status-dot amber';
          modalDbDot.className = 'status-dot amber';
          dbStatusText.textContent = data.isConfigured ? 'Connecting...' : 'Storage Ready';
        }
      }
    } catch (e) {
      console.warn('Database status check error:', e);
    }
  }

  // Load Countries
  async function loadCountries() {
    try {
      const res = await fetch('/api/countries');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        state.countries = json.data;

        // Featured popular countries for fast selection
        const pinnedCodes = ['IN', 'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'SG', 'BR'];
        const pinned = [];
        const others = [];

        state.countries.forEach(c => {
          if (pinnedCodes.includes(c.countryCode)) {
            pinned.push(c);
          } else {
            others.push(c);
          }
        });

        pinned.sort((a, b) => pinnedCodes.indexOf(a.countryCode) - pinnedCodes.indexOf(b.countryCode));
        others.sort((a, b) => a.name.localeCompare(b.name));

        countrySelect.innerHTML = '';

        const pinnedGroup = document.createElement('optgroup');
        pinnedGroup.label = '⭐ Featured Countries';
        pinned.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.countryCode;
          opt.textContent = `${c.name} (${c.countryCode})`;
          if (c.countryCode === 'IN') opt.selected = true;
          pinnedGroup.appendChild(opt);
        });
        countrySelect.appendChild(pinnedGroup);

        const otherGroup = document.createElement('optgroup');
        otherGroup.label = 'All Available Countries';
        others.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.countryCode;
          opt.textContent = `${c.name} (${c.countryCode})`;
          otherGroup.appendChild(opt);
        });
        countrySelect.appendChild(otherGroup);

        state.selectedCountry = {
          code: countrySelect.value,
          name: countrySelect.options[countrySelect.selectedIndex].text.split(' (')[0]
        };

        // Automatically fetch holidays for initial country
        fetchHolidays();
      }
    } catch (err) {
      console.error('Failed to load countries:', err);
      countrySelect.innerHTML = '<option value="IN">India (IN)</option><option value="US">United States (US)</option>';
    }
  }

  // Fetch Public Holidays
  async function fetchHolidays() {
    const countryCode = countrySelect.value;
    const year = yearSelect.value;
    const countryName = countrySelect.options[countrySelect.selectedIndex]?.text.split(' (')[0] || countryCode;

    state.selectedCountry = { code: countryCode, name: countryName };
    state.selectedYear = year;
    state.selectedHoliday = null;
    planDayBtn.disabled = true;

    holidayGridContainer.style.display = 'none';
    holidaysStateBox.style.display = 'flex';
    holidaysStateText.textContent = `Finding public holidays for ${countryName} (${year})...`;

    try {
      const res = await fetch(`/api/holidays?country=${encodeURIComponent(countryCode)}&year=${encodeURIComponent(year)}`);
      const json = await res.json();

      holidaysStateBox.style.display = 'none';

      if (!json.success || !json.data || json.data.length === 0) {
        holidaysStateBox.style.display = 'flex';
        holidaysStateBox.innerHTML = `
          <div class="empty-icon">📅</div>
          <p style="color: var(--text-muted); font-size: 0.95rem;">No public holidays found for ${countryName} in ${year}. Try choosing another country or year.</p>
        `;
        return;
      }

      state.holidays = json.data;
      renderHolidays(json.data);
      holidayGridContainer.style.display = 'block';
    } catch (err) {
      console.error('Error fetching holidays:', err);
      holidaysStateBox.style.display = 'flex';
      holidaysStateBox.innerHTML = `
        <div class="empty-icon">⚠️</div>
        <p style="color: var(--accent-rose); font-size: 0.95rem;">Could not retrieve holidays. Please check your network or try again.</p>
      `;
    }
  }

  // Render Holiday Cards in Grid
  function renderHolidays(holidays) {
    holidayGrid.innerHTML = '';
    holidayCountLabel.textContent = `Showing ${holidays.length} public holidays for ${state.selectedCountry.name} (${state.selectedYear})`;

    holidays.forEach(holiday => {
      const card = document.createElement('div');
      card.className = 'holiday-card';

      const typeString = Array.isArray(holiday.types) ? holiday.types.join(', ') : (holiday.types || 'Public');
      const isSelected = state.selectedHoliday && state.selectedHoliday.date === holiday.date && state.selectedHoliday.name === holiday.name;
      if (isSelected) card.classList.add('selected');

      card.innerHTML = `
        <div>
          <div class="holiday-card-top">
            <span class="holiday-date-badge">${holiday.date}</span>
            <span class="holiday-type-tag">${typeString}</span>
          </div>
          <div class="holiday-title">${holiday.name}</div>
          ${holiday.localName && holiday.localName !== holiday.name ? `<div class="holiday-local">${holiday.localName}</div>` : ''}
        </div>
        <div class="holiday-select-radio">
          <span>${formatDate(holiday.date)}</span>
          <span class="select-indicator">${isSelected ? '✓ Selected' : 'Select'}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.holiday-card').forEach(c => {
          c.classList.remove('selected');
          const indicator = c.querySelector('.select-indicator');
          if (indicator) indicator.textContent = 'Select';
        });

        card.classList.add('selected');
        const indicator = card.querySelector('.select-indicator');
        if (indicator) indicator.textContent = '✓ Selected';

        state.selectedHoliday = holiday;
        planDayBtn.disabled = false;
        planDayBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });

      holidayGrid.appendChild(card);
    });
  }

  // Fetch Activity Suggestion
  async function fetchActivity(showSpinner = true) {
    if (showSpinner) {
      activityText.innerHTML = '<span style="color: var(--text-dim); font-size: 1.15rem; font-weight: 600;">✨ Discovering a fun hangout activity...</span>';
      rerollActivityBtn.disabled = true;
    }

    const type = activityTypeFilter.value;
    const participants = participantFilter.value;

    let url = `/api/activity?type=${encodeURIComponent(type)}`;
    if (participants) url += `&participants=${encodeURIComponent(participants)}`;

    try {
      const res = await fetch(url);
      const json = await res.json();

      if (json.success && json.data) {
        state.currentActivity = json.data;
        renderActivity(json.data);
      }
    } catch (err) {
      console.warn('Error fetching activity:', err);
      state.currentActivity = {
        activity: 'Host a festive dinner party and play board games',
        type: 'social',
        participants: 4,
        price: 0.1,
        accessibility: 'Few to no challenges'
      };
      renderActivity(state.currentActivity);
    } finally {
      rerollActivityBtn.disabled = false;
    }
  }

  // Render Activity Card
  function renderActivity(data) {
    activityText.textContent = data.activity;

    // Badges
    badgeType.textContent = `🏷️ ${data.type || 'Social'}`;
    badgeParticipants.textContent = `👥 ${data.participants || 1} Person${(data.participants || 1) > 1 ? 's' : ''}`;

    let priceLabel = 'Free';
    if (data.price > 0 && data.price <= 0.2) priceLabel = '$ Budget-Friendly';
    else if (data.price > 0.2) priceLabel = '$$ Paid';
    badgePrice.textContent = `💰 ${priceLabel}`;

    badgeAccessibility.textContent = `♿ ${data.accessibility || 'Accessible'}`;

    // Meta grid
    metaType.textContent = data.type ? data.type.toUpperCase() : 'SOCIAL';
    metaParticipants.textContent = `${data.participants || 1} Person${(data.participants || 1) > 1 ? 's' : ''}`;
    metaPrice.textContent = priceLabel;
    metaAccessibility.textContent = data.accessibility || 'Standard';
  }

  // Save Plan & Generate QR Code
  async function saveAndSharePlan() {
    if (!state.selectedHoliday || !state.currentActivity) {
      alert('Please select a holiday and activity first.');
      return;
    }

    saveAndShareBtn.disabled = true;
    saveAndShareBtn.innerHTML = '<span>⏳ Saving plan & generating QR...</span>';

    const payload = {
      countryCode: state.selectedCountry.code,
      countryName: state.selectedCountry.name,
      holidayName: state.selectedHoliday.name,
      holidayDate: state.selectedHoliday.date,
      activity: state.currentActivity.activity,
      activityType: state.currentActivity.type,
      participants: state.currentActivity.participants,
      price: state.currentActivity.price,
      accessibility: state.currentActivity.accessibility,
      notes: planNotesInput.value.trim()
    };

    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        state.currentPlan = json;

        // Render QR & Share View
        renderShareView(json.shareUrl, json.qrUrl, payload);

        // Update indicators
        stepIndicator2.classList.remove('active');
        stepIndicator2.classList.add('done');
        stepIndicator3.classList.add('active');

        shareCardSection.style.display = 'block';
        shareCardSection.scrollIntoView({ behavior: 'smooth' });

        showToast('Hangout plan saved and QR code generated!', '🎉');
        loadRecentPlans();
      } else {
        throw new Error(json.error || 'Server rejected plan');
      }
    } catch (err) {
      console.warn('Direct POST /api/plans failed, generating offline share URL:', err);

      // Robust URL parameter fallback so sharing ALWAYS works!
      const params = new URLSearchParams({
        c: payload.countryName,
        h: payload.holidayName,
        d: payload.holidayDate,
        a: payload.activity,
        t: payload.activityType,
        p: payload.participants,
        n: payload.notes
      });
      const fallbackShareUrl = `${window.location.origin}/?${params.toString()}`;
      const fallbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(fallbackShareUrl)}`;

      renderShareView(fallbackShareUrl, fallbackQrUrl, payload);
      shareCardSection.style.display = 'block';
      shareCardSection.scrollIntoView({ behavior: 'smooth' });
    } finally {
      saveAndShareBtn.disabled = false;
      saveAndShareBtn.innerHTML = '<span>✨ Generate QR Code & Share Plan</span><span>➔</span>';
    }
  }

  // Render QR & Share Section
  function renderShareView(shareUrl, qrUrl, planData) {
    qrCodeImage.src = qrUrl;
    shareUrlInput.value = shareUrl;
    sharePlanHeading.textContent = `${planData.holidayName} Hangout`;
    sharePlanSubtext.textContent = `${formatDate(planData.holidayDate)} · ${planData.countryName}`;
    previewPlanLink.href = shareUrl;
  }

  // Load Recent Hangouts
  async function loadRecentPlans() {
    try {
      const res = await fetch('/api/plans');
      const json = await res.json();

      if (json.success && Array.isArray(json.plans) && json.plans.length > 0) {
        recentPlansContainer.innerHTML = '';
        json.plans.forEach(plan => {
          const item = document.createElement('div');
          item.className = 'recent-plan-item';
          item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem;">
              <span class="holiday-date-badge">${plan.holidayDate}</span>
              <span class="holiday-type-tag">${plan.countryName || plan.countryCode}</span>
            </div>
            <div style="font-weight: 700; font-size: 1rem; margin-bottom: 0.25rem; color: var(--text-main);">${plan.holidayName}</div>
            <div style="font-size: 0.86rem; color: var(--text-muted); margin-bottom: 0.75rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4;">
              ${plan.activity}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.65rem; font-size: 0.78rem;">
              <span style="color: var(--primary); font-weight: 600;">👥 ${plan.participants} people</span>
              <a href="/?planId=${plan.id}" class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.65rem; font-size: 0.76rem;">View Plan ➔</a>
            </div>
          `;
          recentPlansContainer.appendChild(item);
        });
      }
    } catch (e) {
      console.warn('Failed to load recent plans:', e);
    }
  }

  // Handle Shared View Deep Link (Scan Mode)
  async function handleDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const planId = params.get('planId');

    // Case 1: Database Plan ID
    if (planId) {
      try {
        const res = await fetch(`/api/plans/${encodeURIComponent(planId)}`);
        const json = await res.json();
        if (json.success && json.plan) {
          renderSharedInvite(json.plan);
          return true;
        }
      } catch (e) {
        console.warn('Could not fetch plan by id:', e);
      }
    }

    // Case 2: URL Parameters Fallback
    const holiday = params.get('h');
    const date = params.get('d');
    const activity = params.get('a');
    const country = params.get('c');
    const type = params.get('t');
    const participants = params.get('p');
    const notes = params.get('n');

    if (holiday && date && activity) {
      renderSharedInvite({
        holidayName: holiday,
        holidayDate: date,
        activity,
        countryName: country || 'Destination',
        activityType: type || 'social',
        participants: participants || 2,
        notes: notes || ''
      });
      return true;
    }

    return false;
  }

  // Render the Dedicated Shared Invitation Page
  function renderSharedInvite(plan) {
    plannerView.style.display = 'none';
    heroSection.style.display = 'none';
    sharedInviteView.style.display = 'block';

    sharedCountryBadge.textContent = `📍 ${plan.countryName || plan.countryCode || 'Hangout'}`;
    sharedHolidayTitle.textContent = plan.holidayName;
    sharedHolidayDate.textContent = `🗓️ ${formatDate(plan.holidayDate)}`;
    sharedActivityTitle.textContent = plan.activity;

    sharedTypeBadge.textContent = `🏷️ ${plan.activityType || 'Social'}`;
    sharedParticipantsBadge.textContent = `👥 ${plan.participants || 1} Person${(plan.participants || 1) > 1 ? 's' : ''}`;

    if (plan.notes) {
      sharedNotesBox.textContent = `“${plan.notes}”`;
      sharedNotesBox.style.display = 'block';
    } else {
      sharedNotesBox.style.display = 'none';
    }
  }

  // Event Listeners
  countrySelect.addEventListener('change', () => {
    state.selectedCountry = {
      code: countrySelect.value,
      name: countrySelect.options[countrySelect.selectedIndex].text.split(' (')[0]
    };
  });

  fetchHolidaysBtn.addEventListener('click', fetchHolidays);

  planDayBtn.addEventListener('click', () => {
    if (!state.selectedHoliday) return;

    bannerHolidayName.textContent = state.selectedHoliday.name;
    bannerHolidayDate.textContent = formatDate(state.selectedHoliday.date);

    stepIndicator1.classList.remove('active');
    stepIndicator1.classList.add('done');
    stepIndicator2.classList.add('active');

    activityCardSection.style.display = 'block';
    activityCardSection.scrollIntoView({ behavior: 'smooth' });

    fetchActivity();
  });

  rerollActivityBtn.addEventListener('click', () => {
    fetchActivity(true);
  });

  activityTypeFilter.addEventListener('change', () => {
    fetchActivity(true);
  });

  participantFilter.addEventListener('change', () => {
    fetchActivity(true);
  });

  saveAndShareBtn.addEventListener('click', saveAndSharePlan);

  copyShareUrlBtn.addEventListener('click', () => {
    if (!shareUrlInput.value) return;
    navigator.clipboard.writeText(shareUrlInput.value)
      .then(() => showToast('Plan link copied to clipboard!', '📋'))
      .catch(() => {
        shareUrlInput.select();
        document.execCommand('copy');
        showToast('Plan link copied!', '📋');
      });
  });

  downloadQrBtn.addEventListener('click', async () => {
    if (!qrCodeImage.src) return;
    try {
      const response = await fetch(qrCodeImage.src);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `hangout-qr-${state.selectedHoliday ? state.selectedHoliday.date : 'plan'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      showToast('QR code downloaded!', '📥');
    } catch (e) {
      window.open(qrCodeImage.src, '_blank');
    }
  });

  planAnotherBtn.addEventListener('click', () => {
    window.location.href = '/';
  });

  rsvpBtn.addEventListener('click', () => {
    rsvpBtn.disabled = true;
    rsvpBtn.innerHTML = '<span>Joined! 🎉</span>';
    rsvpSuccessMsg.style.display = 'block';
    showToast("You're officially on the hangout squad list!", '🎊');
  });

  // Modal Listeners
  dbStatusBtn.addEventListener('click', () => {
    dbModal.classList.add('open');
  });

  closeModalBtn.addEventListener('click', () => {
    dbModal.classList.remove('open');
  });

  dbModal.addEventListener('click', (e) => {
    if (e.target === dbModal) {
      dbModal.classList.remove('open');
    }
  });

  // Initialization
  async function init() {
    checkDbStatus();
    loadRecentPlans();

    const isShared = await handleDeepLink();
    if (!isShared) {
      loadCountries();
    }
  }

  init();
});
