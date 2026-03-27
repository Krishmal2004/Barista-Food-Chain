document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('branchRegistrationForm');

    const branchIdInput = document.getElementById('branchId');
    if (branchIdInput) {
        // Generates an ID format 
        const randomNumbers = Math.floor(1000 + Math.random() * 9000); 
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

    async function downloadQRCode(branchName) {
        try {
            const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? 'http://localhost:3002/review.html' 
                : `${window.location.origin}/review.html`;
                
            const finalUrl = `${baseUrl}?branch=${encodeURIComponent(branchName)}`;
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(finalUrl)}`;

            // Fetch the image as a Blob so we can force a local download
            const response = await fetch(qrApiUrl);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            
            const safeName = branchName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            a.download = `${safeName}_qr_code.png`;
            
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();
        } catch (error) {
            console.error("Failed to download QR code automatically:", error);
        }
    }

    if (registrationForm) {
        registrationForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // Validate form
            if (!validateForm()) {
                return;
            }
            const formData = {
                branchName: document.getElementById('branchName').value.trim(),
                branchId: document.getElementById('branchId').value,
                branchPassword: document.getElementById('branch-password').value
            };

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
                    await downloadQRCode(formData.branchName);

                    alert(`Success! Your branch has been registered.\nYour Branch ID is: ${formData.branchId}\n\nA QR code for your customers has been downloaded automatically!`);
                    
                    setTimeout(() => {
                        window.location.href = 'branch-login.html'; 
                    }, 1500);

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

    function validateForm() {
        const termsAccept = document.getElementById('termsAccept').checked;

        if (!termsAccept) {
            showError('You must accept the Terms & Conditions and Privacy Policy to continue.');
            return false;
        }

        return true;
    }

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