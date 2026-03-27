document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('branchRegistrationForm');

    // --- NEW: Generate automatic Branch ID ---
    const branchIdInput = document.getElementById('branchId');
    if (branchIdInput) {
        // Generates an ID format like "BG-4892"
        const randomNumbers = Math.floor(1000 + Math.random() * 9000); // 4 digit random number
        branchIdInput.value = `BG-${randomNumbers}`;
    }

    // Fetch branches for autocomplete
    async function loadBranchNames() {
        try {
            const response = await fetch('/api/reviews/branches');
            if (response.ok) {
                const branches = await response.json();
                const datalist = document.getElementById('branchNameOptions');
                if (datalist) {
                    branches.forEach(branch => {
                        const name = branch.branch_name || branch.business_name || String(branch.branch_id);
                        const option = document.createElement('option');
                        option.value = name;
                        datalist.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Failed to fetch branch names for autocomplete', error);
        }
    }
    loadBranchNames();

    if (registrationForm) {
        registrationForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // Validate form
            if (!validateForm()) {
                return;
            }

            // Get form data - ONLY fields that exist in the updated HTML
            const formData = {
                branchName: document.getElementById('branchName').value,
                branchId: document.getElementById('branchId').value, // This will grab the auto-generated ID
                branchPassword: document.getElementById('branch-password').value
            };

            // Show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';

            try {
                const response = await fetch('/api/register-branch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const result = await response.json();
                
                if (response.ok) {
                    alert(`Success! Your branch has been registered.\nYour Branch ID is: ${formData.branchId}\nPlease save this for logging in.`);
                    // Redirect to login page after successful registration
                    window.location.href = 'branch-login.html'; 
                } else {
                    alert("Error: " + result.error);
                }
            } catch (error) {
                console.error("Network Error: ", error);
                alert("Could not connect to the server.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-rocket-takeoff me-2"></i> Submit Registration';
            }
        });
    }

    // Form validation
    function validateForm() {
        const termsAccept = document.getElementById('termsAccept').checked;

        if (!termsAccept) {
            showError('You must accept the Terms & Conditions and Privacy Policy to continue.');
            return false;
        }

        return true;
    }

    // Show error message
    function showError(message) {
        let alertDiv = document.querySelector('.alert-danger');
        if (!alertDiv) {
            alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-danger alert-dismissible fade show mb-4';
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

    // Add visual feedback to form fields
    const formInputs = document.querySelectorAll('.form-control');
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
});