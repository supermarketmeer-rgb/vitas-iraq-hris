<?php
/**
 * Migration: Add driver_password_hash column & seed default passwords for all drivers
 * Run once: php database/migrate_driver_portal.php
 */
$pdo = new PDO(
    'mysql:host=localhost;dbname=hr_drivers_db;charset=utf8mb4',
    'root', '',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

echo "=== Driver Portal Migration ===\n";

// 1. Check / add driver_password_hash column
$cols = $pdo->query("SHOW COLUMNS FROM drivers")->fetchAll(PDO::FETCH_COLUMN);

if (!in_array('driver_password_hash', $cols)) {
    $pdo->exec("ALTER TABLE drivers ADD COLUMN `driver_password_hash` VARCHAR(255) NULL COMMENT 'كلمة مرور السائق للبوابة الإلكترونية'");
    echo "  + Added column: driver_password_hash\n";
} else {
    echo "  ✓ Column exists: driver_password_hash\n";
}

// 2. Seed default password (driver_number as initial password) for drivers without one
$defaultHash = password_hash('1234', PASSWORD_DEFAULT);

$drivers = $pdo->query("SELECT id, driver_number, full_name FROM drivers WHERE deleted_at IS NULL")->fetchAll();
$seeded = 0;
foreach ($drivers as $d) {
    $upd = $pdo->prepare("UPDATE drivers SET driver_password_hash = ? WHERE id = ? AND driver_password_hash IS NULL");
    $upd->execute([$defaultHash, $d['id']]);
    if ($upd->rowCount()) {
        echo "  + Seeded: [{$d['driver_number']}] {$d['full_name']}\n";
        $seeded++;
    }
}

if ($seeded === 0) {
    echo "  ✓ All drivers already have passwords.\n";
}

echo "\n=== Done! ===\n";
echo "Default password for all drivers: 1234\n";
echo "Drivers can login using their Badge No (driver_number) at: /driver/login.php\n";
