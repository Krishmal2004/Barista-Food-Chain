//import { application, json } from "express";

// Branch Registration Form Handler
document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('branchRegistrationForm');

    if (registrationForm) {
        registrationForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            
            const platforms = [];
            ['platformGoogle', 'platformYelp', 'platformFacebook', 'platformTripadvisor', 'platformZomato', 'platformOther']
            .forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox.checked) platforms.push(checkbox.value);
            });
            // Get form data
            const formData = {
                businessName: document.getElementById('businessName').value,
                branchName: document.getElementById('branchName').value,
                branchId: document.getElementById('branchId').value,
                businessType: document.getElementById('businessType').value,
                yearEstablished: document.getElementById('yearEstablished').value,
                fullName: document.getElementById('fullName').value,
                position: document.getElementById('position').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                address: document.getElementById('address').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                zipCode: document.getElementById('zipCode').value,
                country: document.getElementById('country').value,
                platforms: getSelectedPlatforms(),
                additionalInfo: document.getElementById('additionalInfo').value,
                newsletter: document.getElementById('newsletter').checked
            };
            // Validate form
            if (!validateForm()) {
                return;
            }

            // Show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';

            try {
                const response = await fetch('http://localhost:3000/api/register-branch', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(formData)
                });
                const result = await response.json();
                if(response.ok) {
                    alert("Sucess! Your branch has been registered");
                    window.location.href = 'index.html';
                } else {
                    alert("Error: "+result.error);
                } 
            } catch (error) {
                console.error("Network Error: ",error);
                alert("Could not connect to the server.");
            }finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-rocket-takeoff me-2"></i> Submit Registration';
            }
        });
    }

    // Get selected review platforms
    function getSelectedPlatforms() {
        const platforms = [];
        const checkboxes = document.querySelectorAll('input[type="checkbox"][value]');
        checkboxes.forEach(checkbox => {
            if (checkbox.checked && checkbox.id.startsWith('platform')) {
                platforms.push(checkbox.value);
            }
        });
        return platforms;
    }

    // Form validation
    function validateForm() {
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const termsAccept = document.getElementById('termsAccept').checked;

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError('Please enter a valid email address.');
            return false;
        }

        // Terms acceptance
        if (!termsAccept) {
            showError('You must accept the Terms & Conditions to continue.');
            return false;
        }

        return true;
    }

    // Show error message
    function showError(message) {
        // Create alert if it doesn't exist
        let alertDiv = document.querySelector('.alert-danger');
        if (!alertDiv) {
            alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-danger alert-dismissible fade show';
            alertDiv.innerHTML = `
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <span class="error-message"></span>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            registrationForm.insertBefore(alertDiv, registrationForm.firstChild);
        }

        alertDiv.querySelector('.error-message').textContent = message;
        alertDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Show success message
    function showSuccessMessage() {
        // Create success alert
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show';
        alertDiv.innerHTML = `
            <i class="bi bi-check-circle-fill me-2"></i>
            <strong>Success!</strong> Your registration has been submitted. We'll review it and get back to you within 24 hours.
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        const container = document.querySelector('.registration-section .container');
        container.insertBefore(alertDiv, container.firstChild);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    // Add visual feedback to form fields
    const formInputs = document.querySelectorAll('.form-control, .form-select');
    formInputs.forEach(input => {
        input.addEventListener('blur', function () {
            if (this.value.trim() !== '') {
                this.classList.add('is-valid');
                this.classList.remove('is-invalid');
            } else if (this.hasAttribute('required')) {
                this.classList.add('is-invalid');
                this.classList.remove('is-valid');
            }
        });
    });

    console.log("Branch Registration form initialized");
});
