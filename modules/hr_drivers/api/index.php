<?php
/**
 * REST API Router for DTMS (Driver & Transportation Management System)
 * Compatible with PHP 8.x + MySQL PDO
 * Supports real-time CRUD synchronization with React UI & phpMyAdmin
 */

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');

require_once __DIR__ . '/../../includes/functions.php';

function jsonResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function requireDtmsPortalAccess(): array {
    global $centralPdo;

    $sessionUser = central_current_user();
    if (!$sessionUser || empty($sessionUser['id'])) {
        jsonResponse(['status' => 'error', 'message' => 'Central Portal authentication required.'], 401);
    }

    $stmt = $centralPdo->prepare('SELECT * FROM users WHERE id = ? AND is_active = 1');
    $stmt->execute([(int)$sessionUser['id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        clear_auth_session();
        jsonResponse(['status' => 'error', 'message' => 'Central Portal session is no longer valid.'], 401);
    }

    $_SESSION['user'] = $user;
    if (!can_access_portal_module('drivers_management_system', (int)$user['id'])) {
        jsonResponse(['status' => 'error', 'message' => 'Access to Driver Management System is denied.'], 403);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        $expected = (string)($_SESSION['csrf_token'] ?? '');
        $submitted = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
        if ($expected === '' || $submitted === '' || !hash_equals($expected, $submitted)) {
            jsonResponse(['status' => 'error', 'message' => 'Invalid security token. Refresh the page and try again.'], 419);
        }
    }

    return $user;
}

$portalUser = requireDtmsPortalAccess();

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/azure_vision.php';
$pdo = Database::getConnection();

function resolveDtmsRole(PDO $pdo, array $portalUser): string {
    if (!empty($portalUser['is_portal_admin']) || ($portalUser['username'] ?? '') === 'admin') {
        return 'admin';
    }

    $stmt = $pdo->prepare("SELECT role FROM users WHERE portal_user_id = ? AND status = 'active' LIMIT 1");
    $stmt->execute([(int)($portalUser['id'] ?? 0)]);
    $role = (string)($stmt->fetchColumn() ?: '');
    if (in_array($role, ['admin', 'supervisor', 'security', 'viewer', 'driver'], true)) {
        return $role;
    }
    return 'viewer';
}

$portalUser['id'] = (int)($portalUser['id'] ?? 0);
$portalUser['dtms_role'] = resolveDtmsRole($pdo, $portalUser);
if ($portalUser['dtms_role'] === 'driver' && session_status() === PHP_SESSION_ACTIVE && !headers_sent()) {
    $cookie = session_get_cookie_params();
    setcookie(session_name(), session_id(), [
        'expires' => time() + 86400,
        'path' => $cookie['path'] ?: '/',
        'domain' => $cookie['domain'] ?? '',
        'secure' => !empty($cookie['secure']),
        'httponly' => true,
        'samesite' => $cookie['samesite'] ?? 'Lax',
    ]);
    $_SESSION['dtms_driver_last_activity'] = time();
}
if ($portalUser['dtms_role'] === 'viewer') {
    $requestedEndpoint = $_GET['endpoint'] ?? 'health';
    $viewerReadEndpoints = ['health', 'runtime_settings', 'offices', 'vehicles', 'drivers', 'trips', 'odometer', 'notifications'];
    $viewerNotificationWrite = $requestedEndpoint === 'notifications'
        && $_SERVER['REQUEST_METHOD'] === 'POST'
        && in_array($_GET['action'] ?? '', ['read', 'read_all'], true);
    if (!$viewerNotificationWrite && ($_SERVER['REQUEST_METHOD'] !== 'GET' || !in_array($requestedEndpoint, $viewerReadEndpoints, true))) {
        jsonResponse(['status' => 'error', 'message' => 'Viewer access is limited to read-only trip data.'], 403);
    }
}

// Authentication and CSRF checks are complete. The API only reads session data
// from this point onward, so release PHP's per-session lock before OCR or uploads.
// This allows a driver to save/start/end a trip while Azure OCR is still running.
if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}

$endpoint = $_GET['endpoint'] ?? 'health';
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET', 'POST', 'DELETE'], true)) {
    jsonResponse(['status' => 'error', 'message' => 'Unsupported request method.'], 405);
}
$contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > 13 * 1024 * 1024) {
    jsonResponse(['status' => 'error', 'message' => 'Request body is too large.'], 413);
}
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true) ?? $_POST;

function dtmsTextIsCorrupted(?string $value): bool {
    $value = trim((string)$value);
    if ($value === '') return false;

    // Literal question marks mean the original characters were already lost before storage.
    if (preg_match('/^\?+(?:[\s\-_.،]+\?+)*$/u', $value) === 1) return true;

    // Detect common UTF-8 bytes that were incorrectly decoded as Windows-1252/Latin-1.
    return preg_match('/(?:Ã.|Â.|Ø.|Ù.|Û.){2,}/u', $value) === 1;
}

function dtmsFirstReadableText(array $values, string $fallback = ''): string {
    foreach ($values as $value) {
        $value = trim((string)$value);
        if ($value !== '' && !dtmsTextIsCorrupted($value)) return $value;
    }
    return $fallback;
}

function dtmsCentralDisplayName(int $portalUserId): ?string {
    global $centralPdo;
    static $cache = [];
    if ($portalUserId <= 0 || !$centralPdo) return null;
    if (array_key_exists($portalUserId, $cache)) return $cache[$portalUserId];

    $stmt = $centralPdo->prepare('SELECT full_name_ar, full_name_en, username FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$portalUserId]);
    $account = $stmt->fetch(PDO::FETCH_ASSOC);
    $cache[$portalUserId] = $account
        ? dtmsFirstReadableText([$account['full_name_ar'], $account['full_name_en'], $account['username']], 'User ' . $portalUserId)
        : null;
    return $cache[$portalUserId];
}

if ($method !== 'GET' && in_array($endpoint, ['users', 'drivers', 'governorates', 'offices'], true) && $portalUser['dtms_role'] !== 'admin') {
    jsonResponse(['status' => 'error', 'message' => 'Administrator access is required.'], 403);
}

function normalizeOcrDigits(string $value): string {
    return strtr($value, [
        '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
        '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4',
        '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
    ]);
}

function normalizeOdometerUnit($unit): string {
    return $unit === 'mile' ? 'mile' : 'km';
}

function odometerReadingToKm(float $reading, string $unit): float {
    return round($unit === 'mile' ? $reading * 1.609344 : $reading, 1);
}

function isDashboardMetricCandidate(string $text, int $offset, string $matched, int $value): bool {
    $before = mb_strcut($text, max(0, $offset - 24), min(24, $offset), 'UTF-8');
    $afterOffset = $offset + strlen($matched);
    $after = mb_strcut($text, $afterOffset, 24, 'UTF-8');

    if ($value <= 250 && (
        preg_match('/(?:TEMP(?:ERATURE)?\s*[:=-]?\s*)$/iu', $before) === 1 ||
        preg_match('/^\s*(?:\x{00B0}\s*)?[CF](?:\b|\s|$)/iu', $after) === 1
    )) {
        return true;
    }

    $metricBefore = '/(?:AVG|AVERAGE|MPG|RANGE|TRIP\s*(?:A|B|A\/B)?|RPM|L\/100\s*KM|KM\/L)\s*[:=-]?\s*$/iu';
    $metricAfter = '/^\s*(?:MPG|RPM|KM\/L|L\/100\s*KM)(?:\b|\s|$)/iu';
    return preg_match($metricBefore, $before) === 1 || preg_match($metricAfter, $after) === 1;
}

function extractOdometerCandidates(array $readResult, int $expectedMin): array {
    $candidates = [];
    $fallbackCandidates = [];
    $rawLines = [];
    foreach (($readResult['blocks'] ?? []) as $block) {
        foreach (($block['lines'] ?? []) as $line) {
            $text = trim((string)($line['text'] ?? ''));
            if ($text === '') continue;
            $rawLines[] = $text;
            $normalized = normalizeOcrDigits($text);
            preg_match_all(
                '/(?<![0-9])[0-9][0-9\s,.٫٬]{1,10}[0-9](?![0-9])|(?<![0-9])[0-9]{3,8}(?![0-9])/u',
                $normalized,
                $matches,
                PREG_OFFSET_CAPTURE
            );

            $wordConfidences = [];
            foreach (($line['words'] ?? []) as $word) {
                if (isset($word['confidence']) && is_numeric($word['confidence'])) {
                    $wordConfidences[] = (float)$word['confidence'];
                }
            }
            $confidence = $wordConfidences
                ? (array_sum($wordConfidences) / count($wordConfidences)) * 100
                : 0.0;

            foreach (($matches[0] ?? []) as $matchData) {
                [$matched, $matchOffset] = $matchData;
                $compact = preg_replace('/\s+/u', '', trim($matched));
                if (preg_match('/^([0-9]{3,8})[.,٫](\d)$/u', $compact, $decimalMatch)) {
                    $digits = $decimalMatch[1];
                } else {
                    $digits = str_replace([',', '.', '٫', '٬'], '', $compact);
                }
                if (!preg_match('/^[0-9]{3,8}$/', $digits)) continue;
                $value = (int)$digits;
                if ($value <= 0 || $value > 99999999) continue;
                $belowExpectedPenalty = $expectedMin > 0 && $value < $expectedMin ? 100000000 : 0;
                $distance = $expectedMin > 0 ? abs($value - $expectedMin) : -$value;
                $candidate = [
                    'value' => $value,
                    'confidence' => round($confidence, 1),
                    'text' => $text,
                    'score' => $belowExpectedPenalty + $distance,
                ];
                $fallbackCandidates[] = $candidate;
                if (!isDashboardMetricCandidate($normalized, (int)$matchOffset, $matched, $value)) {
                    $candidates[] = $candidate;
                }
            }
        }
    }

    // Never fail OCR only because every number was next to a dashboard label.
    // In that edge case, return Azure's best numeric candidate for manual review.
    if (!$candidates) $candidates = $fallbackCandidates;

    usort($candidates, static function (array $a, array $b): int {
        if ($a['score'] === $b['score']) return $b['confidence'] <=> $a['confidence'];
        return $a['score'] <=> $b['score'];
    });
    return ['candidates' => $candidates, 'raw_text' => implode("\n", $rawLines)];
}

function enhanceOdometerImage(string $binary): ?string {
    if (!function_exists('imagecreatefromstring') || !function_exists('imagefilter')) return null;
    $source = @imagecreatefromstring($binary);
    if ($source === false) return null;

    $width = imagesx($source);
    $height = imagesy($source);
    $scale = max($width, $height) < 1600 ? 2 : 1;
    $enhanced = imagecreatetruecolor($width * $scale, $height * $scale);
    imagecopyresampled($enhanced, $source, 0, 0, 0, 0, $width * $scale, $height * $scale, $width, $height);
    imagefilter($enhanced, IMG_FILTER_GRAYSCALE);
    imagefilter($enhanced, IMG_FILTER_CONTRAST, -28);
    if (function_exists('imageconvolution')) {
        imageconvolution($enhanced, [[0, -1, 0], [-1, 5, -1], [0, -1, 0]], 1, 0);
    }

    ob_start();
    imagejpeg($enhanced, null, 92);
    $result = ob_get_clean();
    imagedestroy($source);
    imagedestroy($enhanced);
    return is_string($result) && $result !== '' ? $result : null;
}

function callAzureVisionRead(string $url, string $key, string $binary, string $mimeSubtype): array {
    $startedAt = microtime(true);
    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $binary,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 35,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Content-Type: image/' . $mimeSubtype,
            'Ocp-Apim-Subscription-Key: ' . $key,
        ],
    ]);
    $body = curl_exec($curl);
    $error = curl_error($curl);
    $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    return [
        'body' => $body,
        'error' => $error,
        'status' => $status,
        'processing_time_ms' => (int)round((microtime(true) - $startedAt) * 1000),
    ];
}

if ($endpoint === 'audit_logs' && $method === 'GET' && $portalUser['dtms_role'] !== 'admin') {
    jsonResponse(['status' => 'error', 'message' => 'Audit logs are available to administrators only.'], 403);
}

function resolveOfficeId(PDO $pdo, $rawOff): int {
    if (is_numeric($rawOff)) {
        $chk = $pdo->prepare("SELECT id FROM offices WHERE id = ?");
        $chk->execute([intval($rawOff)]);
        $found = $chk->fetchColumn();
        if ($found) return intval($found);
    }
    if (!empty($rawOff)) {
        $clean = preg_replace('/^off-/', '', strval($rawOff));
        if (is_numeric($clean)) {
            $chk = $pdo->prepare("SELECT id FROM offices WHERE id = ?");
            $chk->execute([intval($clean)]);
            $found = $chk->fetchColumn();
            if ($found) return intval($found);
        }
        $chkName = $pdo->prepare("SELECT id FROM offices WHERE name = ? OR code = ?");
        $chkName->execute([strval($rawOff), strval($rawOff)]);
        $foundName = $chkName->fetchColumn();
        if ($foundName) return intval($foundName);
    }
    $first = $pdo->query("SELECT id FROM offices ORDER BY id ASC LIMIT 1")->fetchColumn();
    return $first ? intval($first) : 1;
}

function resolveGovernorate(PDO $pdo, $rawId = null, $rawName = ''): ?array {
    if (is_numeric($rawId) && (int)$rawId > 0) {
        $stmt = $pdo->prepare("SELECT id, name_ar, name_en FROM governorates WHERE id = ? LIMIT 1");
        $stmt->execute([(int)$rawId]);
        $row = $stmt->fetch();
        if ($row) return $row;
    }
    $name = trim((string)$rawName);
    if ($name !== '') {
        $stmt = $pdo->prepare("SELECT id, name_ar, name_en FROM governorates WHERE name_ar = ? OR name_en = ? LIMIT 1");
        $stmt->execute([$name, $name]);
        $row = $stmt->fetch();
        if ($row) return $row;

        // Existing offices may include a city/branch qualifier, for example
        // "بابل الحلة", while the master record is simply "بابل".
        $normalizedName = mb_strtolower(preg_replace('/\s+/u', ' ', $name), 'UTF-8');
        $governorates = $pdo->query("SELECT id, name_ar, name_en FROM governorates")->fetchAll();
        foreach ($governorates as $governorate) {
            foreach ([$governorate['name_ar'], $governorate['name_en']] as $candidate) {
                $normalizedCandidate = mb_strtolower(preg_replace('/\s+/u', ' ', trim((string)$candidate)), 'UTF-8');
                if ($normalizedCandidate !== '' && (
                    mb_strpos($normalizedName, $normalizedCandidate) !== false ||
                    mb_strpos($normalizedCandidate, $normalizedName) !== false
                )) {
                    return $governorate;
                }
            }
        }
    }
    return null;
}

function resolveVehicleId(PDO $pdo, $rawVeh): ?int {
    if (empty($rawVeh)) return null;
    if (is_numeric($rawVeh)) {
        $chk = $pdo->prepare("SELECT id FROM vehicles WHERE id = ?");
        $chk->execute([intval($rawVeh)]);
        $found = $chk->fetchColumn();
        if ($found) return intval($found);
    }
    $clean = preg_replace('/^veh-/', '', strval($rawVeh));
    if (is_numeric($clean)) {
        $chk = $pdo->prepare("SELECT id FROM vehicles WHERE id = ?");
        $chk->execute([intval($clean)]);
        $found = $chk->fetchColumn();
        if ($found) return intval($found);
    }
    $chk2 = $pdo->prepare("SELECT id FROM vehicles WHERE vehicle_no = ? OR plate_no = ?");
    $chk2->execute([strval($rawVeh), strval($rawVeh)]);
    $found2 = $chk2->fetchColumn();
    return $found2 ? intval($found2) : null;
}

function resolveDriverId(PDO $pdo, $rawDrv): ?int {
    if (empty($rawDrv)) {
        $first = $pdo->query("SELECT id FROM drivers ORDER BY id ASC LIMIT 1")->fetchColumn();
        return $first ? intval($first) : null;
    }
    if (is_numeric($rawDrv)) {
        $chk = $pdo->prepare("SELECT id FROM drivers WHERE id = ?");
        $chk->execute([intval($rawDrv)]);
        $found = $chk->fetchColumn();
        if ($found) return intval($found);
    }
    $clean = preg_replace('/^drv-/', '', strval($rawDrv));
    if (is_numeric($clean)) {
        $chk = $pdo->prepare("SELECT id FROM drivers WHERE id = ?");
        $chk->execute([intval($clean)]);
        $found = $chk->fetchColumn();
        if ($found) return intval($found);
    }
    $chk2 = $pdo->prepare("SELECT id FROM drivers WHERE full_name = ? OR employee_no = ?");
    $chk2->execute([strval($rawDrv), strval($rawDrv)]);
    $found2 = $chk2->fetchColumn();
    if ($found2) return intval($found2);

    $first = $pdo->query("SELECT id FROM drivers ORDER BY id ASC LIMIT 1")->fetchColumn();
    return $first ? intval($first) : null;
}

function createDtmsNotification(PDO $pdo, int $userId, string $titleAr, string $titleEn, string $messageAr, string $messageEn, string $type, ?int $tripId): void {
    if ($userId <= 0) return;
    $stmt = $pdo->prepare('INSERT INTO notifications (user_id, title, title_en, message, message_en, type, trip_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$userId, $titleAr, $titleEn, $messageAr, $messageEn, $type, $tripId]);
}

switch ($endpoint) {
    case 'health':
        jsonResponse([
            'status' => 'online',
            'system' => 'Driver & Transportation Management System (DTMS)',
            'php_version' => PHP_VERSION,
            'database' => 'MySQL 8.x PDO Connected (dtms_db)',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        break;

    case 'runtime_settings':
        if ($method !== 'GET') jsonResponse(['status' => 'error', 'message' => 'Read-only endpoint.'], 405);
        jsonResponse([
            'status' => 'success',
            'data' => [
                'default_ocr_engine' => 'Azure Vision',
                'azure_ocr_configured' => dtmsAzureVisionConfig($pdo)['key'] !== '',
                'gps_tracking_enabled' => dtmsSystemSetting($pdo, 'gps_tracking_enabled', '0') === '1',
            ],
        ]);
        break;

    case 'notifications':
        $profileStmt = $pdo->prepare("SELECT id, preferred_language FROM users WHERE portal_user_id = ? AND status = 'active' LIMIT 1");
        $profileStmt->execute([(int)$portalUser['id']]);
        $notificationProfile = $profileStmt->fetch();
        if (!$notificationProfile) jsonResponse(['status' => 'success', 'data' => []]);
        $notificationUserId = (int)$notificationProfile['id'];
        $notificationLanguage = ($notificationProfile['preferred_language'] ?? 'ar') === 'en' ? 'en' : 'ar';

        if ($method === 'GET') {
            $stmt = $pdo->prepare("
                SELECT id, user_id,
                       CASE WHEN ? = 'en' THEN COALESCE(NULLIF(title_en, ''), title) ELSE title END AS title,
                       CASE WHEN ? = 'en' THEN COALESCE(NULLIF(message_en, ''), message) ELSE message END AS message,
                       type, is_read, trip_id, created_at
                FROM notifications
                WHERE user_id = ?
                ORDER BY created_at DESC, id DESC
                LIMIT 200
            ");
            $stmt->execute([$notificationLanguage, $notificationLanguage, $notificationUserId]);
            jsonResponse(['status' => 'success', 'data' => $stmt->fetchAll()]);
        }

        if ($method === 'POST' && $action === 'read') {
            $id = (int)($input['id'] ?? 0);
            $stmt = $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?');
            $stmt->execute([$id, $notificationUserId]);
            jsonResponse(['status' => 'success']);
        }

        if ($method === 'POST' && $action === 'read_all') {
            $stmt = $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?');
            $stmt->execute([$notificationUserId]);
            jsonResponse(['status' => 'success']);
        }

        jsonResponse(['status' => 'error', 'message' => 'Unsupported notification action.'], 405);

    // ----------------------------------------------------
    // VEHICLES (المركبات والسيارات)
    // ----------------------------------------------------
    case 'vehicles':
        $subAction = $action ?: ($method === 'DELETE' ? 'delete' : ($method === 'POST' ? 'save' : 'list'));

        if (($subAction === 'delete' || $subAction === 'sync' || $method === 'DELETE') && $portalUser['dtms_role'] !== 'admin') {
            jsonResponse(['status' => 'error', 'message' => 'Administrator access is required.'], 403);
        }

        if ($subAction === 'delete' || $method === 'DELETE') {
            $id = $input['id'] ?? $_GET['id'] ?? '';
            $vehNo = $input['vehicle_no'] ?? $_GET['vehicle_no'] ?? '';
            $plate = $input['plate_no'] ?? $_GET['plate_no'] ?? '';
            $numId = is_numeric($id) ? intval($id) : 0;

            // Unassign from any drivers first to prevent foreign key errors
            if ($numId > 0) {
                $pdo->prepare("UPDATE drivers SET assigned_vehicle_id = NULL WHERE assigned_vehicle_id = ?")->execute([$numId]);
            }
            if ($vehNo) {
                $stmtFind = $pdo->prepare("SELECT id FROM vehicles WHERE vehicle_no = ?");
                $stmtFind->execute([$vehNo]);
                $foundId = $stmtFind->fetchColumn();
                if ($foundId) {
                    $pdo->prepare("UPDATE drivers SET assigned_vehicle_id = NULL WHERE assigned_vehicle_id = ?")->execute([$foundId]);
                }
            }

            $stmt = $pdo->prepare("DELETE FROM vehicles WHERE (id > 0 AND id = ?) OR (vehicle_no != '' AND vehicle_no = ?) OR (plate_no != '' AND plate_no = ?)");
            $stmt->execute([$numId, $vehNo, $plate]);
            $count = $stmt->rowCount();

            jsonResponse([
                'status' => 'success',
                'message' => 'تم حذف المركبة بنجاح من قاعدة بيانات MySQL',
                'deleted_count' => $count
            ]);
        }

        if ($subAction === 'sync') {
            // Full synchronization of the vehicles table with the client state
            $list = $input['vehicles'] ?? $input;
            if (!is_array($list)) $list = [];

            if (empty($list)) {
                $pdo->exec("UPDATE drivers SET assigned_vehicle_id = NULL");
                $pdo->exec("DELETE FROM vehicles");
                jsonResponse([
                    'status' => 'success',
                    'message' => 'تم تفريغ جدول المركبات في MySQL ليتطابق مع التطبيق تماماً (0 مركبات).'
                ]);
            }

            $keptNos = [];
            foreach ($list as $item) {
                if (!empty($item['vehicle_no'])) {
                    $keptNos[] = $item['vehicle_no'];
                }
            }

            if (!empty($keptNos)) {
                $inClause = implode(',', array_fill(0, count($keptNos), '?'));
                $delStmt = $pdo->prepare("DELETE FROM vehicles WHERE vehicle_no NOT IN ($inClause)");
                $delStmt->execute($keptNos);
            }

            foreach ($list as $v) {
                $vehNo = $v['vehicle_no'] ?? '';
                if (!$vehNo) continue;
                $plate = $v['plate_no'] ?? '';
                $type = $v['vehicle_type'] ?? 'سيارة';
                $category = ($v['vehicle_category'] ?? '') === 'عمومي' ? 'عمومي' : 'خصوصي';
                $model = $v['model'] ?? '';
                $year = intval($v['year'] ?? date('Y'));
                $chassis = !empty($v['chassis_no']) ? trim($v['chassis_no']) : null;
                $fuel = in_array($v['fuel_type'] ?? '', ['diesel', 'ديزل']) ? 'ديزل' : (in_array($v['fuel_type'] ?? '', ['hybrid', 'هايبرد']) ? 'هايبرد' : (in_array($v['fuel_type'] ?? '', ['gasoline', 'بنزين']) ? 'بنزين' : 'بنزين'));
                $odo = max(0, round((float)($v['last_odometer'] ?? 0), 1));
                $odometerUnit = normalizeOdometerUnit($v['odometer_unit'] ?? 'km');
                $vStatus = in_array($v['status'] ?? '', ['available', 'assigned', 'maintenance', 'out_of_service']) ? $v['status'] : 'available';
                $insExpiry = !empty($v['insurance_expiry']) ? $v['insurance_expiry'] : null;
                $inspExpiry = !empty($v['inspection_expiry']) ? $v['inspection_expiry'] : null;
                $officeId = resolveOfficeId($pdo, $v['office_id'] ?? '');

                $upsert = $pdo->prepare("
                    INSERT INTO vehicles (vehicle_no, plate_no, vehicle_type, vehicle_category, model, year, chassis_no, fuel_type, last_odometer, odometer_unit, status, insurance_expiry, inspection_expiry, office_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        plate_no = VALUES(plate_no),
                        vehicle_type = VALUES(vehicle_type),
                        vehicle_category = VALUES(vehicle_category),
                        model = VALUES(model),
                        year = VALUES(year),
                        chassis_no = VALUES(chassis_no),
                        fuel_type = VALUES(fuel_type),
                        last_odometer = VALUES(last_odometer),
                        odometer_unit = VALUES(odometer_unit),
                        status = VALUES(status),
                        insurance_expiry = VALUES(insurance_expiry),
                        inspection_expiry = VALUES(inspection_expiry),
                        office_id = VALUES(office_id)
                ");
                $upsert->execute([$vehNo, $plate, $type, $category, $model, $year, $chassis, $fuel, $odo, $odometerUnit, $vStatus, $insExpiry, $inspExpiry, $officeId]);
            }

            jsonResponse(['status' => 'success', 'message' => 'تمت مزامنة جميع المركبات بنجاح في MySQL']);
        }

        if ($subAction === 'save' || $method === 'POST') {
            $vehNo = $input['vehicle_no'] ?? '';
            if ($portalUser['dtms_role'] !== 'admin') {
                $vehicleAccessSql = "SELECT v.id FROM vehicles v LEFT JOIN drivers d ON d.assigned_vehicle_id = v.id WHERE v.vehicle_no = ?";
                $vehicleAccessParams = [$vehNo];
                if ($portalUser['dtms_role'] === 'driver') {
                    $vehicleAccessSql .= " AND d.portal_user_id = ?";
                    $vehicleAccessParams[] = (int)$portalUser['id'];
                } elseif ($portalUser['dtms_role'] === 'supervisor') {
                    $vehicleAccessSql .= " AND EXISTS (SELECT 1 FROM users u WHERE u.portal_user_id = ? AND u.office_id = v.office_id)";
                    $vehicleAccessParams[] = (int)$portalUser['id'];
                } elseif ($portalUser['dtms_role'] !== 'security') {
                    jsonResponse(['status' => 'error', 'message' => 'You are not allowed to update vehicles.'], 403);
                }
                $vehicleAccess = $pdo->prepare($vehicleAccessSql . " LIMIT 1");
                $vehicleAccess->execute($vehicleAccessParams);
                $vehicleId = (int)($vehicleAccess->fetchColumn() ?: 0);
                if ($vehicleId <= 0) jsonResponse(['status' => 'error', 'message' => 'Vehicle access denied.'], 403);
                $status = in_array($input['status'] ?? '', ['available', 'assigned', 'maintenance', 'out_of_service'], true) ? $input['status'] : 'available';
                $lastOdometer = max(0, round((float)($input['last_odometer'] ?? 0), 1));
                $pdo->prepare("UPDATE vehicles SET status = ?, last_odometer = GREATEST(last_odometer, ?) WHERE id = ?")
                    ->execute([$status, $lastOdometer, $vehicleId]);
                jsonResponse(['status' => 'success', 'message' => 'Vehicle operational state updated.']);
            }
            $plate = $input['plate_no'] ?? '';
            $type = $input['vehicle_type'] ?? 'سيارة';
            $category = ($input['vehicle_category'] ?? '') === 'عمومي' ? 'عمومي' : 'خصوصي';
            $model = $input['model'] ?? '';
            $year = intval($input['year'] ?? date('Y'));
            $chassis = !empty($input['chassis_no']) ? trim($input['chassis_no']) : null;
            $fuel = in_array($input['fuel_type'] ?? '', ['diesel', 'ديزل']) ? 'ديزل' : (in_array($input['fuel_type'] ?? '', ['hybrid', 'هايبرد']) ? 'هايبرد' : (in_array($input['fuel_type'] ?? '', ['gasoline', 'بنزين']) ? 'بنزين' : 'بنزين'));
            $odo = max(0, round((float)($input['last_odometer'] ?? 0), 1));
            $odometerUnit = normalizeOdometerUnit($input['odometer_unit'] ?? 'km');
            $vStatus = in_array($input['status'] ?? '', ['available', 'assigned', 'maintenance', 'out_of_service']) ? $input['status'] : 'available';
            $insExpiry = !empty($input['insurance_expiry']) ? $input['insurance_expiry'] : null;
            $inspExpiry = !empty($input['inspection_expiry']) ? $input['inspection_expiry'] : null;
            $officeId = resolveOfficeId($pdo, $input['office_id'] ?? '');

            $upsert = $pdo->prepare("
                INSERT INTO vehicles (vehicle_no, plate_no, vehicle_type, vehicle_category, model, year, chassis_no, fuel_type, last_odometer, odometer_unit, status, insurance_expiry, inspection_expiry, office_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    plate_no = VALUES(plate_no),
                    vehicle_type = VALUES(vehicle_type),
                    vehicle_category = VALUES(vehicle_category),
                    model = VALUES(model),
                    year = VALUES(year),
                    chassis_no = VALUES(chassis_no),
                    fuel_type = VALUES(fuel_type),
                    last_odometer = VALUES(last_odometer),
                    odometer_unit = VALUES(odometer_unit),
                    status = VALUES(status),
                    insurance_expiry = VALUES(insurance_expiry),
                    inspection_expiry = VALUES(inspection_expiry),
                    office_id = VALUES(office_id)
            ");
            $upsert->execute([$vehNo, $plate, $type, $category, $model, $year, $chassis, $fuel, $odo, $odometerUnit, $vStatus, $insExpiry, $inspExpiry, $officeId]);

            jsonResponse(['status' => 'success', 'message' => 'تم حفظ وتحديث بيانات المركبة في قاعدة البيانات MySQL']);
        } else {
            $vehicleSql = "
                SELECT v.*, d.id AS assigned_driver_id, d.full_name AS driver_name, o.name AS office_name
                FROM vehicles v
                LEFT JOIN drivers d ON d.assigned_vehicle_id = v.id
                LEFT JOIN offices o ON v.office_id = o.id
            ";
            $vehicleParams = [];
            if ($portalUser['dtms_role'] === 'driver') {
                $vehicleSql .= " WHERE d.portal_user_id = ?";
                $vehicleParams[] = (int)$portalUser['id'];
            } elseif (in_array($portalUser['dtms_role'], ['supervisor', 'viewer'], true)) {
                $vehicleSql .= " WHERE EXISTS (SELECT 1 FROM users u WHERE u.portal_user_id = ? AND u.office_id = v.office_id)";
                $vehicleParams[] = (int)$portalUser['id'];
            }
            $vehicleSql .= " ORDER BY v.id ASC";
            $stmt = $pdo->prepare($vehicleSql);
            $stmt->execute($vehicleParams);
            jsonResponse(['status' => 'success', 'data' => $stmt->fetchAll()]);
        }
        break;

    // ----------------------------------------------------
    // USERS (المستخدمين والصلاحيات)
    // ----------------------------------------------------
    case 'users':
        if ($portalUser['dtms_role'] !== 'admin') {
            jsonResponse(['status' => 'error', 'message' => 'User access profiles are available to administrators only.'], 403);
        }
        $subAction = $action ?: ($method === 'DELETE' ? 'delete' : ($method === 'POST' ? 'save' : 'list'));

        if ($subAction === 'delete' || $method === 'DELETE') {
            $id = $input['id'] ?? $_GET['id'] ?? '';
            $username = $input['username'] ?? $_GET['username'] ?? '';
            $email = $input['email'] ?? $_GET['email'] ?? '';
            $numId = is_numeric($id) ? intval($id) : 0;

            $stmt = $pdo->prepare("DELETE FROM users WHERE (id > 0 AND id = ?) OR (username != '' AND username = ?) OR (email != '' AND email = ?)");
            $stmt->execute([$numId, $username, $email]);

            jsonResponse(['status' => 'success', 'message' => 'تم حذف المستخدم من قاعدة بيانات MySQL']);
        }

        if ($subAction === 'save' || $method === 'POST') {
            global $centralPdo;
            $requestedPortalId = (int)($input['portal_user_id'] ?? 0);
            $requestedUsername = trim((string)($input['username'] ?? ''));
            $requestedEmail = trim((string)($input['email'] ?? ''));
            $centralStmt = $centralPdo->prepare("
                SELECT id, username, email, full_name_ar, full_name_en, is_active
                FROM users
                WHERE (? <> '' AND LOWER(username) = LOWER(?))
                   OR (? <> '' AND LOWER(email) = LOWER(?))
                   OR (? > 0 AND id = ?)
                ORDER BY CASE WHEN LOWER(username) = LOWER(?) THEN 0 WHEN LOWER(email) = LOWER(?) THEN 1 ELSE 2 END
                LIMIT 1
            ");
            $centralStmt->execute([
                $requestedUsername, $requestedUsername,
                $requestedEmail, $requestedEmail,
                $requestedPortalId, $requestedPortalId,
                $requestedUsername, $requestedEmail,
            ]);
            $centralAccount = $centralStmt->fetch();
            if (!$centralAccount || !can_access_portal_module('drivers_management_system', (int)$centralAccount['id'])) {
                jsonResponse(['status' => 'error', 'message' => 'The user must first be granted DTMS access in Central Portal.'], 422);
            }

            $portalUserId = (int)$centralAccount['id'];
            $name = dtmsFirstReadableText(
                [$centralAccount['full_name_ar'], $centralAccount['full_name_en'], $centralAccount['username']],
                'User ' . $portalUserId
            );
            $username = (string)$centralAccount['username'];
            $email = (string)($centralAccount['email'] ?: ($username . '@vitasiraq.com'));
            $role = in_array($input['role'] ?? '', ['admin', 'supervisor', 'security', 'viewer', 'driver'], true) ? $input['role'] : 'driver';
            $phone = $input['phone'] ?? '';
            $status = !empty($centralAccount['is_active']) ? 'active' : 'inactive';
            $officeId = resolveOfficeId($pdo, $input['office_id'] ?? '');
            $canViewReports = !empty($input['can_view_reports']) ? 1 : 0;
            $preferredLanguage = ($input['preferred_language'] ?? 'ar') === 'en' ? 'en' : 'ar';
            $driverMode = ($input['driver_mode'] ?? 'simple') === 'complex' ? 'complex' : 'simple';

            $existingProfile = $pdo->prepare("SELECT id FROM users WHERE portal_user_id = ? OR LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1");
            $existingProfile->execute([$portalUserId, $username, $email]);
            $profileId = $existingProfile->fetchColumn();
            if ($profileId) {
                $stmt = $pdo->prepare("UPDATE users SET portal_user_id = ?, name = ?, username = ?, email = ?, phone = ?, role = ?, office_id = ?, status = ?, can_view_reports = ?, preferred_language = ?, driver_mode = ? WHERE id = ?");
                $stmt->execute([$portalUserId, $name, $username, $email, $phone, $role, $officeId, $status, $canViewReports, $preferredLanguage, $driverMode, $profileId]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO users (portal_user_id, name, username, email, password, phone, role, office_id, status, can_view_reports, preferred_language, driver_mode) VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$portalUserId, $name, $username, $email, $phone, $role, $officeId, $status, $canViewReports, $preferredLanguage, $driverMode]);
                $profileId = $pdo->lastInsertId();
            }

            if ($role === 'driver') {
                $linkDriver = $pdo->prepare("UPDATE drivers SET portal_user_id = ?, user_id = ? WHERE LOWER(TRIM(employee_no)) = LOWER(TRIM(?))");
                $linkDriver->execute([$portalUserId, (int)$profileId, $username]);
            }

            jsonResponse(['status' => 'success', 'message' => 'تم حفظ المستخدم في قاعدة بيانات MySQL بنجاح']);
        } else {
            // Default: List all users
            $stmt = $pdo->query("SELECT COALESCE(portal_user_id, id) AS id, portal_user_id, name, username, email, phone, role, office_id, status, can_view_reports, preferred_language, driver_mode, created_at FROM users ORDER BY id ASC");
            $users = $stmt->fetchAll();
            $repairUserName = $pdo->prepare('UPDATE users SET name = ? WHERE portal_user_id = ?');
            foreach ($users as &$moduleUser) {
                if (!dtmsTextIsCorrupted((string)$moduleUser['name'])) continue;
                $replacement = dtmsCentralDisplayName((int)$moduleUser['portal_user_id']);
                if (!$replacement) $replacement = dtmsFirstReadableText([$moduleUser['username'], $moduleUser['email']], 'User');
                $moduleUser['name'] = $replacement;
                if (!empty($moduleUser['portal_user_id'])) $repairUserName->execute([$replacement, (int)$moduleUser['portal_user_id']]);
            }
            unset($moduleUser);
            jsonResponse(['status' => 'success', 'data' => $users]);
        }
        break;

    // ----------------------------------------------------
    // DRIVERS (السائقين)
    // ----------------------------------------------------
    case 'drivers':
        $subAction = $action ?: ($method === 'DELETE' ? 'delete' : ($method === 'POST' ? 'save' : 'list'));
        if ($subAction === 'delete' || $method === 'DELETE') {
            $id = $input['id'] ?? $_GET['id'] ?? '';
            $empNo = $input['employee_no'] ?? '';
            $numId = is_numeric($id) ? intval($id) : 0;
            $stmt = $pdo->prepare("DELETE FROM drivers WHERE (id > 0 AND id = ?) OR (employee_no != '' AND employee_no = ?)");
            $stmt->execute([$numId, $empNo]);
            jsonResponse(['status' => 'success', 'message' => 'تم حذف السائق بنجاح من قاعدة البيانات']);
        }

        if ($subAction === 'sync') {
            $list = $input['drivers'] ?? $input;
            if (is_array($list)) {
                foreach ($list as $d) {
                    $fullName = $d['full_name'] ?? '';
                    if (!$fullName) continue;
                    $empNo = $d['employee_no'] ?? ('EMP-' . rand(100, 999));
                    $phone = $d['phone'] ?? '';
                    $officeId = resolveOfficeId($pdo, $d['office_id'] ?? '');
                    $licenseNo = $d['license_no'] ?? '';
                    $licenseExpiry = $d['license_expiry'] ?? date('Y-m-d', strtotime('+3 years'));
                    $assignedVehId = resolveVehicleId($pdo, $d['assigned_vehicle_id'] ?? null);
                    $status = in_array($d['status'] ?? '', ['available', 'on_trip', 'off_duty', 'suspended']) ? $d['status'] : 'available';

                    $stmtFindU = $pdo->prepare("SELECT id, portal_user_id FROM users WHERE role = 'driver' AND LOWER(username) = LOWER(?) LIMIT 1");
                    $stmtFindU->execute([$empNo]);
                    $driverProfile = $stmtFindU->fetch();
                    $userId = $driverProfile ? (int)$driverProfile['id'] : null;
                    $driverPortalUserId = $driverProfile ? (int)$driverProfile['portal_user_id'] : null;
                    if (dtmsTextIsCorrupted((string)$fullName)) {
                        $fullName = dtmsCentralDisplayName($driverPortalUserId)
                            ?: dtmsFirstReadableText([$empNo], 'Driver');
                    }

                    $stmtD = $pdo->prepare("
                        INSERT INTO drivers (user_id, portal_user_id, full_name, employee_no, phone, office_id, license_no, license_expiry, assigned_vehicle_id, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            user_id = VALUES(user_id),
                            portal_user_id = VALUES(portal_user_id),
                            full_name = VALUES(full_name),
                            phone = VALUES(phone),
                            office_id = VALUES(office_id),
                            license_no = VALUES(license_no),
                            license_expiry = VALUES(license_expiry),
                            assigned_vehicle_id = VALUES(assigned_vehicle_id),
                            status = VALUES(status)
                    ");
                    $stmtD->execute([$userId, $driverPortalUserId, $fullName, $empNo, $phone, $officeId, $licenseNo, $licenseExpiry, $assignedVehId, $status]);
                }
            }
            jsonResponse(['status' => 'success', 'message' => 'تمت مزامنة السائقين بنجاح']);
        }

        if ($subAction === 'save' || $method === 'POST') {
            $id = $input['id'] ?? null;
            $fullName = $input['full_name'] ?? '';
            $empNo = $input['employee_no'] ?? ('EMP-' . rand(100, 999));
            $phone = $input['phone'] ?? '';
            $officeId = resolveOfficeId($pdo, $input['office_id'] ?? '');
            $licenseNo = $input['license_no'] ?? '';
            $licenseExpiry = $input['license_expiry'] ?? date('Y-m-d', strtotime('+3 years'));
            $assignedVehId = resolveVehicleId($pdo, $input['assigned_vehicle_id'] ?? null);
            $status = in_array($input['status'] ?? '', ['available', 'on_trip', 'off_duty', 'suspended']) ? $input['status'] : 'available';

            $requestedPortalUserId = (int)($input['portal_user_id'] ?? $input['user_id'] ?? 0);
            $stmtFindU = $pdo->prepare("SELECT id, portal_user_id FROM users WHERE role = 'driver' AND (portal_user_id = ? OR LOWER(username) = LOWER(?)) LIMIT 1");
            $stmtFindU->execute([$requestedPortalUserId, $empNo]);
            $driverProfile = $stmtFindU->fetch();
            $userId = $driverProfile ? (int)$driverProfile['id'] : null;
            $driverPortalUserId = $driverProfile ? (int)$driverProfile['portal_user_id'] : null;
            if (dtmsTextIsCorrupted((string)$fullName)) {
                $fullName = dtmsCentralDisplayName($driverPortalUserId)
                    ?: dtmsFirstReadableText([$empNo], 'Driver');
            }

            if (is_numeric($id) && intval($id) > 0) {
                $stmt = $pdo->prepare("
                    UPDATE drivers SET
                        user_id = ?,
                        portal_user_id = ?,
                        full_name = ?,
                        employee_no = ?,
                        phone = ?,
                        office_id = ?,
                        license_no = ?,
                        license_expiry = ?,
                        assigned_vehicle_id = ?,
                        status = ?
                    WHERE id = ?
                ");
                $stmt->execute([$userId, $driverPortalUserId, $fullName, $empNo, $phone, $officeId, $licenseNo, $licenseExpiry, $assignedVehId, $status, intval($id)]);
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO drivers (user_id, portal_user_id, full_name, employee_no, phone, office_id, license_no, license_expiry, assigned_vehicle_id, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        user_id = VALUES(user_id),
                        portal_user_id = VALUES(portal_user_id),
                        full_name = VALUES(full_name),
                        phone = VALUES(phone),
                        office_id = VALUES(office_id),
                        license_no = VALUES(license_no),
                        license_expiry = VALUES(license_expiry),
                        assigned_vehicle_id = VALUES(assigned_vehicle_id),
                        status = VALUES(status)
                ");
                $stmt->execute([$userId, $driverPortalUserId, $fullName, $empNo, $phone, $officeId, $licenseNo, $licenseExpiry, $assignedVehId, $status]);
            }
            jsonResponse(['status' => 'success', 'message' => 'تم حفظ بيانات السائق بنجاح في قاعدة البيانات']);
        }

        $driverSql = "SELECT d.*, u.username, o.name AS office_name FROM drivers d LEFT JOIN users u ON d.user_id = u.id LEFT JOIN offices o ON d.office_id = o.id";
        $driverParams = [];
        if ($portalUser['dtms_role'] === 'driver') {
            $driverSql .= " WHERE d.portal_user_id = ?";
            $driverParams[] = (int)$portalUser['id'];
        } elseif (in_array($portalUser['dtms_role'], ['supervisor', 'viewer'], true)) {
            $driverSql .= " WHERE EXISTS (SELECT 1 FROM users scope_user WHERE scope_user.portal_user_id = ? AND scope_user.office_id = d.office_id)";
            $driverParams[] = (int)$portalUser['id'];
        }
        $driverSql .= " ORDER BY d.id ASC";
        $stmt = $pdo->prepare($driverSql);
        $stmt->execute($driverParams);
        $drivers = $stmt->fetchAll();
        $repairDriverName = $pdo->prepare('UPDATE drivers SET full_name = ? WHERE id = ?');
        foreach ($drivers as &$moduleDriver) {
            if (!dtmsTextIsCorrupted((string)$moduleDriver['full_name'])) continue;
            $replacement = dtmsCentralDisplayName((int)$moduleDriver['portal_user_id']);
            if (!$replacement) $replacement = dtmsFirstReadableText([$moduleDriver['username'], $moduleDriver['employee_no']], 'Driver');
            $moduleDriver['full_name'] = $replacement;
            $repairDriverName->execute([$replacement, (int)$moduleDriver['id']]);
        }
        unset($moduleDriver);
        jsonResponse(['status' => 'success', 'data' => $drivers]);
        break;

    // ----------------------------------------------------
    // GOVERNORATES (المحافظات)
    // ----------------------------------------------------
    case 'governorates':
        $subAction = $action ?: ($method === 'DELETE' ? 'delete' : ($method === 'POST' ? 'save' : 'list'));
        if ($method !== 'GET' && $portalUser['dtms_role'] !== 'admin') {
            jsonResponse(['status' => 'error', 'message' => 'Administrator access is required.'], 403);
        }

        if ($subAction === 'delete' || $method === 'DELETE') {
            $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
            $find = $pdo->prepare("SELECT name_ar, name_en FROM governorates WHERE id = ?");
            $find->execute([$id]);
            $governorate = $find->fetch();
            if (!$governorate) jsonResponse(['status' => 'error', 'message' => 'Governorate not found.'], 404);

            $usage = $pdo->prepare("SELECT (SELECT COUNT(*) FROM trips WHERE governorate IN (?, ?) OR start_governorate_id = ?) + (SELECT COUNT(*) FROM offices WHERE governorate IN (?, ?)) + (SELECT COUNT(*) FROM trip_destinations WHERE governorate_id = ? OR governorate_name IN (?, ?))");
            $usage->execute([$governorate['name_ar'], $governorate['name_en'], $id, $governorate['name_ar'], $governorate['name_en'], $id, $governorate['name_ar'], $governorate['name_en']]);
            $usageCount = (int)$usage->fetchColumn();
            if ($usageCount > 0) {
                jsonResponse(['status' => 'error', 'message' => 'This governorate cannot be deleted because it is used by an office or trip.', 'usage_count' => $usageCount], 409);
            }
            $pdo->prepare("DELETE FROM governorates WHERE id = ?")->execute([$id]);
            jsonResponse(['status' => 'success', 'message' => 'Governorate deleted.']);
        }

        if ($subAction === 'save' || $method === 'POST') {
            $id = (int)($input['id'] ?? 0);
            $nameAr = trim((string)($input['name_ar'] ?? ''));
            $nameEn = trim((string)($input['name_en'] ?? ''));
            if ($nameAr === '' || $nameEn === '') {
                jsonResponse(['status' => 'error', 'message' => 'Arabic and English names are required.'], 422);
            }
            try {
                if ($id > 0) {
                    $find = $pdo->prepare("SELECT name_ar, name_en FROM governorates WHERE id = ?");
                    $find->execute([$id]);
                    $old = $find->fetch();
                    if (!$old) jsonResponse(['status' => 'error', 'message' => 'Governorate not found.'], 404);
                    $pdo->beginTransaction();
                    $pdo->prepare("UPDATE governorates SET name_ar = ?, name_en = ? WHERE id = ?")->execute([$nameAr, $nameEn, $id]);
                    $pdo->prepare("UPDATE offices SET governorate = ? WHERE governorate = ?")->execute([$nameAr, $old['name_ar']]);
                    $pdo->prepare("UPDATE offices SET governorate = ? WHERE governorate = ?")->execute([$nameEn, $old['name_en']]);
                    $pdo->prepare("UPDATE trips SET governorate = ? WHERE governorate = ?")->execute([$nameAr, $old['name_ar']]);
                    $pdo->prepare("UPDATE trips SET governorate = ? WHERE governorate = ?")->execute([$nameEn, $old['name_en']]);
                    $pdo->prepare("UPDATE trips SET start_point_name = ? WHERE start_governorate_id = ? AND start_point_name = ?")->execute([$nameAr, $id, $old['name_ar']]);
                    $pdo->prepare("UPDATE trips SET start_point_name = ? WHERE start_governorate_id = ? AND start_point_name = ?")->execute([$nameEn, $id, $old['name_en']]);
                    $pdo->prepare("UPDATE trip_destinations SET governorate_name = ? WHERE governorate_id = ? AND governorate_name = ?")->execute([$nameAr, $id, $old['name_ar']]);
                    $pdo->prepare("UPDATE trip_destinations SET governorate_name = ? WHERE governorate_id = ? AND governorate_name = ?")->execute([$nameEn, $id, $old['name_en']]);
                    $pdo->commit();
                } else {
                    $pdo->prepare("INSERT INTO governorates (name_ar, name_en) VALUES (?, ?)")->execute([$nameAr, $nameEn]);
                }
            } catch (PDOException $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                if ((string)$e->getCode() === '23000') {
                    jsonResponse(['status' => 'error', 'message' => 'A governorate with this name already exists.'], 409);
                }
                throw $e;
            }
            jsonResponse(['status' => 'success', 'message' => 'Governorate saved.']);
        }

        $stmt = $pdo->query("SELECT g.*, (SELECT COUNT(*) FROM trips t WHERE t.governorate IN (g.name_ar, g.name_en) OR t.start_governorate_id = g.id) + (SELECT COUNT(*) FROM offices o WHERE o.governorate IN (g.name_ar, g.name_en)) + (SELECT COUNT(*) FROM trip_destinations td WHERE td.governorate_id = g.id OR td.governorate_name IN (g.name_ar, g.name_en)) AS usage_count FROM governorates g ORDER BY name_en ASC");
        jsonResponse(['status' => 'success', 'data' => $stmt->fetchAll()]);
        break;

    // ----------------------------------------------------
    // OFFICES (المكاتب والفروع)
    // ----------------------------------------------------
    case 'offices':
        $subAction = $action ?: ($method === 'DELETE' ? 'delete' : ($method === 'POST' ? 'save' : 'list'));
        if ($subAction === 'delete' || $method === 'DELETE') {
            $id = $input['id'] ?? $_GET['id'] ?? 0;
            $stmt = $pdo->prepare("DELETE FROM offices WHERE id = ?");
            $stmt->execute([intval($id)]);
            jsonResponse(['status' => 'success', 'message' => 'تم حذف المكتب بنجاح من قاعدة البيانات']);
        }

        if ($subAction === 'save' || $method === 'POST') {
            $id = $input['id'] ?? null;
            $code = trim($input['code'] ?? ('OFF-' . rand(10, 99)));
            $name = trim($input['name'] ?? '');
            $nameEn = trim($input['name_en'] ?? '');
            $governorate = trim($input['governorate'] ?? '');
            $governorateEn = trim($input['governorate_en'] ?? '');
            $address = trim($input['address'] ?? '');
            $phone = trim($input['phone'] ?? '');
            $status = ($input['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active';

            if (is_numeric($id) && intval($id) > 0) {
                $stmt = $pdo->prepare("UPDATE offices SET code = ?, name = ?, name_en = ?, governorate = ?, governorate_en = ?, address = ?, phone = ?, status = ? WHERE id = ?");
                $stmt->execute([$code, $name, $nameEn, $governorate, $governorateEn, $address, $phone, $status, intval($id)]);
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO offices (code, name, name_en, governorate, governorate_en, address, phone, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        name = VALUES(name),
                        name_en = VALUES(name_en),
                        governorate = VALUES(governorate),
                        governorate_en = VALUES(governorate_en),
                        address = VALUES(address),
                        phone = VALUES(phone),
                        status = VALUES(status)
                ");
                $stmt->execute([$code, $name, $nameEn, $governorate, $governorateEn, $address, $phone, $status]);
            }
            jsonResponse(['status' => 'success', 'message' => 'تم حفظ بيانات المكتب بنجاح']);
        }

        $stmt = $pdo->query("SELECT id, code, name, name_en, governorate, governorate_en, address, phone, status, created_at FROM offices ORDER BY id ASC");
        jsonResponse(['status' => 'success', 'data' => $stmt->fetchAll()]);
        break;

    // ----------------------------------------------------
    // TRIPS (الرحلات)
    // ----------------------------------------------------
    case 'trips':
        $subAction = $action ?: ($method === 'DELETE' ? 'delete' : ($method === 'POST' ? 'save' : 'list'));

        if ($subAction === 'update_destinations' && $method === 'POST') {
            $tripId = (int)($input['trip_id'] ?? 0);
            $submitted = is_array($input['destinations'] ?? null) ? $input['destinations'] : [];
            if ($tripId <= 0 || !$submitted) {
                jsonResponse(['status' => 'error', 'message' => 'Trip and at least one destination are required.'], 422);
            }
            if (!in_array($portalUser['dtms_role'], ['admin', 'supervisor', 'security'], true)) {
                jsonResponse(['status' => 'error', 'message' => 'Only a supervisor can edit trip destinations.'], 403);
            }

            $tripStmt = $pdo->prepare("SELECT t.*, o.governorate AS office_governorate FROM trips t JOIN offices o ON o.id = t.office_id WHERE t.id = ? LIMIT 1");
            $tripStmt->execute([$tripId]);
            $trip = $tripStmt->fetch();
            if (!$trip) jsonResponse(['status' => 'error', 'message' => 'Trip not found.'], 404);
            if (!in_array($trip['status'], ['new', 'in_progress'], true) || !empty($trip['arrival_date']) || !empty($trip['actual_return_time'])) {
                jsonResponse(['status' => 'error', 'message' => 'Destinations can only be edited before the trip ends.'], 409);
            }
            if ($portalUser['dtms_role'] === 'supervisor') {
                $officeStmt = $pdo->prepare("SELECT office_id FROM users WHERE portal_user_id = ? LIMIT 1");
                $officeStmt->execute([(int)$portalUser['id']]);
                $supervisorOfficeId = (int)($officeStmt->fetchColumn() ?: 0);
                if ($supervisorOfficeId <= 0 || $supervisorOfficeId !== (int)$trip['office_id']) {
                    jsonResponse(['status' => 'error', 'message' => 'This trip is outside your assigned office.'], 403);
                }
            }

            $driverGovernorate = resolveGovernorate($pdo, null, $trip['office_governorate']);
            if (!$driverGovernorate) jsonResponse(['status' => 'error', 'message' => 'The trip office does not have a valid governorate.'], 422);

            $pdo->beginTransaction();
            try {
                $existingStmt = $pdo->prepare("SELECT * FROM trip_destinations WHERE trip_id = ? ORDER BY sort_order, id FOR UPDATE");
                $existingStmt->execute([$tripId]);
                $existingRows = $existingStmt->fetchAll();
                $existingByKey = [];
                foreach ($existingRows as $row) $existingByKey[(string)$row['client_key']] = $row;

                $resolved = [];
                $submittedKeys = [];
                foreach ($submitted as $index => $destination) {
                    $key = trim((string)($destination['id'] ?? ''));
                    if ($key === '') $key = 'destination-' . bin2hex(random_bytes(8));
                    if (isset($submittedKeys[$key])) throw new DomainException('Duplicate destination identifier.');
                    $submittedKeys[$key] = true;

                    $existing = $existingByKey[$key] ?? null;
                    if ($existing && !empty($existing['completed'])) {
                        foreach (['destination', 'visit_location', 'purpose'] as $field) {
                            if (trim((string)($destination[$field] ?? '')) !== trim((string)$existing[$field])) {
                                throw new DomainException('Completed destinations cannot be changed.');
                            }
                        }
                        $resolved[] = $existing;
                        continue;
                    }

                    $destinationName = trim((string)($destination['destination'] ?? ''));
                    $purpose = trim((string)($destination['purpose'] ?? ''));
                    if ($destinationName === '' || $purpose === '') throw new DomainException('Every destination requires a destination and purpose.');
                    $governorate = $trip['trip_type'] === 'internal'
                        ? $driverGovernorate
                        : resolveGovernorate($pdo, $destination['governorate_id'] ?? null, $destination['governorate_name'] ?? '');
                    if (!$governorate) throw new DomainException('Every destination must have a valid governorate.');
                    $resolved[] = [
                        'client_key' => $key,
                        'governorate_id' => (int)$governorate['id'],
                        'governorate_name' => (string)$governorate['name_ar'],
                        'destination' => $destinationName,
                        'visit_location' => trim((string)($destination['visit_location'] ?? '')),
                        'purpose' => $purpose,
                        'completed' => 0,
                        'completed_at' => null,
                        'completed_by' => null,
                    ];
                }
                foreach ($existingRows as $existing) {
                    if (!empty($existing['completed']) && empty($submittedKeys[(string)$existing['client_key']])) {
                        throw new DomainException('Completed destinations cannot be deleted.');
                    }
                }
                if (!$resolved) throw new DomainException('At least one destination is required.');

                $upsert = $pdo->prepare("INSERT INTO trip_destinations (trip_id, client_key, governorate_id, governorate_name, destination, visit_location, purpose, sort_order, completed, completed_at, completed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE governorate_id=VALUES(governorate_id), governorate_name=VALUES(governorate_name), destination=VALUES(destination), visit_location=VALUES(visit_location), purpose=VALUES(purpose), sort_order=VALUES(sort_order)");
                $keys = [];
                foreach ($resolved as $index => $destination) {
                    $key = (string)($destination['client_key'] ?? $destination['id']);
                    $keys[] = $key;
                    $upsert->execute([$tripId, $key, $destination['governorate_id'], $destination['governorate_name'], $destination['destination'], $destination['visit_location'], $destination['purpose'], $index, !empty($destination['completed']) ? 1 : 0, $destination['completed_at'] ?? null, $destination['completed_by'] ?? null]);
                }
                $placeholders = implode(',', array_fill(0, count($keys), '?'));
                $pdo->prepare("DELETE FROM trip_destinations WHERE trip_id = ? AND completed = 0 AND client_key NOT IN ($placeholders)")->execute(array_merge([$tripId], $keys));

                $destinationText = implode('، ', array_column($resolved, 'destination'));
                $visitText = implode('، ', array_column($resolved, 'visit_location'));
                $purposeText = implode(' | ', array_column($resolved, 'purpose'));
                $pdo->prepare("UPDATE trips SET destination = ?, visit_location = ?, purpose = ?, governorate = ? WHERE id = ?")->execute([$destinationText, $visitText, $purposeText, $resolved[0]['governorate_name'], $tripId]);
                $pdo->commit();
            } catch (Throwable $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                if (!($e instanceof DomainException)) error_log('DTMS destination update failed: ' . $e->getMessage());
                jsonResponse([
                    'status' => 'error',
                    'message' => $e instanceof DomainException || DTMS_ENV !== 'production'
                        ? $e->getMessage()
                        : 'Unable to update trip destinations.'
                ], $e instanceof DomainException ? 409 : 500);
            }

            $resultStmt = $pdo->prepare("SELECT client_key AS id, governorate_id, governorate_name, destination, visit_location, purpose, completed, completed_at, completed_by FROM trip_destinations WHERE trip_id = ? ORDER BY sort_order, id");
            $resultStmt->execute([$tripId]);
            jsonResponse(['status' => 'success', 'message' => 'Trip destinations updated.', 'data' => $resultStmt->fetchAll()]);
        }

        if ($subAction === 'complete_destination' && $method === 'POST') {
            $tripId = (int)($input['trip_id'] ?? 0);
            $destinationKey = trim((string)($input['destination_id'] ?? ''));
            if ($tripId <= 0 || $destinationKey === '') {
                jsonResponse(['status' => 'error', 'message' => 'Trip and destination are required.'], 400);
            }

            if (empty($portalUser['is_portal_admin'])) {
                $owner = $pdo->prepare("
                    SELECT 1
                    FROM trips t
                    JOIN drivers d ON d.id = t.driver_id
                    WHERE t.id = ?
                      AND t.status = 'in_progress'
                      AND d.portal_user_id = ?
                    LIMIT 1
                ");
                $owner->execute([$tripId, (int)$portalUser['id']]);
                if (!$owner->fetchColumn()) {
                    jsonResponse(['status' => 'error', 'message' => 'Only the assigned driver can complete this destination.'], 403);
                }
            }

            $completedAt = date('Y-m-d H:i:s');
            $completedBy = (string)($portalUser['username'] ?? '');
            $stmt = $pdo->prepare("
                UPDATE trip_destinations td
                JOIN trips t ON t.id = td.trip_id
                SET td.completed = 1, td.completed_at = ?, td.completed_by = ?
                WHERE td.trip_id = ? AND td.client_key = ? AND t.status = 'in_progress'
            ");
            $stmt->execute([$completedAt, $completedBy, $tripId, $destinationKey]);
            if ($stmt->rowCount() < 1) {
                jsonResponse(['status' => 'error', 'message' => 'Destination was not found or the trip is not active.'], 409);
            }

            jsonResponse([
                'status' => 'success',
                'message' => 'Destination completed.',
                'completed_at' => $completedAt,
                'completed_by' => $completedBy,
            ]);
        }

        if ($subAction === 'revise_odometer' && $method === 'POST') {
            $tripId = (int)($input['trip_id'] ?? 0);
            $unitStmt = $pdo->prepare("
                SELECT COALESCE(
                    (SELECT reading_unit FROM odometer_records WHERE trip_id = t.id AND type = 'start' ORDER BY id DESC LIMIT 1),
                    v.odometer_unit,
                    'km'
                )
                FROM trips t
                JOIN vehicles v ON v.id = t.vehicle_id
                WHERE t.id = ?
                LIMIT 1
            ");
            $unitStmt->execute([$tripId]);
            $readingUnit = normalizeOdometerUnit($unitStmt->fetchColumn() ?: 'km');
            $startDisplayReading = round((float)($input['display_start_reading'] ?? $input['start_reading'] ?? 0), 1);
            $endDisplayReading = round((float)($input['display_end_reading'] ?? $input['end_reading'] ?? 0), 1);
            $hasDisplayReadings = array_key_exists('display_start_reading', $input) && array_key_exists('display_end_reading', $input);
            $startReading = $hasDisplayReadings ? odometerReadingToKm($startDisplayReading, $readingUnit) : round((float)($input['start_reading'] ?? 0), 1);
            $endReading = $hasDisplayReadings ? odometerReadingToKm($endDisplayReading, $readingUnit) : round((float)($input['end_reading'] ?? 0), 1);
            if ($tripId <= 0 || $startReading <= 0 || $endReading <= 0) {
                jsonResponse(['status' => 'error', 'message' => 'Trip and corrected start/end readings are required.'], 400);
            }
            if ($endReading < $startReading) {
                jsonResponse(['status' => 'error', 'message' => 'The ending odometer cannot be lower than the starting odometer.'], 422);
            }

            $isSupervisorCorrection = in_array($portalUser['dtms_role'], ['admin', 'supervisor', 'security'], true);
            if (!$isSupervisorCorrection) {
                $owner = $pdo->prepare("
                    SELECT 1
                    FROM trips t
                    JOIN drivers d ON d.id = t.driver_id
                    WHERE t.id = ?
                      AND t.status = 'revision_requested'
                      AND d.portal_user_id = ?
                    LIMIT 1
                ");
                $owner->execute([$tripId, (int)$portalUser['id']]);
                if (!$owner->fetchColumn()) {
                    jsonResponse(['status' => 'error', 'message' => 'Only the assigned driver can revise this trip.'], 403);
                }
            } else {
                $tripAccess = $pdo->prepare("SELECT office_id, status FROM trips WHERE id = ? LIMIT 1");
                $tripAccess->execute([$tripId]);
                $tripAccessRow = $tripAccess->fetch();
                if (!$tripAccessRow || !in_array($tripAccessRow['status'], ['pending_approval', 'revision_requested'], true)) {
                    jsonResponse(['status' => 'error', 'message' => 'Odometer readings can only be corrected while the trip is awaiting review.'], 409);
                }
                if ($portalUser['dtms_role'] === 'supervisor') {
                    $officeStmt = $pdo->prepare("SELECT office_id FROM users WHERE portal_user_id = ? LIMIT 1");
                    $officeStmt->execute([(int)$portalUser['id']]);
                    if ((int)($officeStmt->fetchColumn() ?: 0) !== (int)$tripAccessRow['office_id']) {
                        jsonResponse(['status' => 'error', 'message' => 'This trip is outside your assigned office.'], 403);
                    }
                }
            }

            $distanceOdometer = $endReading - $startReading;
            $distanceGps = max(0, (float)($input['distance_gps'] ?? 0));
            $distanceDiff = abs($distanceOdometer - $distanceGps);
            $diffStatus = (string)($input['diff_status'] ?? 'normal');
            if (!in_array($diffStatus, ['normal', 'review_needed', 'alert'], true)) $diffStatus = 'normal';

            $pdo->beginTransaction();
            try {
                $findStart = $pdo->prepare("SELECT id FROM odometer_records WHERE trip_id = ? AND type = 'start' ORDER BY id DESC LIMIT 1");
                $findStart->execute([$tripId]);
                $startRecordId = $findStart->fetchColumn();
                $findEnd = $pdo->prepare("SELECT id FROM odometer_records WHERE trip_id = ? AND type = 'end' ORDER BY id DESC LIMIT 1");
                $findEnd->execute([$tripId]);
                $endRecordId = $findEnd->fetchColumn();
                if (!$startRecordId || !$endRecordId) {
                    throw new DomainException('The original odometer evidence could not be found.');
                }

                $allowedStatusSql = $isSupervisorCorrection
                    ? "status IN ('pending_approval', 'revision_requested')"
                    : "status = 'revision_requested'";
                $updateTrip = $pdo->prepare("
                    UPDATE trips
                    SET status = 'pending_approval', distance_odometer = ?, distance_diff = ?, diff_status = ?, driver_notes = ?
                    WHERE id = ? AND {$allowedStatusSql}
                ");
                $updateTrip->execute([
                    $distanceOdometer,
                    $distanceDiff,
                    $diffStatus,
                    trim((string)($input['driver_notes'] ?? '')),
                    $tripId,
                ]);
                if ($updateTrip->rowCount() < 1 && !$isSupervisorCorrection) {
                    throw new DomainException('Trip is no longer awaiting revision.');
                }

                // Preserve the original Azure OCR result as immutable evidence.
                $updateRecord = $pdo->prepare("UPDATE odometer_records SET reading = ?, display_reading = ?, reading_unit = ?, manual_override = 1 WHERE id = ?");
                $updateRecord->execute([$startReading, $startDisplayReading, $readingUnit, $startRecordId]);
                $updateRecord->execute([$endReading, $endDisplayReading, $readingUnit, $endRecordId]);

                $audit = $pdo->prepare("
                    INSERT INTO audit_logs (user_name, user_role, ip_address, action_type, description, entity, entity_id, `timestamp`)
                    VALUES (?, ?, ?, 'odometer_correction', ?, 'trips', ?, NOW())
                ");
                $audit->execute([
                    (string)($portalUser['username'] ?? 'system'),
                    (string)$portalUser['dtms_role'],
                    (string)($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'),
                    "Corrected odometer readings to {$startReading} / {$endReading}",
                    (string)$tripId,
                ]);

                $pdo->commit();
            } catch (Throwable $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                if (!($e instanceof DomainException)) error_log('DTMS odometer correction failed: ' . $e->getMessage());
                jsonResponse([
                    'status' => 'error',
                    'message' => $e instanceof DomainException || DTMS_ENV !== 'production'
                        ? $e->getMessage()
                        : 'Unable to correct the odometer evidence.'
                ], $e instanceof DomainException ? 409 : 500);
            }

            jsonResponse([
                'status' => 'success',
                'message' => 'Corrected odometer submitted for approval.',
                'distance_odometer' => $distanceOdometer,
                'distance_diff' => $distanceDiff,
                'diff_status' => $diffStatus,
            ]);
        }

        if ($subAction === 'delete' || $method === 'DELETE') {
            $id = $input['id'] ?? $_GET['id'] ?? 0;
            if (!in_array($portalUser['dtms_role'], ['admin', 'supervisor', 'security'], true)) {
                jsonResponse(['status' => 'error', 'message' => 'You are not allowed to delete trips.'], 403);
            }
            if ($portalUser['dtms_role'] === 'supervisor') {
                $access = $pdo->prepare("SELECT 1 FROM trips t JOIN users u ON u.portal_user_id = ? WHERE (t.id = ? OR t.trip_no = ?) AND t.office_id = u.office_id AND t.status = 'new' LIMIT 1");
                $access->execute([(int)$portalUser['id'], (int)$id, (string)$id]);
                if (!$access->fetchColumn()) {
                    jsonResponse(['status' => 'error', 'message' => 'Supervisors can only delete new trips from their assigned office.'], 403);
                }
            }
            $stmt = $pdo->prepare("DELETE FROM trips WHERE (id = ? OR trip_no = ?) AND status = 'new'");
            $stmt->execute([intval($id), strval($id)]);
            if ($stmt->rowCount() === 0) {
                jsonResponse(['status' => 'error', 'message' => 'Only a new, unstarted trip can be deleted.'], 409);
            }
            jsonResponse(['status' => 'success', 'message' => 'تم حذف الرحلة بنجاح']);
        }

        if ($subAction === 'save' || $method === 'POST') {
            try {
                $id = $input['id'] ?? null;
                $driverId = resolveDriverId($pdo, $input['driver_id'] ?? null);
                $vehicleId = resolveVehicleId($pdo, $input['vehicle_id'] ?? null);

                if (is_numeric($id) && intval($id) > 0) {
                    $accessStmt = $pdo->prepare("SELECT t.office_id, t.driver_id, t.vehicle_id, t.status, t.record_type, d.portal_user_id FROM trips t JOIN drivers d ON d.id = t.driver_id WHERE t.id = ? LIMIT 1");
                    $accessStmt->execute([(int)$id]);
                    $tripAccess = $accessStmt->fetch();
                    if (!$tripAccess) jsonResponse(['status' => 'error', 'message' => 'Trip not found.'], 404);
                    $currentStatus = (string)$tripAccess['status'];
                    $requestedStatus = (string)($input['status'] ?? $currentStatus);
                    if ($portalUser['dtms_role'] === 'driver') {
                        if ((int)$tripAccess['portal_user_id'] !== (int)$portalUser['id']) {
                            jsonResponse(['status' => 'error', 'message' => 'Drivers can only update their own trips.'], 403);
                        }
                        $driverTransitions = [
                            'new' => ['new', 'in_progress'],
                            'in_progress' => ['in_progress', 'pending_approval'],
                            'revision_requested' => ['revision_requested', 'pending_approval'],
                            'pending_approval' => ['pending_approval'],
                        ];
                        if (!in_array($requestedStatus, $driverTransitions[$currentStatus] ?? [], true)) {
                            jsonResponse(['status' => 'error', 'message' => 'Invalid trip status transition for the assigned driver.'], 409);
                        }
                    } elseif ($portalUser['dtms_role'] === 'supervisor') {
                        $officeStmt = $pdo->prepare("SELECT office_id FROM users WHERE portal_user_id = ? LIMIT 1");
                        $officeStmt->execute([(int)$portalUser['id']]);
                        if ((int)($officeStmt->fetchColumn() ?: 0) !== (int)$tripAccess['office_id']) {
                            jsonResponse(['status' => 'error', 'message' => 'This trip is outside your assigned office.'], 403);
                        }
                    }

                    if (in_array($portalUser['dtms_role'], ['admin', 'supervisor', 'security'], true)) {
                        $reviewTransitions = [
                            'new' => ['new'],
                            'in_progress' => ['in_progress'],
                            'pending_approval' => ['pending_approval', 'approved', 'revision_requested', 'rejected'],
                            'revision_requested' => ['revision_requested'],
                            'approved' => ['approved'],
                            'rejected' => ['rejected'],
                        ];
                        if (!in_array($requestedStatus, $reviewTransitions[$currentStatus] ?? [], true)) {
                            jsonResponse(['status' => 'error', 'message' => 'Invalid trip lifecycle transition.'], 409);
                        }
                    }

                    if ($currentStatus !== $requestedStatus && $requestedStatus === 'in_progress') {
                        $activeTrip = $pdo->prepare("
                            SELECT trip_no
                            FROM trips
                            WHERE id <> ?
                              AND status = 'in_progress'
                              AND (driver_id = ? OR vehicle_id = ?)
                            LIMIT 1
                        ");
                        $activeTrip->execute([(int)$id, (int)$tripAccess['driver_id'], (int)$tripAccess['vehicle_id']]);
                        if ($activeTripNo = $activeTrip->fetchColumn()) {
                            jsonResponse(['status' => 'error', 'message' => 'End active trip ' . $activeTripNo . ' before starting another trip.'], 409);
                        }
                        $startEvidence = $pdo->prepare("SELECT 1 FROM odometer_records WHERE trip_id = ? AND type = 'start' LIMIT 1");
                        $startEvidence->execute([(int)$id]);
                        if (!$startEvidence->fetchColumn() || empty($input['departure_date']) || empty($input['departure_time'])) {
                            jsonResponse(['status' => 'error', 'message' => 'A start odometer record and actual departure time are required.'], 422);
                        }
                    }
                    if ($currentStatus !== $requestedStatus && $requestedStatus === 'pending_approval') {
                        $endEvidence = $pdo->prepare("SELECT 1 FROM odometer_records WHERE trip_id = ? AND type = 'end' LIMIT 1");
                        $endEvidence->execute([(int)$id]);
                        if (!$endEvidence->fetchColumn() || empty($input['arrival_date']) || empty($input['arrival_time'])) {
                            jsonResponse(['status' => 'error', 'message' => 'An end odometer record and actual arrival time are required.'], 422);
                        }
                        if (($tripAccess['record_type'] ?? 'trip') === 'work_session') {
                            $internalCount = filter_var($input['internal_trip_count'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
                            $externalCount = filter_var($input['external_trip_count'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
                            $routes = is_array($input['work_session_routes'] ?? null) ? $input['work_session_routes'] : [];
                            if ($internalCount === false || $externalCount === false || count($routes) !== $externalCount) {
                                jsonResponse(['status' => 'error', 'message' => 'Enter valid trip counts and one route for every external trip.'], 422);
                            }
                        }
                    }
                }

                // Fallbacks if tables have records
                if (!$vehicleId) {
                    $firstV = $pdo->query("SELECT id FROM vehicles ORDER BY id ASC LIMIT 1")->fetchColumn();
                    $vehicleId = $firstV ? intval($firstV) : 1;
                }
                if (!$driverId) {
                    $firstD = $pdo->query("SELECT id FROM drivers ORDER BY id ASC LIMIT 1")->fetchColumn();
                    $driverId = $firstD ? intval($firstD) : 1;
                }

                $driverContextStmt = $pdo->prepare("
                    SELECT d.office_id, d.user_id, o.name AS office_name, o.governorate AS office_governorate
                    FROM drivers d
                    JOIN offices o ON o.id = d.office_id
                    WHERE d.id = ?
                    LIMIT 1
                ");
                $driverContextStmt->execute([$driverId]);
                $driverContext = $driverContextStmt->fetch();
                if (!$driverContext) {
                    jsonResponse(['status' => 'error', 'message' => 'The selected driver does not have a valid responsible office.'], 422);
                }
                $officeId = (int)$driverContext['office_id'];
                if (!(is_numeric($id) && intval($id) > 0) && $portalUser['dtms_role'] === 'supervisor') {
                    $officeStmt = $pdo->prepare("SELECT office_id FROM users WHERE portal_user_id = ? LIMIT 1");
                    $officeStmt->execute([(int)$portalUser['id']]);
                    if ((int)($officeStmt->fetchColumn() ?: 0) !== $officeId) {
                        jsonResponse(['status' => 'error', 'message' => 'Supervisors can only create trips for drivers in their assigned office.'], 403);
                    }
                }
                if (!(is_numeric($id) && intval($id) > 0)) {
                    $vehicleAssignmentStmt = $pdo->prepare("
                        SELECT 1
                        FROM vehicles v
                        LEFT JOIN drivers d ON d.id = ?
                        WHERE v.id = ? AND (
                            d.assigned_vehicle_id = v.id OR EXISTS (
                                SELECT 1 FROM vehicle_assignments va
                                WHERE va.driver_id = ? AND va.vehicle_id = v.id AND va.status = 'active'
                            )
                        )
                        LIMIT 1
                    ");
                    $vehicleAssignmentStmt->execute([$driverId, $vehicleId, $driverId]);
                    if (!$vehicleAssignmentStmt->fetchColumn()) {
                        jsonResponse(['status' => 'error', 'message' => 'The selected vehicle is not assigned to this driver.'], 422);
                    }
                }

                $savedTripId = null;
                if (is_numeric($id) && intval($id) > 0) {
                    // Update existing trip
                    $fields = [];
                    $params = [];
                    $allowed = [
                        'status', 'actual_departure_time', 'actual_return_time',
                        'departure_date', 'departure_time', 'arrival_date', 'arrival_time',
                        'distance_gps', 'distance_odometer', 'distance_diff', 'diff_status',
                        'supervisor_notes', 'driver_notes', 'approval_notes', 'approved_by', 'approved_at',
                        'departure_lat', 'departure_lng', 'departure_location_name',
                        'arrival_lat', 'arrival_lng', 'arrival_location_name'
                    ];
                    if ($portalUser['dtms_role'] === 'driver') {
                        $allowed = [
                            'status', 'actual_departure_time', 'actual_return_time',
                            'departure_date', 'departure_time', 'arrival_date', 'arrival_time',
                            'distance_gps', 'distance_odometer', 'distance_diff', 'diff_status',
                            'driver_notes', 'departure_lat', 'departure_lng', 'departure_location_name',
                            'internal_trip_count', 'external_trip_count', 'passenger_names',
                            'arrival_lat', 'arrival_lng', 'arrival_location_name'
                        ];
                    } elseif (in_array($portalUser['dtms_role'], ['admin', 'supervisor', 'security'], true)) {
                        $allowed = [
                            'status', 'distance_odometer', 'distance_diff', 'diff_status',
                            'supervisor_notes', 'approval_notes', 'approved_by', 'approved_at'
                        ];
                        if (($input['status'] ?? '') === 'approved') {
                            $input['approved_by'] = (string)($portalUser['username'] ?? 'system');
                            $input['approved_at'] = date('Y-m-d H:i:s');
                        }
                    }
                    foreach ($allowed as $f) {
                        if (array_key_exists($f, $input)) {
                            $fields[] = "`$f` = ?";
                            $params[] = $input[$f];
                        }
                    }
                    if (!empty($fields)) {
                        $params[] = intval($id);
                        $stmt = $pdo->prepare("UPDATE trips SET " . implode(', ', $fields) . " WHERE id = ?");
                        $stmt->execute($params);
                    }
                    $savedTripId = (int)$id;
                    if ($currentStatus !== $requestedStatus && in_array($requestedStatus, ['approved', 'rejected'], true)) {
                        $releaseVehicle = $pdo->prepare("
                            UPDATE vehicles v
                            JOIN trips t ON t.vehicle_id = v.id
                            SET v.status = 'available'
                            WHERE t.id = ?
                              AND NOT EXISTS (
                                  SELECT 1 FROM trips active_trip
                                  WHERE active_trip.vehicle_id = v.id
                                    AND active_trip.id <> t.id
                                    AND active_trip.status = 'in_progress'
                              )
                        ");
                        $releaseVehicle->execute([(int)$id]);
                    }
                    if ($currentStatus !== $requestedStatus) {
                        $tripRecipient = $pdo->prepare('SELECT d.user_id, t.trip_no, t.office_id, t.record_type FROM trips t JOIN drivers d ON d.id = t.driver_id WHERE t.id = ? LIMIT 1');
                        $tripRecipient->execute([(int)$id]);
                        $recipient = $tripRecipient->fetch();
                        if ($recipient && in_array($requestedStatus, ['approved', 'revision_requested', 'rejected'], true)) {
                            $isWorkSession = ($recipient['record_type'] ?? 'trip') === 'work_session';
                            $titles = $isWorkSession
                                ? [
                                    'approved' => ['تم اعتماد وتأييد سجل العمل', 'Work session approved and endorsed'],
                                    'revision_requested' => ['مطلوب تصحيح سجل العمل', 'Work session correction required'],
                                    'rejected' => ['تم رفض سجل العمل', 'Work session rejected'],
                                ]
                                : [
                                    'approved' => ['تم اعتماد وتأييد الرحلة', 'Trip approved and endorsed'],
                                    'revision_requested' => ['مطلوب مراجعة للرحلة', 'Trip revision required'],
                                    'rejected' => ['تم رفض الرحلة', 'Trip rejected'],
                                ];
                            createDtmsNotification(
                                $pdo,
                                (int)$recipient['user_id'],
                                $titles[$requestedStatus][0],
                                $titles[$requestedStatus][1],
                                ($isWorkSession ? 'تم تحديث حالة سجل العمل ' : 'تم تحديث حالة الرحلة ') . $recipient['trip_no'] . ' من قبل المشرف.',
                                ($isWorkSession ? 'Work session ' : 'Trip ') . $recipient['trip_no'] . ' was updated by the supervisor.',
                                'approval',
                                (int)$id
                            );
                        }
                        if ($recipient && $requestedStatus === 'pending_approval') {
                            $isWorkSession = ($recipient['record_type'] ?? 'trip') === 'work_session';
                            $reviewers = $pdo->prepare("SELECT id FROM users WHERE status = 'active' AND (role = 'security' OR (role IN ('admin','supervisor') AND office_id = ?))");
                            $reviewers->execute([(int)$recipient['office_id']]);
                            foreach ($reviewers->fetchAll(PDO::FETCH_COLUMN) as $reviewerId) {
                                createDtmsNotification(
                                    $pdo,
                                    (int)$reviewerId,
                                    $isWorkSession ? 'سجل عمل مكتمل بانتظار التأييد' : 'رحلة مكتملة بانتظار التأييد',
                                    $isWorkSession ? 'Completed work session awaiting endorsement' : 'Completed trip awaiting endorsement',
                                    ($isWorkSession ? 'أنهى السائق سجل العمل ' : 'أكمل السائق الرحلة ') . $recipient['trip_no'] . ' وهو بانتظار المراجعة.',
                                    ($isWorkSession ? 'The driver completed work session ' : 'The driver completed trip ') . $recipient['trip_no'] . ' and it is awaiting review.',
                                    'trip_completed',
                                    (int)$id
                                );
                            }
                        }
                    }
                } else {
                    // Create new trip
                    $tripNo = $input['trip_no'] ?? ('TRIP-' . date('Y') . '-' . str_pad(mt_rand(100, 99999), 5, '0', STR_PAD_LEFT));
                    $tripType = ($input['trip_type'] ?? 'internal') === 'external' ? 'external' : 'internal';
                    $recordType = ($input['record_type'] ?? 'trip') === 'work_session' ? 'work_session' : 'trip';
                    if ($portalUser['dtms_role'] === 'driver') {
                        $ownerStmt = $pdo->prepare("SELECT COALESCE(u.driver_mode, 'simple') FROM drivers d JOIN users u ON u.portal_user_id = d.portal_user_id WHERE d.id = ? AND d.portal_user_id = ? LIMIT 1");
                        $ownerStmt->execute([$driverId, (int)$portalUser['id']]);
                        $driverMode = $ownerStmt->fetchColumn();
                        if ($driverMode === false) jsonResponse(['status' => 'error', 'message' => 'Drivers can only create records for themselves.'], 403);
                        if (($driverMode === 'simple') !== ($recordType === 'work_session')) {
                            jsonResponse(['status' => 'error', 'message' => 'This record does not match the driver interface mode.'], 409);
                        }
                        $tripType = 'internal';
                        $input['start_point_type'] = 'office_branch';
                        $input['status'] = 'new';
                        $input['created_by'] = (string)$portalUser['username'];
                    }
                    $driverGovernorate = resolveGovernorate($pdo, null, $driverContext['office_governorate']);
                    if (!$driverGovernorate) {
                        jsonResponse(['status' => 'error', 'message' => 'The selected office does not have a governorate.'], 422);
                    }
                    $startPointType = (string)($input['start_point_type'] ?? 'office_branch');
                    $allowedStartTypes = $tripType === 'external'
                        ? ['driver_governorate', 'office_branch', 'governorate']
                        : ['driver_governorate', 'office_branch'];
                    if (!in_array($startPointType, $allowedStartTypes, true)) {
                        jsonResponse(['status' => 'error', 'message' => 'Invalid starting point type for this trip.'], 422);
                    }

                    $startGovernorate = $driverGovernorate;
                    $startOfficeId = null;
                    $startPointName = (string)$driverGovernorate['name_ar'];
                    if ($startPointType === 'office_branch') {
                        $startOfficeId = $officeId;
                        $startPointName = (string)$driverContext['office_name'];
                    } elseif ($startPointType === 'governorate') {
                        $startGovernorate = resolveGovernorate($pdo, $input['start_governorate_id'] ?? null, $input['start_point_name'] ?? '');
                        if (!$startGovernorate) {
                            jsonResponse(['status' => 'error', 'message' => 'Select a valid starting governorate.'], 422);
                        }
                        $submittedStartName = trim((string)($input['start_point_name'] ?? ''));
                        $startPointName = $submittedStartName === $startGovernorate['name_en'] ? $startGovernorate['name_en'] : $startGovernorate['name_ar'];
                    }

                    $destinationsInput = is_array($input['destinations'] ?? null) ? $input['destinations'] : [];
                    if (!$destinationsInput && $recordType !== 'work_session') {
                        jsonResponse(['status' => 'error', 'message' => 'Add at least one destination.'], 422);
                    }
                    $resolvedDestinations = [];
                    foreach ($destinationsInput as $index => $destination) {
                        if (trim((string)($destination['destination'] ?? '')) === '') continue;
                        $destinationGovernorate = $tripType === 'internal'
                            ? $driverGovernorate
                            : resolveGovernorate($pdo, $destination['governorate_id'] ?? null, $destination['governorate_name'] ?? '');
                        if (!$destinationGovernorate) {
                            jsonResponse(['status' => 'error', 'message' => 'Every external destination must have a valid governorate.'], 422);
                        }
                        if ($tripType === 'internal' && (int)$destinationGovernorate['id'] !== (int)$driverGovernorate['id']) {
                            jsonResponse(['status' => 'error', 'message' => 'Internal trip destinations must remain in the driver office governorate.'], 422);
                        }
                        $submittedDestinationName = trim((string)($destination['governorate_name'] ?? ''));
                        $destinationGovernorateName = $submittedDestinationName === $destinationGovernorate['name_en'] ? $destinationGovernorate['name_en'] : $destinationGovernorate['name_ar'];
                        $resolvedDestinations[] = array_merge($destination, [
                            'governorate_id' => (int)$destinationGovernorate['id'],
                            'governorate_name' => $destinationGovernorateName,
                        ]);
                    }
                    if (!$resolvedDestinations && $recordType !== 'work_session') {
                        jsonResponse(['status' => 'error', 'message' => 'Add at least one valid destination.'], 422);
                    }
                    if ($tripType === 'external') {
                        $hasDifferentGovernorate = false;
                        foreach ($resolvedDestinations as $destination) {
                            if ((int)$destination['governorate_id'] !== (int)$startGovernorate['id']) {
                                $hasDifferentGovernorate = true;
                                break;
                            }
                        }
                        if (!$hasDifferentGovernorate) {
                            jsonResponse(['status' => 'error', 'message' => 'An external trip must include a destination in a different governorate from its starting point.'], 422);
                        }
                    }
                    $governorate = $recordType === 'work_session'
                        ? (string)$driverGovernorate['name_ar']
                        : (string)$resolvedDestinations[0]['governorate_name'];
                    $destinationText = $recordType === 'work_session'
                        ? 'سجل عمل يومي'
                        : (string)($input['destination'] ?? 'زيارة تفقدية');
                    $visitLocationText = $recordType === 'work_session'
                        ? (string)$driverContext['office_name']
                        : (string)($input['visit_location'] ?? '');
                    $purposeText = $recordType === 'work_session'
                        ? 'توثيق حركة السائق اليومية'
                        : (string)($input['purpose'] ?? 'أعمال نقل ومتابعة');
                    $stmt = $pdo->prepare("
                        INSERT INTO trips
                            (trip_no, office_id, driver_id, vehicle_id, trip_type, record_type, internal_trip_count, external_trip_count, passenger_names, governorate,
                             start_point_type, start_governorate_id, start_office_id, start_point_name, start_location_detail,
                             destination, visit_location, purpose, planned_departure_date, supervisor_notes, created_by, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    $stmt->execute([
                        $tripNo,
                        $officeId,
                        $driverId,
                        $vehicleId,
                        $tripType,
                        $recordType,
                        max(0, (int)($input['internal_trip_count'] ?? 0)),
                        max(0, (int)($input['external_trip_count'] ?? 0)),
                        trim((string)($input['passenger_names'] ?? '')),
                        $governorate,
                        $startPointType,
                        (int)$startGovernorate['id'],
                        $startOfficeId,
                        $startPointName,
                        $startPointType === 'office_branch' ? '' : trim((string)($input['start_location_detail'] ?? '')),
                        $destinationText,
                        $visitLocationText,
                        $purposeText,
                        $input['planned_departure_date'] ?? date('Y-m-d'),
                        $input['supervisor_notes'] ?? '',
                        $input['created_by'] ?? 'مدير النظام',
                        'new'
                    ]);
                    $newId = $pdo->lastInsertId();
                    $savedTripId = (int)$newId;
                    $input['destinations'] = $resolvedDestinations;

                    // Insert companions if provided
                    if (!empty($input['companions']) && is_array($input['companions'])) {
                        $stmtCmp = $pdo->prepare("INSERT INTO trip_companions (trip_id, name, job_title) VALUES (?, ?, ?)");
                        foreach ($input['companions'] as $cmp) {
                            if (!empty($cmp['name'])) {
                                $stmtCmp->execute([$newId, trim($cmp['name']), trim($cmp['job_title'] ?? 'موظف مرافق')]);
                            }
                        }
                    }

                    if ($recordType !== 'work_session') {
                        createDtmsNotification(
                            $pdo,
                            (int)$driverContext['user_id'],
                            'تم تكليفك برحلة جديدة',
                            'New trip assigned',
                            'تم تكليفك بالرحلة ' . $tripNo . ' إلى ' . ($input['destination'] ?? ''),
                            'You have been assigned trip ' . $tripNo . ' to ' . ($input['destination'] ?? ''),
                            'trip_assigned',
                            (int)$newId
                        );
                    }

                }

                if ($savedTripId && array_key_exists('destinations', $input) && is_array($input['destinations'])) {
                    $destinationKeys = [];
                    $upsertDestination = $pdo->prepare("
                        INSERT INTO trip_destinations
                            (trip_id, client_key, governorate_id, governorate_name, destination, visit_location, purpose, sort_order, completed, completed_at, completed_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            governorate_id = VALUES(governorate_id),
                            governorate_name = VALUES(governorate_name),
                            destination = VALUES(destination),
                            visit_location = VALUES(visit_location),
                            purpose = VALUES(purpose),
                            sort_order = VALUES(sort_order),
                            completed = VALUES(completed),
                            completed_at = VALUES(completed_at),
                            completed_by = VALUES(completed_by)
                    ");
                    foreach ($input['destinations'] as $index => $destination) {
                        $clientKey = trim((string)($destination['id'] ?? ('destination-' . ($index + 1))));
                        if ($clientKey === '' || trim((string)($destination['destination'] ?? '')) === '') continue;
                        $destinationKeys[] = $clientKey;
                        $isCompleted = !empty($destination['completed']) ? 1 : 0;
                        $upsertDestination->execute([
                            $savedTripId,
                            $clientKey,
                            !empty($destination['governorate_id']) ? (int)$destination['governorate_id'] : null,
                            trim((string)($destination['governorate_name'] ?? '')),
                            trim((string)$destination['destination']),
                            trim((string)($destination['visit_location'] ?? '')),
                            trim((string)($destination['purpose'] ?? '')),
                            (int)$index,
                            $isCompleted,
                            $isCompleted ? ($destination['completed_at'] ?? date('Y-m-d H:i:s')) : null,
                            $isCompleted ? ($destination['completed_by'] ?? ($portalUser['username'] ?? '')) : null,
                        ]);
                    }

                    if ($destinationKeys) {
                        $placeholders = implode(',', array_fill(0, count($destinationKeys), '?'));
                        $deleteMissing = $pdo->prepare("DELETE FROM trip_destinations WHERE trip_id = ? AND client_key NOT IN ($placeholders)");
                        $deleteMissing->execute(array_merge([$savedTripId], $destinationKeys));
                    } else {
                        $pdo->prepare('DELETE FROM trip_destinations WHERE trip_id = ?')->execute([$savedTripId]);
                    }
                }

                if ($savedTripId && array_key_exists('work_session_routes', $input) && is_array($input['work_session_routes'])) {
                    $routeRows = [];
                    foreach ($input['work_session_routes'] as $index => $route) {
                        $from = resolveGovernorate($pdo, $route['from_governorate_id'] ?? null, $route['from_governorate_name'] ?? '');
                        $to = resolveGovernorate($pdo, $route['to_governorate_id'] ?? null, $route['to_governorate_name'] ?? '');
                        if (!$from || !$to || (int)$from['id'] === (int)$to['id']) {
                            jsonResponse(['status' => 'error', 'message' => 'Every external trip requires different valid from and to governorates.'], 422);
                        }
                        $routeRows[] = [(int)$from['id'], (int)$to['id'], (int)$index];
                    }
                    $pdo->prepare('DELETE FROM work_session_routes WHERE trip_id = ?')->execute([$savedTripId]);
                    $insertRoute = $pdo->prepare('INSERT INTO work_session_routes (trip_id, from_governorate_id, to_governorate_id, sort_order) VALUES (?, ?, ?, ?)');
                    foreach ($routeRows as $routeRow) {
                        $insertRoute->execute([$savedTripId, $routeRow[0], $routeRow[1], $routeRow[2]]);
                    }
                }

                jsonResponse([
                    'status' => 'success',
                    'message' => is_numeric($id) && intval($id) > 0 ? 'تم تحديث بيانات الرحلة بنجاح' : 'تم إنشاء الرحلة بنجاح في قاعدة البيانات',
                    'id' => $savedTripId,
                    'trip_no' => $tripNo ?? ($input['trip_no'] ?? null),
                ]);
            } catch (Exception $e) {
                error_log('DTMS trip save failed: ' . $e->getMessage());
                jsonResponse(['status' => 'error', 'message' => 'Unable to save the trip.'], 500);
            }
        }

        $tripSql = "
            SELECT t.*, o.name AS office_name, o.governorate AS office_governorate,
                   o.governorate_en AS office_governorate_en,
                   d.full_name AS driver_name, d.portal_user_id AS driver_portal_user_id,
                   v.vehicle_no, v.plate_no,
                   start_gov.name_ar AS start_governorate_name,
                   start_gov.name_en AS start_governorate_name_en
            FROM trips t
            LEFT JOIN offices o ON t.office_id = o.id
            LEFT JOIN drivers d ON t.driver_id = d.id
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            LEFT JOIN governorates start_gov ON t.start_governorate_id = start_gov.id
        ";
        $tripParams = [];
        if ($portalUser['dtms_role'] === 'driver') {
            $tripSql .= " WHERE d.portal_user_id = ?";
            $tripParams[] = (int)$portalUser['id'];
        } elseif (in_array($portalUser['dtms_role'], ['supervisor', 'viewer'], true)) {
            $tripSql .= " JOIN users scope_user ON scope_user.portal_user_id = ? AND scope_user.office_id = t.office_id";
            $tripParams[] = (int)$portalUser['id'];
        }
        $tripSql .= " ORDER BY t.id DESC";
        $stmt = $pdo->prepare($tripSql);
        $stmt->execute($tripParams);
        $tripsData = $stmt->fetchAll();

        // Attach companions to each trip
        if (!empty($tripsData)) {
            $stmtCmps = $pdo->prepare("SELECT id, name, job_title FROM trip_companions WHERE trip_id = ?");
            $stmtDestinations = $pdo->prepare("
                SELECT td.client_key AS id, td.governorate_id, td.governorate_name,
                       g.name_ar AS resolved_governorate_name, g.name_en AS resolved_governorate_name_en,
                       td.destination, td.visit_location, td.purpose, td.completed, td.completed_at, td.completed_by
                FROM trip_destinations td
                LEFT JOIN governorates g ON g.id = td.governorate_id
                WHERE td.trip_id = ?
                ORDER BY td.sort_order, td.id
            ");
            $stmtWorkRoutes = $pdo->prepare("
                SELECT wsr.id, wsr.from_governorate_id, gf.name_ar AS from_governorate_name,
                       wsr.to_governorate_id, gt.name_ar AS to_governorate_name
                FROM work_session_routes wsr
                JOIN governorates gf ON gf.id = wsr.from_governorate_id
                JOIN governorates gt ON gt.id = wsr.to_governorate_id
                WHERE wsr.trip_id = ? ORDER BY wsr.sort_order, wsr.id
            ");
            $repairTripGovernorate = $pdo->prepare('UPDATE trips SET governorate = ? WHERE id = ?');
            $repairWorkSessionText = $pdo->prepare('UPDATE trips SET destination = ?, purpose = ? WHERE id = ?');
            $repairDriverName = $pdo->prepare('UPDATE drivers SET full_name = ? WHERE id = ?');
            $repairDestinationGovernorate = $pdo->prepare('UPDATE trip_destinations SET governorate_name = ? WHERE trip_id = ? AND client_key = ?');
            foreach ($tripsData as &$tr) {
                if (($tr['record_type'] ?? 'trip') === 'work_session'
                    && (dtmsTextIsCorrupted((string)$tr['destination']) || dtmsTextIsCorrupted((string)$tr['purpose']))) {
                    $tr['destination'] = 'سجل عمل يومي';
                    $tr['purpose'] = 'توثيق حركة السائق اليومية';
                    $repairWorkSessionText->execute([$tr['destination'], $tr['purpose'], (int)$tr['id']]);
                }
                if (dtmsTextIsCorrupted((string)$tr['driver_name'])) {
                    $replacementDriverName = dtmsCentralDisplayName((int)$tr['driver_portal_user_id']);
                    if ($replacementDriverName) {
                        $tr['driver_name'] = $replacementDriverName;
                        $repairDriverName->execute([$replacementDriverName, (int)$tr['driver_id']]);
                    }
                }
                if (dtmsTextIsCorrupted((string)$tr['governorate'])) {
                    $replacementGovernorate = dtmsFirstReadableText([
                        $tr['start_governorate_name'],
                        $tr['office_governorate'],
                        $tr['start_governorate_name_en'],
                        $tr['office_governorate_en'],
                    ]);
                    if ($replacementGovernorate !== '') {
                        $tr['governorate'] = $replacementGovernorate;
                        $repairTripGovernorate->execute([$replacementGovernorate, (int)$tr['id']]);
                    }
                }
                $stmtCmps->execute([$tr['id']]);
                $tr['companions'] = $stmtCmps->fetchAll();
                $stmtDestinations->execute([$tr['id']]);
                $tr['destinations'] = $stmtDestinations->fetchAll();
                foreach ($tr['destinations'] as &$destination) {
                    if (dtmsTextIsCorrupted((string)$destination['governorate_name'])) {
                        $replacementGovernorate = dtmsFirstReadableText([
                            $destination['resolved_governorate_name'],
                            $destination['resolved_governorate_name_en'],
                        ]);
                        if ($replacementGovernorate !== '') {
                            $destination['governorate_name'] = $replacementGovernorate;
                            $repairDestinationGovernorate->execute([$replacementGovernorate, (int)$tr['id'], (string)$destination['id']]);
                        }
                    }
                    unset($destination['resolved_governorate_name'], $destination['resolved_governorate_name_en']);
                }
                unset($destination);
                $stmtWorkRoutes->execute([$tr['id']]);
                $tr['work_session_routes'] = $stmtWorkRoutes->fetchAll();
                unset(
                    $tr['office_governorate'],
                    $tr['office_governorate_en'],
                    $tr['driver_portal_user_id'],
                    $tr['start_governorate_name'],
                    $tr['start_governorate_name_en']
                );
            }
            unset($tr);
        }

        jsonResponse(['status' => 'success', 'data' => $tripsData]);
        break;

    // ----------------------------------------------------
    // TRACKING (تتبع GPS)
    // ----------------------------------------------------
    case 'tracking':
        if ($method === 'GET') {
            $tripId = (int)($_GET['trip_id'] ?? 0);
            $sql = "
                SELECT tt.id, tt.trip_id, tt.driver_id, tt.latitude, tt.longitude,
                       tt.speed, tt.heading, tt.location_name, tt.timestamp
                FROM trip_tracking tt
                JOIN trips t ON t.id = tt.trip_id
                JOIN drivers d ON d.id = tt.driver_id
                WHERE 1=1
            ";
            $params = [];
            if ($tripId > 0) {
                $sql .= ' AND tt.trip_id = ?';
                $params[] = $tripId;
            }
            if ($portalUser['dtms_role'] === 'driver') {
                $sql .= ' AND d.portal_user_id = ?';
                $params[] = (int)$portalUser['id'];
            } elseif ($portalUser['dtms_role'] === 'supervisor') {
                $sql .= ' AND EXISTS (SELECT 1 FROM users u WHERE u.portal_user_id = ? AND u.office_id = t.office_id)';
                $params[] = (int)$portalUser['id'];
            } elseif (!in_array($portalUser['dtms_role'], ['admin', 'security'], true)) {
                jsonResponse(['status' => 'error', 'message' => 'Tracking access denied.'], 403);
            }
            $sql .= ' ORDER BY tt.timestamp ASC, tt.id ASC LIMIT 10000';
            $trackingStmt = $pdo->prepare($sql);
            $trackingStmt->execute($params);
            jsonResponse(['status' => 'success', 'data' => $trackingStmt->fetchAll()]);
        }
        if ($method === 'POST') {
            if (dtmsSystemSetting($pdo, 'gps_tracking_enabled', '0') !== '1') {
                jsonResponse(['status' => 'error', 'message' => 'GPS tracking is disabled.'], 409);
            }
            if ($portalUser['dtms_role'] !== 'driver') {
                jsonResponse(['status' => 'error', 'message' => 'Only the assigned driver can submit tracking points.'], 403);
            }
            $trackingAccess = $pdo->prepare("SELECT 1 FROM trips t JOIN drivers d ON d.id = t.driver_id WHERE t.id = ? AND d.id = ? AND d.portal_user_id = ? AND t.status = 'in_progress' LIMIT 1");
            $trackingAccess->execute([(int)($input['trip_id'] ?? 0), (int)($input['driver_id'] ?? 0), (int)$portalUser['id']]);
            if (!$trackingAccess->fetchColumn()) {
                jsonResponse(['status' => 'error', 'message' => 'Trip tracking access denied.'], 403);
            }
            $stmt = $pdo->prepare("
                INSERT INTO trip_tracking (trip_id, driver_id, latitude, longitude, speed, heading, location_name)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $input['trip_id'],
                $input['driver_id'],
                $input['latitude'],
                $input['longitude'],
                $input['speed'] ?? 0,
                $input['heading'] ?? 0,
                $input['location_name'] ?? 'موقع GPS مباشر'
            ]);
            jsonResponse(['status' => 'success', 'message' => 'تم تسجيل نقطة التتبع المباشر']);
        }
        jsonResponse(['status' => 'error', 'message' => 'Unsupported tracking operation.'], 405);

    // ----------------------------------------------------
    // AZURE VISION SETTINGS (ADMIN ONLY)
    // ----------------------------------------------------
    case 'ocr_settings':
        if ($portalUser['dtms_role'] !== 'admin') {
            jsonResponse(['status' => 'error', 'message' => 'Azure OCR settings are available to administrators only.'], 403);
        }
        if ($method === 'GET') {
            $vision = dtmsAzureVisionConfig($pdo);
            jsonResponse([
                'status' => 'success',
                'data' => [
                    'endpoint' => $vision['endpoint'],
                    'region' => $vision['region'],
                    'api_version' => $vision['api_version'],
                    'key_configured' => $vision['key'] !== '',
                    'key_masked' => $vision['key'] !== '' ? '••••••••••••••••' : '',
                ],
            ]);
        }
        if ($method !== 'POST') {
            jsonResponse(['status' => 'error', 'message' => 'Unsupported settings operation.'], 405);
        }

        $settingsEndpoint = rtrim(trim((string)($input['endpoint'] ?? '')), '/');
        $settingsRegion = strtolower(trim((string)($input['region'] ?? '')));
        $settingsKey = trim((string)($input['key'] ?? ''));
        $clearKey = !empty($input['clear_key']);
        $settingsHost = strtolower((string)parse_url($settingsEndpoint, PHP_URL_HOST));
        if ($settingsEndpoint === '' || $settingsHost === '' || !str_ends_with($settingsHost, '.cognitiveservices.azure.com')) {
            jsonResponse(['status' => 'error', 'message' => 'Enter a valid Azure Cognitive Services endpoint.'], 422);
        }
        if ($settingsRegion === '' || !preg_match('/^[a-z0-9-]{2,40}$/', $settingsRegion)) {
            jsonResponse(['status' => 'error', 'message' => 'Enter a valid Azure region.'], 422);
        }
        if ($settingsKey !== '' && (strlen($settingsKey) < 20 || strlen($settingsKey) > 200 || preg_match('/\s/', $settingsKey))) {
            jsonResponse(['status' => 'error', 'message' => 'The Azure key format is invalid.'], 422);
        }
        $existingEncryptedKey = dtmsSystemSetting($pdo, 'azure_vision.key', '');
        $environmentKey = trim((string)(getenv('DTMS_AZURE_VISION_KEY') ?: ''));
        if (!$clearKey && $settingsKey === '' && $existingEncryptedKey === '' && $environmentKey === '') {
            jsonResponse(['status' => 'error', 'message' => 'Enter an Azure key before enabling Azure OCR.'], 422);
        }

        $pdo->beginTransaction();
        try {
            dtmsSetSystemSetting($pdo, 'azure_vision.endpoint', $settingsEndpoint);
            dtmsSetSystemSetting($pdo, 'azure_vision.region', $settingsRegion);
            dtmsSetSystemSetting($pdo, 'azure_vision.api_version', '2024-02-01');
            dtmsSetSystemSetting($pdo, 'ocr.default_engine', 'Azure Vision');
            if ($clearKey) {
                dtmsSetSystemSetting($pdo, 'azure_vision.key', '', true);
            } elseif ($settingsKey !== '') {
                dtmsSetSystemSetting($pdo, 'azure_vision.key', dtmsEncryptSecret($settingsKey), true);
            }
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            error_log('DTMS Azure OCR settings update failed: ' . $e->getMessage());
            jsonResponse(['status' => 'error', 'message' => 'Unable to save Azure OCR settings.'], 500);
        }
        audit_log(
            'drivers_management_system',
            'azure_ocr_settings_updated',
            'system_settings',
            'azure_vision',
            'Azure Vision OCR settings',
            null,
            ['endpoint' => $settingsEndpoint, 'region' => $settingsRegion, 'key' => $settingsKey !== '' || $clearKey ? '[changed]' : '[unchanged]']
        );
        $savedVision = dtmsAzureVisionConfig($pdo);
        jsonResponse([
            'status' => 'success',
            'message' => 'Azure OCR settings saved securely.',
            'data' => [
                'endpoint' => $savedVision['endpoint'],
                'region' => $savedVision['region'],
                'api_version' => $savedVision['api_version'],
                'key_configured' => $savedVision['key'] !== '',
                'key_masked' => $savedVision['key'] !== '' ? '••••••••••••••••' : '',
            ],
        ]);

    // ----------------------------------------------------
    // AZURE VISION OCR
    // ----------------------------------------------------
    case 'ocr':
        if ($method !== 'POST' || $action !== 'analyze') {
            jsonResponse(['status' => 'error', 'message' => 'Unsupported OCR operation.'], 405);
        }
        if (!in_array($portalUser['dtms_role'], ['driver', 'admin'], true)) {
            jsonResponse(['status' => 'error', 'message' => 'OCR is available to the assigned driver only.'], 403);
        }

        $tripId = (int)($input['trip_id'] ?? 0);
        $imageData = (string)($input['image_data'] ?? '');
        $expectedMin = max(0, (int)($input['expected_min'] ?? 0));
        if ($tripId <= 0 || $imageData === '') {
            jsonResponse(['status' => 'error', 'message' => 'Trip and odometer image are required.'], 422);
        }
        if ($portalUser['dtms_role'] === 'driver') {
            $owner = $pdo->prepare("
                SELECT 1
                FROM trips t
                JOIN drivers d ON d.id = t.driver_id
                WHERE t.id = ?
                  AND d.portal_user_id = ?
                LIMIT 1
            ");
            $owner->execute([$tripId, (int)$portalUser['id']]);
            if (!$owner->fetchColumn()) {
                jsonResponse(['status' => 'error', 'message' => 'Only the assigned driver can analyze this odometer.'], 403);
            }
        }

        if (strlen($imageData) > 12 * 1024 * 1024) {
            jsonResponse(['status' => 'error', 'message' => 'The odometer image is too large.'], 413);
        }
        if (!preg_match('#^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)$#i', $imageData, $imageMatch)) {
            jsonResponse(['status' => 'error', 'message' => 'Use a JPEG, PNG, or WebP odometer image.'], 422);
        }
        $mimeSubtype = strtolower($imageMatch[1]);
        $binary = base64_decode(preg_replace('/\s+/', '', $imageMatch[2]), true);
        if ($binary === false || strlen($binary) < 100 || strlen($binary) > 8 * 1024 * 1024) {
            jsonResponse(['status' => 'error', 'message' => 'The odometer image data is invalid or too large.'], 422);
        }

        $vision = dtmsAzureVisionConfig($pdo);
        if ($vision['endpoint'] === '' || $vision['key'] === '') {
            jsonResponse(['status' => 'error', 'message' => 'Azure Vision OCR is not configured on the server.'], 503);
        }
        $visionHost = strtolower((string)parse_url($vision['endpoint'], PHP_URL_HOST));
        if ($visionHost === '' || !str_ends_with($visionHost, '.cognitiveservices.azure.com')) {
            jsonResponse(['status' => 'error', 'message' => 'Azure Vision endpoint configuration is invalid.'], 500);
        }
        if (!function_exists('curl_init')) {
            jsonResponse(['status' => 'error', 'message' => 'The server cURL extension is required for Azure OCR.'], 500);
        }

        $azureUrl = $vision['endpoint'] . '/computervision/imageanalysis:analyze?' . http_build_query([
            'api-version' => $vision['api_version'],
            'features' => 'read',
        ]);
        $azureResponse = callAzureVisionRead($azureUrl, $vision['key'], $binary, $mimeSubtype);
        $azureBody = $azureResponse['body'];
        $curlError = $azureResponse['error'];
        $azureStatus = $azureResponse['status'];
        $processingTimeMs = $azureResponse['processing_time_ms'];

        if ($azureBody === false) {
            jsonResponse(['status' => 'error', 'message' => 'Unable to reach Azure Vision: ' . $curlError], 502);
        }
        $azureResult = json_decode((string)$azureBody, true);
        if ($azureStatus < 200 || $azureStatus >= 300 || !is_array($azureResult)) {
            $providerMessage = is_array($azureResult)
                ? (string)($azureResult['error']['message'] ?? 'Azure Vision rejected the request.')
                : 'Azure Vision returned an invalid response.';
            jsonResponse(['status' => 'error', 'message' => $providerMessage, 'provider_status' => $azureStatus], 502);
        }

        $extracted = extractOdometerCandidates((array)($azureResult['readResult'] ?? []), $expectedMin);
        if (empty($extracted['candidates'])) {
            jsonResponse([
                'status' => 'error',
                'message' => 'Azure could not identify a plausible odometer number. Retake a closer, clearer photo.',
                'raw_text' => $extracted['raw_text'],
            ], 422);
        }
        $best = $extracted['candidates'][0];

        // Azure confidence measures character recognition only. Apply a separate
        // odometer plausibility check so a confident but malformed number is not
        // silently accepted as the vehicle reading.
        $startEvidence = $pdo->prepare("SELECT reading FROM odometer_records WHERE trip_id = ? AND type = 'start' ORDER BY id DESC LIMIT 1");
        $startEvidence->execute([$tripId]);
        $startReading = $startEvidence->fetchColumn();
        $readingStage = $startReading === false ? 'start' : 'end';
        $maxPlausibleIncrease = $readingStage === 'end'
            ? 3000
            : max(2000, (int)round($expectedMin * 0.10));
        $increase = $best['value'] - $expectedMin;

        if ($expectedMin > 0 && ($increase < 0 || $increase > $maxPlausibleIncrease)) {
            $enhancedBinary = enhanceOdometerImage($binary);
            if ($enhancedBinary !== null) {
                $enhancedResponse = callAzureVisionRead($azureUrl, $vision['key'], $enhancedBinary, 'jpeg');
                $processingTimeMs += $enhancedResponse['processing_time_ms'];
                $enhancedResult = json_decode((string)$enhancedResponse['body'], true);
                if ($enhancedResponse['status'] >= 200 && $enhancedResponse['status'] < 300 && is_array($enhancedResult)) {
                    $enhancedExtracted = extractOdometerCandidates((array)($enhancedResult['readResult'] ?? []), $expectedMin);
                    if (!empty($enhancedExtracted['candidates'])) {
                        $enhancedBest = $enhancedExtracted['candidates'][0];
                        $enhancedIncrease = $enhancedBest['value'] - $expectedMin;
                        if ($enhancedIncrease >= 0 && $enhancedIncrease <= $maxPlausibleIncrease) {
                            $best = $enhancedBest;
                            $extracted = $enhancedExtracted;
                            $increase = $enhancedIncrease;
                        }
                    }
                }
            }
        }

        $requiresManualReview = $expectedMin > 0 && ($increase < 0 || $increase > $maxPlausibleIncrease);

        jsonResponse([
            'status' => 'success',
            'data' => [
                'raw_text' => $extracted['raw_text'],
                'extracted_number' => $best['value'],
                'confidence' => $best['confidence'],
                'engine' => 'Azure Vision',
                'model_version' => $azureResult['modelVersion'] ?? null,
                'processing_time_ms' => $processingTimeMs,
                'requires_manual_review' => $requiresManualReview,
                'validation_warning' => $requiresManualReview
                    ? 'The OCR reading differs significantly from the previous odometer. Verify and correct the value manually before continuing.'
                    : null,
                'expected_reference' => $expectedMin,
            ],
        ]);

    // ----------------------------------------------------
    // ODOMETER (قراءات العداد وOCR)
    // ----------------------------------------------------
    case 'odometer':
        if ($method === 'GET') {
            $tripId = (int)($_GET['trip_id'] ?? 0);
            if ($tripId <= 0) {
                jsonResponse(['status' => 'error', 'message' => 'Trip is required.'], 400);
            }

            if (!in_array($portalUser['dtms_role'], ['admin', 'security'], true)) {
                $evidenceAccessSql = "SELECT 1 FROM trips t JOIN drivers d ON d.id = t.driver_id WHERE t.id = ?";
                $evidenceAccessParams = [$tripId];
                if ($portalUser['dtms_role'] === 'driver') {
                    $evidenceAccessSql .= " AND d.portal_user_id = ?";
                } else {
                    $evidenceAccessSql .= " AND EXISTS (SELECT 1 FROM users u WHERE u.portal_user_id = ? AND u.office_id = t.office_id)";
                }
                $evidenceAccessParams[] = (int)$portalUser['id'];
                $evidenceAccess = $pdo->prepare($evidenceAccessSql . " LIMIT 1");
                $evidenceAccess->execute($evidenceAccessParams);
                if (!$evidenceAccess->fetchColumn()) jsonResponse(['status' => 'error', 'message' => 'Odometer evidence access denied.'], 403);
            }

            $stmt = $pdo->prepare("
                SELECT id, trip_id, type, reading, display_reading, reading_unit, photo_url, ocr_result,
                       confidence_score, is_verified, manual_override, created_at
                FROM odometer_records
                WHERE trip_id = ?
                ORDER BY id ASC
            ");
            $stmt->execute([$tripId]);
            jsonResponse(['status' => 'success', 'data' => $stmt->fetchAll()]);
        }

        if ($method === 'POST') {
            $tripId = (int)($input['trip_id'] ?? 0);
            $type = (string)($input['type'] ?? '');

            if ($action === 'attach_ocr') {
                $ocrResult = round((float)($input['ocr_result'] ?? 0), 1);
                $confidence = max(0, min(100, round((float)($input['confidence_score'] ?? 0), 2)));
                if ($tripId <= 0 || !in_array($type, ['start', 'end'], true) || $ocrResult <= 0) {
                    jsonResponse(['status' => 'error', 'message' => 'Trip, reading type, and OCR result are required.'], 400);
                }

                $owner = $pdo->prepare("
                    SELECT od.id, od.display_reading
                    FROM odometer_records od
                    JOIN trips t ON t.id = od.trip_id
                    JOIN drivers d ON d.id = t.driver_id
                    WHERE od.trip_id = ? AND od.type = ? AND d.portal_user_id = ?
                    ORDER BY od.id DESC
                    LIMIT 1
                ");
                $owner->execute([$tripId, $type, (int)$portalUser['id']]);
                $record = $owner->fetch();
                if (!$record) {
                    jsonResponse(['status' => 'error', 'message' => 'Odometer evidence was not found for the assigned driver.'], 404);
                }

                $manualOverride = abs((float)$record['display_reading'] - $ocrResult) > 0.05 ? 1 : 0;
                $attach = $pdo->prepare("
                    UPDATE odometer_records
                    SET ocr_result = ?, confidence_score = ?, manual_override = ?
                    WHERE id = ?
                ");
                $attach->execute([(string)$ocrResult, $confidence, $manualOverride, (int)$record['id']]);
                jsonResponse(['status' => 'success', 'message' => 'OCR evidence attached.']);
            }

            $tripVehicle = $pdo->prepare("SELECT COALESCE(v.odometer_unit, 'km') AS odometer_unit FROM trips t JOIN vehicles v ON v.id = t.vehicle_id WHERE t.id = ? LIMIT 1");
            $tripVehicle->execute([$tripId]);
            $tripVehicleRow = $tripVehicle->fetch();
            if (!$tripVehicleRow) jsonResponse(['status' => 'error', 'message' => 'Trip vehicle was not found.'], 404);
            $readingUnit = normalizeOdometerUnit($tripVehicleRow['odometer_unit'] ?? 'km');
            $displayReading = round((float)($input['display_reading'] ?? $input['reading'] ?? 0), 1);
            $reading = array_key_exists('display_reading', $input)
                ? odometerReadingToKm($displayReading, $readingUnit)
                : round((float)($input['reading'] ?? 0), 1);
            $photoUrl = (string)($input['photo_url'] ?? '');
            if ($tripId <= 0 || !in_array($type, ['start', 'end'], true) || $reading <= 0 || $photoUrl === '') {
                jsonResponse(['status' => 'error', 'message' => 'Trip, reading type, reading, and photo are required.'], 400);
            }
            $isUploadedImage = preg_match('#^data:image/(jpeg|png|webp);base64,#i', $photoUrl) === 1;
            if (!$isUploadedImage) {
                jsonResponse(['status' => 'error', 'message' => 'Unsupported odometer photo format.'], 422);
            }
            $encodedPhoto = substr($photoUrl, strpos($photoUrl, ',') + 1);
            $photoBinary = base64_decode($encodedPhoto, true);
            if ($photoBinary === false || strlen($photoBinary) < 100 || strlen($photoBinary) > 8 * 1024 * 1024 || @getimagesizefromstring($photoBinary) === false) {
                jsonResponse(['status' => 'error', 'message' => 'The odometer photo is invalid or too large.'], 422);
            }

            if ($portalUser['dtms_role'] !== 'admin') {
                $owner = $pdo->prepare("
                    SELECT t.status
                    FROM trips t
                    JOIN drivers d ON d.id = t.driver_id
                    WHERE t.id = ?
                      AND d.portal_user_id = ?
                    LIMIT 1
                ");
                $owner->execute([$tripId, (int)$portalUser['id']]);
                $tripStatus = $owner->fetchColumn();
                if ($tripStatus === false) {
                    jsonResponse(['status' => 'error', 'message' => 'Only the assigned driver can save odometer evidence.'], 403);
                }
                $validStatus = ($type === 'start' && $tripStatus === 'new') || ($type === 'end' && $tripStatus === 'in_progress');
                if (!$validStatus) {
                    jsonResponse(['status' => 'error', 'message' => 'Odometer evidence does not match the current trip stage.'], 409);
                }
            }

            $existing = $pdo->prepare("SELECT id FROM odometer_records WHERE trip_id = ? AND type = ? ORDER BY id DESC LIMIT 1");
            $existing->execute([$tripId, $type]);
            $recordId = $existing->fetchColumn();
            if ($recordId) {
                $stmt = $pdo->prepare("
                    UPDATE odometer_records
                    SET reading = ?, display_reading = ?, reading_unit = ?, photo_url = ?, ocr_result = ?, confidence_score = ?,
                        is_verified = ?, manual_override = ?
                    WHERE id = ?
                ");
                $stmt->execute([
                    $reading,
                    $displayReading,
                    $readingUnit,
                    $photoUrl,
                    ($input['ocr_result'] ?? '') !== '' ? (string)$input['ocr_result'] : null,
                    (float)($input['confidence_score'] ?? 0),
                    !empty($input['is_verified']) ? 1 : 0,
                    !empty($input['manual_override']) ? 1 : 0,
                    $recordId,
                ]);
            } else {
            $stmt = $pdo->prepare("
                    INSERT INTO odometer_records
                        (trip_id, type, reading, display_reading, reading_unit, photo_url, ocr_result, confidence_score, is_verified, manual_override)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                    $tripId,
                    $type,
                    $reading,
                    $displayReading,
                    $readingUnit,
                    $photoUrl,
                    ($input['ocr_result'] ?? '') !== '' ? (string)$input['ocr_result'] : null,
                    (float)($input['confidence_score'] ?? 0),
                    !empty($input['is_verified']) ? 1 : 0,
                    !empty($input['manual_override']) ? 1 : 0,
            ]);
                $recordId = (int)$pdo->lastInsertId();
            }
            if ($type === 'end') {
                $updateVehicleOdometer = $pdo->prepare("
                    UPDATE vehicles v
                    JOIN trips t ON t.vehicle_id = v.id
                    SET v.last_odometer = GREATEST(v.last_odometer, ?)
                    WHERE t.id = ?
                ");
                $updateVehicleOdometer->execute([$reading, $tripId]);
            }
            jsonResponse(['status' => 'success', 'message' => 'تم حفظ قراءة العداد مع نتيجة الـ OCR الموثقة']);
        }
        break;

    // ----------------------------------------------------
    // AUDIT LOGS (سجل تدقيق ورقابة العمليات)
    // ----------------------------------------------------
    case 'audit_logs':
        $subAction = $action ?: ($method === 'DELETE' ? 'clear' : ($method === 'POST' ? 'save' : 'list'));

        if (($method !== 'POST' || $subAction !== 'save') && $portalUser['dtms_role'] !== 'admin') {
            jsonResponse(['status' => 'error', 'message' => 'Audit logs are available to administrators only.'], 403);
        }

        if ($subAction === 'clear' || $method === 'DELETE') {
            $pdo->exec("TRUNCATE TABLE audit_logs");
            jsonResponse(['status' => 'success', 'message' => 'تم تفريغ سجل التدقيق بنجاح']);
        }

        if ($subAction === 'sync') {
            jsonResponse(['status' => 'error', 'message' => 'Bulk client audit import is disabled.'], 405);
        }

        if ($subAction === 'save' || $method === 'POST') {
            $stmt = $pdo->prepare("
                INSERT INTO audit_logs (user_name, user_role, ip_address, action_type, description, entity, entity_id, `timestamp`)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                (string)($portalUser['username'] ?? 'system'),
                (string)$portalUser['dtms_role'],
                (string)($_SERVER['REMOTE_ADDR'] ?? ''),
                $input['action_type'] ?? 'إجراء نظام',
                $input['description'] ?? '',
                $input['entity'] ?? 'global',
                strval($input['entity_id'] ?? '1'),
            ]);
            $logId = $pdo->lastInsertId();
            jsonResponse(['status' => 'success', 'message' => 'تم توثيق العملية في سجل التدقيق MySQL بنجاح', 'id' => $logId]);
        }

        $stmt = $pdo->query("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 500");
        jsonResponse(['status' => 'success', 'data' => $stmt->fetchAll()]);
        break;

    // ----------------------------------------------------
    // DATABASE BACKUP (النسخ الاحتياطي لقاعدة بيانات MySQL)
    // ----------------------------------------------------
    case 'backup':
        if ($portalUser['dtms_role'] !== 'admin') {
            jsonResponse(['status' => 'error', 'message' => 'Administrator access is required.'], 403);
        }
        $dbName = defined('DB_NAME') ? DB_NAME : 'dtms_db';
        $configuredBackupsDir = trim((string)(getenv('DTMS_BACKUP_DIR') ?: ''));
        $defaultBackupsDir = $configuredBackupsDir !== ''
            ? $configuredBackupsDir
            : (realpath(__DIR__ . '/../backups') ?: (__DIR__ . '/../backups'));

        function generateDtmsMySQLDump(PDO $pdo, string $dbName = 'dtms_db'): string {
            $out = "-- ========================================================\n";
            $out .= "-- DTMS MySQL Database Backup (نسخة احتياطية لقاعدة البيانات)\n";
            $out .= "-- Database: `{$dbName}`\n";
            $out .= "-- Generated At: " . date('Y-m-d H:i:s') . "\n";
            $out .= "-- Server: MySQL / MariaDB via XAMPP PDO\n";
            $out .= "-- System: Driver & Transportation Management System\n";
            $out .= "-- ========================================================\n\n";
            $out .= "SET NAMES utf8mb4;\n";
            $out .= "SET FOREIGN_KEY_CHECKS = 0;\n";
            $out .= "SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n\n";
            $out .= "CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n";
            $out .= "USE `{$dbName}`;\n\n";

            $tables = $pdo->query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'")->fetchAll(PDO::FETCH_NUM);

            foreach ($tables as $tRow) {
                $table = $tRow[0];
                $out .= "-- --------------------------------------------------------\n";
                $out .= "-- Table structure for table `{$table}`\n";
                $out .= "-- --------------------------------------------------------\n";
                $out .= "DROP TABLE IF EXISTS `{$table}`;\n";

                $createStmt = $pdo->query("SHOW CREATE TABLE `{$table}`")->fetch(PDO::FETCH_ASSOC);
                $createSql = $createStmt['Create Table'] ?? '';
                $out .= $createSql . ";\n\n";

                $rows = $pdo->query("SELECT * FROM `{$table}`")->fetchAll(PDO::FETCH_ASSOC);
                if (!empty($rows)) {
                    $out .= "-- Dumping data for table `{$table}` (" . count($rows) . " rows)\n";
                    $cols = array_keys($rows[0]);
                    $colList = implode('`, `', $cols);

                    $out .= "INSERT INTO `{$table}` (`{$colList}`) VALUES\n";
                    $valRows = [];
                    foreach ($rows as $r) {
                        $vals = [];
                        foreach ($cols as $col) {
                            $v = $r[$col];
                            if ($v === null) {
                                $vals[] = "NULL";
                            } else {
                                $vals[] = $pdo->quote($v);
                            }
                        }
                        $valRows[] = "(" . implode(', ', $vals) . ")";
                    }
                    $out .= implode(",\n", $valRows) . ";\n\n";
                }
            }

            $out .= "SET FOREIGN_KEY_CHECKS = 1;\n";
            $out .= "-- Dump completed on " . date('Y-m-d H:i:s') . "\n";
            return $out;
        }

        if ($action === 'info') {
            $tableCount = (int)$pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '{$dbName}'")->fetchColumn();
            jsonResponse([
                'status' => 'success',
                'database' => $dbName,
                'tables_count' => $tableCount,
                'default_folder' => str_replace('/', DIRECTORY_SEPARATOR, $defaultBackupsDir),
                'server_presets' => [str_replace('/', DIRECTORY_SEPARATOR, $defaultBackupsDir)],
                'timestamp' => date('Y-m-d H:i:s')
            ]);
        }

        if ($action === 'download') {
            $dump = generateDtmsMySQLDump($pdo, $dbName);
            $filename = 'DTMS_MySQL_' . $dbName . '_' . date('Y-m-d_H-i-s') . '.sql';
            header('Content-Type: application/sql; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Content-Length: ' . strlen($dump));
            echo $dump;
            exit;
        }

        if ($action === 'get_sql') {
            $dump = generateDtmsMySQLDump($pdo, $dbName);
            $filename = 'DTMS_MySQL_' . $dbName . '_' . date('Y-m-d_H-i-s') . '.sql';
            $tableCount = (int)$pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '{$dbName}'")->fetchColumn();
            jsonResponse([
                'status' => 'success',
                'filename' => $filename,
                'sql' => $dump,
                'size_bytes' => strlen($dump),
                'size_formatted' => round(strlen($dump) / 1024, 2) . ' KB',
                'tables_count' => $tableCount,
                'database' => $dbName,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
        }

        if ($action === 'restore_sql' || $action === 'restore') {
            $restoreEnabled = strtolower(trim((string)(getenv('DTMS_ALLOW_RESTORE') ?: 'false'))) === 'true';
            if (!$restoreEnabled) {
                jsonResponse([
                    'status' => 'error',
                    'message' => 'Database restore is disabled. Enable it only during a controlled maintenance window.'
                ], 403);
            }

            $sql = '';
            if (is_array($input) && !empty($input['sql']) && is_string($input['sql'])) {
                $sql = $input['sql'];
            } elseif (!empty($_FILES['file']['tmp_name'])) {
                $sql = file_get_contents($_FILES['file']['tmp_name']);
            } elseif (is_string($rawInput) && !str_starts_with(trim($rawInput), '{')) {
                $sql = $rawInput;
            }

            if (empty(trim($sql))) {
                jsonResponse(['status' => 'error', 'message' => 'ملف SQL فارغ أو لم يتم إرسال محتوى لاستعادته'], 400);
            }

            try {
                $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . $dbName . ";charset=utf8mb4";
                $restorePdo = new PDO($dsn, DB_USER, DB_PASS, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::MYSQL_ATTR_MULTI_STATEMENTS => true,
                ]);

                $restorePdo->exec("SET NAMES utf8mb4;");
                $restorePdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
                $restorePdo->exec($sql);
                $restorePdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

                // Log audit
                try {
                    $user = (string)($portalUser['username'] ?? 'admin');
                    $stmtLog = $pdo->prepare("INSERT INTO audit_logs (user_name, user_role, ip_address, action_type, description, entity, entity_id, `timestamp`) VALUES (?, 'admin', ?, 'استعادة قاعدة بيانات MySQL', 'تم استيراد واستعادة قاعدة بيانات MySQL بنجاح', 'backup', 'restore', NOW())");
                    $stmtLog->execute([$user, $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1']);
                } catch (Throwable $e) {}

                $tableCount = (int)$pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '{$dbName}'")->fetchColumn();

                jsonResponse([
                    'status' => 'success',
                    'message' => 'تم استيراد واستعادة قاعدة بيانات MySQL بنجاح وتحديث كافة الجداول!',
                    'tables_count' => $tableCount,
                    'database' => $dbName,
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
            } catch (Throwable $e) {
                jsonResponse([
                    'status' => 'error',
                    'message' => DTMS_ENV === 'production'
                        ? 'Database restore failed. Review the server error log.'
                        : 'Database restore failed: ' . $e->getMessage()
                ], 500);
            }
        }

        if ($action === 'save_to_folder' || ($method === 'POST' && ($action === '' || $action === 'save_to_folder'))) {
            if (DTMS_ENV === 'production' && $configuredBackupsDir === '') {
                jsonResponse(['status' => 'error', 'message' => 'DTMS_BACKUP_DIR must be configured outside the public web root.'], 503);
            }
            $targetFolder = DTMS_ENV === 'production'
                ? $defaultBackupsDir
                : trim($input['target_folder'] ?? $input['folder'] ?? '');
            if (empty($targetFolder)) {
                $targetFolder = $defaultBackupsDir;
            }

            $targetFolder = rtrim($targetFolder, "\\/ ");
            if (!file_exists($targetFolder)) {
                if (!@mkdir($targetFolder, 0750, true)) {
                    jsonResponse([
                        'status' => 'error',
                        'message' => 'تعذر إنشاء المجلد المحدد على السيرفر: ' . $targetFolder . ' (يرجى التأكد من المسار وصلاحيات الكتابة)'
                    ], 400);
                }
            }

            if (!is_writable($targetFolder)) {
                jsonResponse([
                    'status' => 'error',
                    'message' => 'المجلد المحدد غير قابل للكتابة: ' . $targetFolder
                ], 400);
            }
            if (DTMS_ENV === 'production') {
                $resolvedTarget = realpath($targetFolder);
                $resolvedDocumentRoot = realpath((string)($_SERVER['DOCUMENT_ROOT'] ?? ''));
                if ($resolvedTarget === false || ($resolvedDocumentRoot !== false && str_starts_with(
                    strtolower(str_replace('\\', '/', $resolvedTarget)) . '/',
                    rtrim(strtolower(str_replace('\\', '/', $resolvedDocumentRoot)), '/') . '/'
                ))) {
                    jsonResponse(['status' => 'error', 'message' => 'The backup directory must be outside the public web root.'], 422);
                }
            }

            $dump = generateDtmsMySQLDump($pdo, $dbName);
            $customName = basename(trim((string)($input['filename'] ?? '')));
            $filename = $customName ?: ('DTMS_MySQL_' . $dbName . '_' . date('Y-m-d_H-i-s') . '.sql');
            if (!str_ends_with(strtolower($filename), '.sql')) {
                $filename .= '.sql';
            }
            if (!preg_match('/^[A-Za-z0-9._-]+\.sql$/', $filename)) {
                jsonResponse(['status' => 'error', 'message' => 'Backup filename contains unsupported characters.'], 422);
            }

            $fullPath = $targetFolder . DIRECTORY_SEPARATOR . $filename;
            $written = @file_put_contents($fullPath, $dump);

            if ($written === false) {
                jsonResponse([
                    'status' => 'error',
                    'message' => 'فشلت عملية كتابة ملف النسخة الاحتياطية في المجلد المحدد: ' . $fullPath
                ], 500);
            }

            // Log to audit_logs
            try {
                $user = (string)($portalUser['username'] ?? 'admin');
                $stmtLog = $pdo->prepare("INSERT INTO audit_logs (user_name, user_role, ip_address, action_type, description, entity, entity_id, `timestamp`) VALUES (?, 'admin', ?, 'حفظ نسخة احتياطية MySQL', ?, 'backup', ?, NOW())");
                $stmtLog->execute([
                    $user,
                    $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
                    "تم حفظ نسخة قاعدة بيانات MySQL في: {$fullPath} بحجم " . round($written / 1024, 2) . " KB",
                    $filename
                ]);
            } catch (Throwable $e) {}

            $tableCount = (int)$pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '{$dbName}'")->fetchColumn();

            jsonResponse([
                'status' => 'success',
                'message' => 'تم حفظ نسخة قاعدة بيانات MySQL بنجاح في المجلد المحدد!',
                'file_path' => $fullPath,
                'target_folder' => $targetFolder,
                'filename' => $filename,
                'size_bytes' => $written,
                'size_formatted' => round($written / 1024, 2) . ' KB',
                'tables_count' => $tableCount,
                'database' => $dbName,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
        }
        break;

    default:
        jsonResponse(['status' => 'error', 'message' => 'Unknown API Endpoint'], 404);
}
