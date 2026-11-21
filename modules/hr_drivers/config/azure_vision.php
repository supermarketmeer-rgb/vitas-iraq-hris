<?php

function dtmsSecretEncryptionKey(): string {
    $path = __DIR__ . '/dtms_secret.key';
    if (!is_file($path)) {
        $encoded = base64_encode(random_bytes(32));
        if (file_put_contents($path, $encoded, LOCK_EX) === false) {
            throw new RuntimeException('Unable to create the DTMS encryption key file.');
        }
        @chmod($path, 0600);
    }
    $raw = trim((string)file_get_contents($path));
    $decoded = base64_decode($raw, true);
    if ($decoded === false || strlen($decoded) < 32) {
        throw new RuntimeException('The DTMS encryption key file is invalid.');
    }
    return substr($decoded, 0, 32);
}

function dtmsEncryptSecret(string $plainText): string {
    if ($plainText === '') return '';
    $iv = random_bytes(12);
    $tag = '';
    $cipherText = openssl_encrypt($plainText, 'aes-256-gcm', dtmsSecretEncryptionKey(), OPENSSL_RAW_DATA, $iv, $tag);
    if ($cipherText === false) throw new RuntimeException('Unable to encrypt the Azure Vision key.');
    return 'v1:' . base64_encode($iv . $tag . $cipherText);
}

function dtmsDecryptSecret(?string $encrypted): string {
    if (!$encrypted || !str_starts_with($encrypted, 'v1:')) return '';
    $raw = base64_decode(substr($encrypted, 3), true);
    if ($raw === false || strlen($raw) <= 28) return '';
    $iv = substr($raw, 0, 12);
    $tag = substr($raw, 12, 16);
    $cipherText = substr($raw, 28);
    $plainText = openssl_decrypt($cipherText, 'aes-256-gcm', dtmsSecretEncryptionKey(), OPENSSL_RAW_DATA, $iv, $tag);
    return $plainText === false ? '' : $plainText;
}

function dtmsSystemSetting(PDO $pdo, string $key, string $default = ''): string {
    $stmt = $pdo->prepare('SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1');
    $stmt->execute([$key]);
    $value = $stmt->fetchColumn();
    return $value === false || $value === null ? $default : (string)$value;
}

function dtmsSetSystemSetting(PDO $pdo, string $key, string $value, bool $isSecret = false): void {
    $stmt = $pdo->prepare('INSERT INTO system_settings (setting_key, setting_value, is_secret) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), is_secret = VALUES(is_secret)');
    $stmt->execute([$key, $value, $isSecret ? 1 : 0]);
}

function dtmsAzureVisionConfig(PDO $pdo): array {
    $endpoint = dtmsSystemSetting($pdo, 'azure_vision.endpoint', (string)(getenv('DTMS_AZURE_VISION_ENDPOINT') ?: 'https://vitasiraq-dtms-vision.cognitiveservices.azure.com/'));
    $encryptedKey = dtmsSystemSetting($pdo, 'azure_vision.key', '');
    $key = $encryptedKey !== '' ? dtmsDecryptSecret($encryptedKey) : trim((string)(getenv('DTMS_AZURE_VISION_KEY') ?: ''));
    return [
        'endpoint' => rtrim(trim($endpoint), '/'),
        'region' => dtmsSystemSetting($pdo, 'azure_vision.region', 'eastus'),
        'key' => trim($key),
        'api_version' => dtmsSystemSetting($pdo, 'azure_vision.api_version', '2024-02-01'),
    ];
}
