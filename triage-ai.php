<?php
// Simple backend endpoint for AI triage analysis (Google Gemini).
// Expects JSON in request body and returns: { "priority": "critical|high|medium|low" }

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$apiKey = "AIzaSyAaFa0U8Fx_Pl-8pCyopJFBGkbaOh6AnL8";
if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'Gemini API key not configured']);
    exit;
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON body']);
    exit;
}

// Extract patient fields requested
$age = isset($payload['age']) ? (string)$payload['age'] : '';
$symptoms = isset($payload['symptoms']) ? (string)$payload['symptoms'] : '';
$heartRate = isset($payload['heartRate']) ? (string)$payload['heartRate'] : '';
$bloodPressure = isset($payload['bloodPressure']) ? (string)$payload['bloodPressure'] : '';
$temperature = isset($payload['temperature']) ? (string)$payload['temperature'] : '';

$prompt = "You are an emergency triage assistant.\n\n"
    . "Patient information:\n"
    . "Age: {$age}\n"
    . "Symptoms: {$symptoms}\n"
    . "Heart Rate: {$heartRate}\n"
    . "Blood Pressure: {$bloodPressure}\n"
    . "Temperature: {$temperature}\n\n"
    . "Classify urgency as exactly one word:\n"
    . "critical\n"
    . "high\n"
    . "medium\n"
    . "low";

$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . urlencode($apiKey);

$requestBody = [
    'contents' => [
        [
            'role' => 'user',
            'parts' => [
                ['text' => $prompt]
            ]
        ]
    ],
    // Keep output short and deterministic-ish.
    'generationConfig' => [
        'temperature' => 0.2,
        'maxOutputTokens' => 16
    ]
];
if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL not enabled on server']);
    exit;
}

$ch = curl_init($url);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestBody));

$response = curl_exec($ch);
$curlErr = curl_error($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Request failed', 'details' => $curlErr]);
    exit;
}

if ($status < 200 || $status >= 300) {
    http_response_code(500);
    echo json_encode(['error' => 'Gemini API error', 'status' => $status, 'response' => $response]);
    exit;
}

$json = json_decode($response, true);
$text = '';

// Typical response path: candidates[0].content.parts[0].text
if (isset($json['candidates'][0]['content']['parts'][0]['text'])) {
    $text = (string)$json['candidates'][0]['content']['parts'][0]['text'];
}

$normalized = strtolower(trim($text));

// Extract one of the allowed priorities from the model output.
$priority = 'medium';
foreach (['critical', 'high', 'medium', 'low'] as $p) {
    if (preg_match('/\b' . preg_quote($p, '/') . '\b/i', $normalized)) {
        $priority = $p;
        break;
    }
}

echo json_encode([
    'priority' => $priority,
    'raw' => $text
]);

