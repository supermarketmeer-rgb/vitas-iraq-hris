<?php
/**
 * Migration: Add manager portal columns & seed passwords
 * Run this script ONCE to set up Office Manager auth
 */
$pdo = new PDO(
    'mysql:host=localhost;dbname=hr_drivers_db;charset=utf8mb4',
    'root', '',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

echo "=== Manager Migration ===\n";

// Check if columns exist already
$cols = $pdo->query("SHOW COLUMNS FROM offices")->fetchAll(PDO::FETCH_COLUMN);

$columnsToAdd = [
    'manager_name'          => "VARCHAR(150) NULL COMMENT 'اسم مدير المكتب (عربي)'",
    'manager_name_en'       => "VARCHAR(150) NULL COMMENT 'اسم مدير المكتب (إنجليزي)'",
    'manager_email'         => "VARCHAR(100) NULL COMMENT 'بريد المدير'",
    'manager_badge_no'      => "VARCHAR(50) NULL UNIQUE COMMENT 'رقم باج المدير للدخول'",
    'manager_password_hash' => "VARCHAR(255) NULL COMMENT 'كلمة مرور مدير المكتب'",
    'office'                => null, // skip
    'status'                => null, // skip
    'hire_date'             => null, // skip
    'exit_date'             => null, // skip
    'notes'                 => null, // skip
];

foreach ($columnsToAdd as $col => $def) {
    if ($def === null) continue;
    if (!in_array($col, $cols)) {
        $pdo->exec("ALTER TABLE offices ADD COLUMN `$col` $def");
        echo "  + Added column: $col\n";
    } else {
        echo "  ✓ Column exists: $col\n";
    }
}

// Seed manager names if empty
$managerNames = [
    1 => ['ar' => 'مصطفى حامد الخفاجي', 'en' => 'Mustafa Al-Khafaji'],
    2 => ['ar' => 'كرار جاسم الموسوي',  'en' => 'Karrar Al-Musawi'],
    3 => ['ar' => 'حيدر ناصر الحسيني', 'en' => 'Haidar Al-Husseini'],
    4 => ['ar' => 'وسام مجيد الربيعي',  'en' => 'Wisam Al-Rubaie'],
    5 => ['ar' => 'عمر فاروق الحديدي',   'en' => 'Omar Al-Hadidi'],
    6 => ['ar' => 'سامان عبد الرحمن',    'en' => 'Saman Abdul-Rahman'],
];

$badgeNos = [
    1 => 'MGR-BGW',
    2 => 'MGR-BSR',
    3 => 'MGR-KRB',
    4 => 'MGR-NJF',
    5 => 'MGR-MSL',
    6 => 'MGR-ERB',
];

$defaultPasswordHash = password_hash('admin123', PASSWORD_DEFAULT);

echo "\n=== Seeding Manager Data ===\n";

foreach ($managerNames as $id => $names) {
    $badge = $badgeNos[$id];
    $upd = $pdo->prepare("
        UPDATE offices 
        SET manager_name = ?,
            manager_name_en = ?,
            manager_badge_no = ?,
            manager_password_hash = ?
        WHERE id = ?
          AND (manager_password_hash IS NULL OR manager_badge_no IS NULL)
    ");
    $upd->execute([$names['ar'], $names['en'], $badge, $defaultPasswordHash, $id]);
    if ($upd->rowCount() > 0) {
        echo "  + Seeded manager for office #{$id}: {$badge}\n";
    } else {
        echo "  ✓ Already seeded office #{$id}\n";
    }
}

echo "\n=== Done! ===\n";
echo "Default password for all managers: admin123\n";
echo "Badge numbers:\n";
foreach ($badgeNos as $id => $badge) {
    echo "  Office #{$id}: {$badge}\n";
}
