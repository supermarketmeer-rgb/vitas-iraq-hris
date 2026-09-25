/**
 * HR Drivers Module - Main JavaScript
 * Handles client-side enhancements
 */

// Auto-dismiss alerts after 4 seconds
document.addEventListener('DOMContentLoaded', function () {
    // Auto-dismiss Bootstrap alerts
    const alerts = document.querySelectorAll('.alert.alert-dismissible');
    alerts.forEach(function (alert) {
        setTimeout(function () {
            const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
            if (bsAlert) bsAlert.close();
        }, 4000);
    });

    // Confirm dialogs for delete buttons
    document.querySelectorAll('[data-confirm]').forEach(function (el) {
        el.addEventListener('click', function (e) {
            const msg = el.dataset.confirm || 'هل أنت متأكد من هذه العملية؟';
            if (!confirm(msg)) {
                e.preventDefault();
            }
        });
    });
});
