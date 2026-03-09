/**
 * Barista Customer Review Form — script.js
 * Handles: star ratings, time slots,
 *          character counter, validation, and submission.
 */

'use strict';

/* ─── DOM References ─────────────────────────── */
const reviewForm = document.getElementById('reviewForm');
const reviewCard = document.getElementById('reviewCard');
const successCard = document.getElementById('successCard');
const resetBtn = document.getElementById('resetBtn');
const submitBtn = document.getElementById('submitBtn');
const submitLoader = document.getElementById('submitLoader');
const submitText = submitBtn.querySelector('.btn-submit__text');
const submitIcon = submitBtn.querySelector('.btn-submit__icon');
const charCount = document.getElementById('charCount');
const reviewText = document.getElementById('reviewText');
const ratingLabel = document.getElementById('ratingLabel');
const ratingValue = document.getElementById('ratingValue');
const starButtons = document.querySelectorAll('.rating__star');
const timeSlotBtns = document.querySelectorAll('.form__time-slot');
const visitTimeInput = document.getElementById('visitTime');

/* ─── Rating Descriptors ─────────────────────── */
const ratingDescriptors = {
    1: '😞 Very Poor — not what we expected',
    2: '😕 Below Average — room for improvement',
    3: '😐 Average — decent but could be better',
    4: '😊 Good — we enjoyed the experience',
    5: '🤩 Excellent — absolutely loved it!',
};

/* ─── Main Star Rating ───────────────────────── */
let currentRating = 0;

starButtons.forEach((btn, idx) => {
    btn.addEventListener('mouseenter', () => {
        highlightStars(idx + 1, true);
        ratingLabel.textContent = ratingDescriptors[idx + 1];
    });

    btn.addEventListener('mouseleave', () => {
        highlightStars(currentRating, false);
        ratingLabel.textContent = currentRating
            ? ratingDescriptors[currentRating]
            : 'Tap a star to rate';
    });

    btn.addEventListener('click', () => {
        currentRating = idx + 1;
        ratingValue.value = currentRating;
        highlightStars(currentRating, false);
        ratingLabel.textContent = ratingDescriptors[currentRating];
        const group = document.getElementById('group-rating');
        group.classList.remove('is-invalid');
        btn.style.animation = 'none';
        void btn.offsetWidth;
        btn.style.animation = '';
    });
});

function highlightStars(count, isHover) {
    starButtons.forEach((star, i) => {
        star.classList.remove('is-selected', 'is-hovered');
        if (i < count) {
            star.classList.add(isHover ? 'is-hovered' : 'is-selected');
        }
    });
}

/* ─── Quick Time Slots ───────────────────────── */
timeSlotBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        timeSlotBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        visitTimeInput.value = btn.dataset.time;
        const group = document.getElementById('group-time');
        if (visitTimeInput.value) group.classList.remove('is-invalid');
    });
});

visitTimeInput.addEventListener('change', () => {
    timeSlotBtns.forEach(b => {
        b.classList.toggle('is-active', b.dataset.time === visitTimeInput.value);
    });
});

/* ─── Character Counter ──────────────────────── */
reviewText.addEventListener('input', () => {
    const len = reviewText.value.length;
    charCount.textContent = len;
    charCount.style.color = len > 900 ? '#f07070' : '';
    const group = document.getElementById('group-review');
    if (len >= 10) group.classList.remove('is-invalid');
});

/* ─── Set default date to today ──────────────── */
(function setDefaultDate() {
    const dateInput = document.getElementById('visitDate');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.max = today;
})();

/* ─── Validation ─────────────────────────────── */
function validateField(id, condition) {
    const group = document.getElementById(id);
    if (!group) return condition;
    group.classList.toggle('is-invalid', !condition);
    group.classList.toggle('is-valid', condition);
    return condition;
}

function validateForm() {
    const location = document.getElementById('location').value;
    const date = document.getElementById('visitDate').value;
    const time = visitTimeInput.value;
    const review = reviewText.value.trim();

    let valid = true;
    valid &= validateField('group-location', !!location);
    valid &= validateField('group-date', !!date);
    valid &= validateField('group-time', !!time);
    valid &= validateField('group-rating', currentRating > 0);
    valid &= validateField('group-review', review.length >= 10);

    return !!valid;
}

/* ─── Live validation on blur ────────────────── */
['location', 'visitDate', 'visitTime'].forEach(fieldId => {
    const el = document.getElementById(fieldId);
    if (el) {
        el.addEventListener('change', () => {
            const groupMap = {
                location: 'group-location',
                visitDate: 'group-date',
                visitTime: 'group-time',
            };
            validateField(groupMap[fieldId], !!el.value);
        });
    }
});

/* ─── Form Submission ────────────────────────── */
reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) {
        const firstInvalid = reviewForm.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    // ✅ Build payload matching Go backend JSON keys
    const payload = {
        location:   document.getElementById('location').value,
        customerName: document.getElementById('customerName').value.trim() || 'Anonymous',
        userEmail:  '',
        rating:     currentRating,
        reviewText: reviewText.value.trim(),
        sentiment:  '',
        sentiment_confidence: 0,
    };

    console.log('Sending payload:', payload);

    setLoadingState(true);

    try {
        const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

        if (!res.ok) {
            // Show exact error from backend
            const errText = await res.text();
            console.error('Backend error:', errText);
            throw new Error(errText);
        }

        const data = await res.json();
        console.log('Review saved:', data);
        showSuccess();

    } catch (err) {
        console.error('Submission error:', err);
        setLoadingState(false);
        showSubmitError(err.message);
    }
});

function setLoadingState(isLoading) {
    submitBtn.disabled = isLoading;
    submitText.hidden = isLoading;
    submitIcon.hidden = isLoading;
    submitLoader.hidden = !isLoading;
}

function showSubmitError(message) {
    const existing = document.getElementById('submitError');
    if (existing) existing.remove();
    const msg = document.createElement('p');
    msg.id = 'submitError';
    msg.style.cssText = 'color:#f07070;text-align:center;font-size:.88rem;margin-top:8px;';
    msg.textContent = '⚠️ ' + (message || 'Submission failed. Please try again.');
    submitBtn.insertAdjacentElement('afterend', msg);
    setTimeout(() => msg.remove(), 5000);
}

/* ─── Show Success Card ──────────────────────── */
function showSuccess() {
    reviewCard.hidden = true;
    successCard.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ─── Reset Flow ─────────────────────────────── */
resetBtn.addEventListener('click', () => {
    reviewForm.reset();
    currentRating = 0;
    ratingValue.value = '';
    ratingLabel.textContent = 'Tap a star to rate';
    charCount.textContent = '0';

    starButtons.forEach(s => s.classList.remove('is-selected', 'is-hovered'));
    timeSlotBtns.forEach(b => b.classList.remove('is-active'));

    document.querySelectorAll('.is-invalid, .is-valid').forEach(el => {
        el.classList.remove('is-invalid', 'is-valid');
    });

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('visitDate').value = today;

    successCard.hidden = true;
    reviewCard.hidden = false;
    setLoadingState(false);
});