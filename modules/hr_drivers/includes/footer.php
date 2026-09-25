        </main>
    </div>
</div>

<?php if (empty($isEmbedded)): ?>
<footer class="mt-auto py-3 bg-white border-top text-center text-muted small no-print">
    <div class="container-fluid px-4 d-flex justify-content-between align-items-center">
        <span>&copy; <?= date('Y') ?> نظام إدارة السائقين والرحلات - وحدة الموارد البشرية HR</span>
        <span>MySQL 8.x • PHP 8.x PDO • XAMPP Compatible</span>
    </div>
</footer>
<?php endif; ?>

<!-- Bootstrap 5 JS Bundle -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

<!-- Custom JS for AJAX and validation -->
<script src="assets/js/main.js"></script>
</body>
</html>
