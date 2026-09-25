</main>

<!-- Mobile Bottom Navigation Bar -->
<nav class="mobile-bottom-nav no-print">
    <a href="index.php" class="nav-item-btn <?= ($currentPage === 'index.php') ? 'active' : '' ?>">
        <i class="fa-solid fa-house"></i>
        <span><?= isRtl() ? 'الرئيسية' : 'Home' ?></span>
    </a>

    <a href="timesheet.php" class="nav-item-btn <?= (in_array($currentPage, ['timesheet.php', 'timesheet_print.php'])) ? 'active' : '' ?>">
        <i class="fa-solid fa-calendar-check"></i>
        <span><?= isRtl() ? 'التايمشيت' : 'Timesheet' ?></span>
    </a>

    <!-- Center Highlight Button: Assign New Trip -->
    <a href="trip_assign.php" class="nav-item-btn btn-center-highlight <?= ($currentPage === 'trip_assign.php') ? 'active' : '' ?>" title="<?= isRtl() ? 'تعيين رحلة' : 'Assign Trip' ?>">
        <i class="fa-solid fa-plus"></i>
    </a>

    <a href="profile.php" class="nav-item-btn <?= ($currentPage === 'profile.php') ? 'active' : '' ?>">
        <i class="fa-solid fa-user-shield"></i>
        <span><?= isRtl() ? 'حسابي' : 'Profile' ?></span>
    </a>

    <a href="logout.php" class="nav-item-btn text-danger">
        <i class="fa-solid fa-arrow-right-from-bracket"></i>
        <span><?= isRtl() ? 'خروج' : 'Logout' ?></span>
    </a>
</nav>

<!-- Bootstrap 5 Bundle JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
